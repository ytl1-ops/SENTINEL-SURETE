import AsyncStorage from '@react-native-async-storage/async-storage';

// Reconnexion quotidienne obligatoire (demande explicite) : une session
// Supabase restaurée silencieusement (token de rafraîchissement persistant,
// voir lib/supabase.ts) un autre jour calendaire que la dernière connexion
// réelle est invalidée par useAuth — l'utilisateur doit ressaisir son mot de
// passe à la première ouverture de l'app chaque jour, sur chaque appareil.

const LAST_LOGIN_DATE_KEY = 'sentinel_last_login_date';

function todayKey(): string {
  return new Date().toDateString();
}

export async function wasLoggedInToday(): Promise<boolean> {
  const saved = await AsyncStorage.getItem(LAST_LOGIN_DATE_KEY);
  return saved === todayKey();
}

export async function markLoggedInToday(): Promise<void> {
  await AsyncStorage.setItem(LAST_LOGIN_DATE_KEY, todayKey());
}

export async function clearLoginDate(): Promise<void> {
  await AsyncStorage.removeItem(LAST_LOGIN_DATE_KEY);
}
