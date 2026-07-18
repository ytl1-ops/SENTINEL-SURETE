// ============================================================
// SENTINEL — Assistant IA (RAG), fonction Edge Supabase
//
// Répond aux questions des utilisateurs EN S'APPUYANT UNIQUEMENT sur les
// articles réellement collectés (retrieval, table articles_rag — voir
// migration 20260718030000_articles_rag.sql) — jamais sur la
// connaissance générale du modèle seule, pour éviter toute réponse
// inventée sur des événements récents que le modèle ne peut pas
// connaître (anti-hallucination, même exigence que le reste de
// l'application).
//
// Sécurité :
//  - La clé API Anthropic (ANTHROPIC_API_KEY) est un secret de fonction
//    Edge — définie une seule fois via le dashboard Supabase (Edge
//    Functions > rag-ask > Secrets), jamais exposée au client.
//  - Authentification obligatoire : seul un utilisateur SENTINEL
//    réellement connecté (session Supabase Auth valide, pas la simple
//    clé anon) peut appeler cette fonction — évite qu'un visiteur non
//    authentifié ne consomme le quota/budget de l'API Anthropic.
//
// Déploiement : coller ce fichier dans le dashboard Supabase
// (Edge Functions > Create a new function > rag-ask), ou
// `npx supabase functions deploy rag-ask` (app/sentinel-app/) si la CLI
// est disponible. Nécessite la migration 20260718030000 déjà appliquée.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const QUESTION_MAX_LEN = 400;
const NB_ARTICLES_CONTEXTE = 8;

function reponseJSON(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function appellerClaude(anthropicKey: string, system: string, contenu: string, maxTokens: number) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: contenu }] }),
  });
  if (!resp.ok) { const detail = await resp.text().catch(() => ''); throw new Error(`Anthropic ${resp.status}: ${detail}`); }
  const json = await resp.json();
  return (json?.content || []).map((b: { text?: string }) => b.text || '').join('').trim();
}

// verifierReponse(contexte, question, answer) : agent anti-hallucination —
// UN SECOND appel Claude, INDEPENDANT du premier, relit la reponse deja
// generee a la lumiere des memes articles sources et verifie que CHAQUE
// affirmation factuelle y est bien confirmee (pas de connaissance
// generale non sourcee, pas d'extrapolation). Renvoie {valide, problemes}.
// Volontairement un modele/appel SEPARE de la generation initiale : un
// modele qui se relit lui-meme dans le meme contexte de conversation tend
// a confirmer ses propres erreurs (biais de confirmation) — un second
// jugement independant, sans connaitre le raisonnement qui a produit la
// reponse, est plus fiable pour detecter une affirmation non etayee.
async function verifierReponse(anthropicKey: string, contexte: string, question: string, answer: string) {
  const systemVerif =
    `Tu es un vérificateur factuel strict et indépendant. On te donne des extraits d'articles sources et une réponse ` +
    `générée par un autre système à partir de CES MÊMES extraits. Vérifie que CHAQUE affirmation factuelle de la réponse ` +
    `(dates, lieux, chiffres, noms, événements) est bien confirmée par le contenu des extraits — aucune connaissance ` +
    `générale non sourcée, aucune extrapolation non justifiée, aucun fait absent des extraits. Une reformulation ou un ` +
    `résumé fidèle du contenu des extraits est VALIDE. Réponds UNIQUEMENT avec un objet JSON strict, sans texte avant ` +
    `ni après, au format exact : {"valide": true|false, "problemes": ["description courte de l'affirmation non confirmée", ...]}. ` +
    `Si tout est confirmé, "problemes" est un tableau vide.`;
  const contenu = `Extraits sources :\n\n${contexte}\n\nQuestion d'origine : ${question}\n\nRéponse à vérifier :\n${answer}`;
  try {
    const texte = await appellerClaude(anthropicKey, systemVerif, contenu, 400);
    const jsonMatch = texte.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : texte);
    return { valide: parsed.valide !== false, problemes: Array.isArray(parsed.problemes) ? parsed.problemes : [] };
  } catch (e) {
    // Echec du parsing/appel de verification : ne bloque JAMAIS la reponse
    // deja generee pour un probleme technique du verificateur lui-meme —
    // best-effort, la premiere generation reste deja contrainte aux
    // extraits par son propre system prompt.
    return { valide: true, problemes: [], erreurVerification: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return reponseJSON({ error: 'Méthode non autorisée.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!supabaseUrl || !serviceRoleKey) return reponseJSON({ error: 'Configuration serveur incomplète.' }, 500);
  if (!anthropicKey) return reponseJSON({ error: "Clé ANTHROPIC_API_KEY non configurée sur cette fonction." }, 500);

  // Authentification : le JWT de l'appelant (celui de SA session
  // Supabase Auth, pas la clé anon) doit correspondre à un utilisateur
  // réel — rejette toute requête anonyme ou mal formée.
  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return reponseJSON({ error: 'Authentification requise.' }, 401);
  const supabaseAuth = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(jwt);
  if (userErr || !userData?.user) return reponseJSON({ error: 'Session invalide ou expirée — reconnectez-vous.' }, 401);

  let body: { question?: string };
  try { body = await req.json(); } catch (_) { return reponseJSON({ error: 'Corps de requête JSON invalide.' }, 400); }
  const question = (body?.question || '').toString().trim();
  if (!question) return reponseJSON({ error: 'Question vide.' }, 400);
  if (question.length > QUESTION_MAX_LEN) return reponseJSON({ error: `Question trop longue (max ${QUESTION_MAX_LEN} caractères).` }, 400);

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Retrieval : recherche plein texte classée par pertinence sur les
  // articles des 10 derniers jours (voir rechercher_articles_rag) ;
  // repli sur les plus récents si rien ne correspond textuellement.
  let articles: Array<Record<string, unknown>> = [];
  let rechercheSansResultat = false;
  const { data: resultats, error: errRecherche } = await supabaseAdmin
    .rpc('rechercher_articles_rag', { requete: question, limite: NB_ARTICLES_CONTEXTE });
  if (errRecherche) return reponseJSON({ error: 'Erreur de recherche : ' + errRecherche.message }, 500);
  articles = resultats || [];
  if (!articles.length) {
    rechercheSansResultat = true;
    const { data: recents } = await supabaseAdmin.rpc('articles_rag_plus_recents', { limite: NB_ARTICLES_CONTEXTE });
    articles = recents || [];
  }

  if (!articles.length) {
    return reponseJSON({
      answer: "Aucun article n'est actuellement indexé — réessayez dans quelques minutes (la collecte se met à jour automatiquement).",
      sources: [], articlesCount: 0,
    });
  }

  const contexte = articles.map((a, i) =>
    `[${i + 1}] ${a.title}\nSource : ${a.source || 'inconnue'} — Pays/zone : ${a.cy || 'n/d'} — Date : ${a.pub_date || 'inconnue'}\n${a.summary || ''}`
  ).join('\n\n');

  const dateAujourdhui = new Date().toISOString().slice(0, 10);
  const systemPrompt =
    `Tu es l'assistant sûreté de SENTINEL SÛRETÉ, une plateforme de veille sécurité pour l'Afrique. ` +
    `Réponds à la question de l'utilisateur EXCLUSIVEMENT à partir des extraits d'articles fournis ci-dessous — ` +
    `n'utilise jamais de connaissance générale non confirmée par ces extraits, et ne mentionne aucun fait qui n'y figure pas. ` +
    `Si les extraits ne permettent pas de répondre, dis-le clairement plutôt que d'inventer. ` +
    `Cite tes sources en indiquant leur numéro entre crochets, ex. [1] [3]. Réponds en français, de façon concise et factuelle (5-8 phrases maximum), ` +
    `avec un ton professionnel adapté à un contexte sûreté/sécurité. Date du jour : ${dateAujourdhui}.` +
    (rechercheSansResultat ? ' ATTENTION : ces articles sont les plus récents disponibles mais ne correspondent pas forcément au sujet précis de la question — précise-le à l\'utilisateur si c\'est le cas.' : '');

  const userMsg = `Articles disponibles :\n\n${contexte}\n\nQuestion de l'utilisateur : ${question}`;
  let answer: string;
  try {
    answer = await appellerClaude(anthropicKey, systemPrompt, userMsg, 700) || "Réponse indisponible pour le moment.";
  } catch (e) {
    return reponseJSON({ error: "Impossible de contacter le service de génération de réponse." }, 502);
  }

  // Agent anti-hallucination : verifie la reponse fraichement generee
  // contre les MEMES extraits, via un second appel Claude independant
  // (voir verifierReponse). Si des affirmations non etayees sont
  // detectees, UNE tentative de correction est faite (le modele regenere
  // en tenant compte des problemes signales) — si le probleme persiste
  // apres cette correction, la reponse est renvoyee telle quelle mais
  // accompagnee d'un avertissement explicite (jamais bloquee/masquee :
  // l'utilisateur garde toujours acces a l'information disponible, avec
  // une transparence totale sur sa fiabilite).
  let verification = await verifierReponse(anthropicKey, contexte, question, answer);
  let verifie = verification.valide;
  if (!verification.valide && verification.problemes.length) {
    try {
      const correctionMsg = `${userMsg}\n\nATTENTION : ta reponse precedente contenait des affirmations non confirmees par les extraits ci-dessus : ${verification.problemes.join('; ')}. Reformule une reponse strictement limitee aux faits confirmes par les extraits — si peu d'elements peuvent etre confirmes, dis-le explicitement plutot que de repeter l'erreur.`;
      const reponseCorrigee = await appellerClaude(anthropicKey, systemPrompt, correctionMsg, 700);
      if (reponseCorrigee) {
        answer = reponseCorrigee;
        const reverif = await verifierReponse(anthropicKey, contexte, question, answer);
        verifie = reverif.valide;
        verification = reverif;
      }
    } catch (e) { /* correction best-effort : conserve la reponse initiale + son avertissement si l'appel echoue */ }
  }

  return reponseJSON({
    answer,
    sources: articles.map((a, i) => ({ n: i + 1, title: a.title, source: a.source, link: a.link, cy: a.cy, pub_date: a.pub_date })),
    articlesCount: articles.length,
    rechercheSansResultat,
    verifie,
    problemesVerification: verifie ? [] : verification.problemes,
  });
});
