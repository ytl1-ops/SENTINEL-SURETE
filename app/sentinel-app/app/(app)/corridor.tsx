import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getLiveFeed, isDemoMode, type Article } from '../../lib/sentinel-api';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { ZONES_GEO, CORRIDORS_PAR_ZONE, SCOPES_FENETRE, type ZoneKey } from '../../constants/corridors';
import { DEMO_ARTICLES } from './feed';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const CATEGORIES = [
  { key: 'all', label: 'Tout' },
  { key: 'security', label: 'Sécurité' },
  { key: 'food', label: 'Alimentaire' },
  { key: 'economy', label: 'Économie' },
  { key: 'politics', label: 'Politique' },
  { key: 'health', label: 'Santé' },
  { key: 'environment', label: 'Environnement' },
];

const CATEGORY_DOT: Record<string, string> = {
  security: Colors.danger,
  food: Colors.warning,
  economy: Colors.success,
  politics: Colors.primary,
  health: '#8B5CF6',
  environment: '#059669',
};

const ZONE_LIST = Object.keys(ZONES_GEO) as ZoneKey[];

export default function CorridorScreen() {
  const { canViewMap, isAdmin } = useAuth();
  const router = useRouter();

  const [zone, setZone] = useState<ZoneKey>('sahel');
  const [corridorId, setCorridorId] = useState(CORRIDORS_PAR_ZONE.sahel[0].id);
  const [scope, setScope] = useState<typeof SCOPES_FENETRE[number]['key']>('72h');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDemo, setIsDemo] = useState(isDemoMode());

  const corridors = CORRIDORS_PAR_ZONE[zone];
  const corridor = corridors.find(c => c.id === corridorId) ?? corridors[0];

  useEffect(() => {
    if (!corridors.some(c => c.id === corridorId)) setCorridorId(corridors[0].id);
  }, [zone]);

  useEffect(() => { loadData(); }, [category]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getLiveFeed({ page: 1, limit: 100, category: category === 'all' ? undefined : category });
      setArticles(res.articles);
      setIsDemo(false);
    } catch {
      setArticles(DEMO_ARTICLES);
      setIsDemo(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [category]);

  const heuresFenetre = SCOPES_FENETRE.find(s => s.key === scope)!.heures;
  const paysCorridor = useMemo(() => new Set(corridor.villes.map(v => v.pays)), [corridor]);

  const evenements = useMemo(() => {
    const seuil = Date.now() - heuresFenetre * 3600000;
    return articles.filter(a =>
      paysCorridor.has(a.country) &&
      new Date(a.published_at).getTime() >= seuil &&
      (!search || a.title.toLowerCase().includes(search.toLowerCase()))
    );
  }, [articles, paysCorridor, heuresFenetre, search]);

  const comptesParVille = useMemo(
    () => corridor.villes.map(v => evenements.filter(e => e.country === v.pays).length),
    [corridor, evenements]
  );

  if (!canViewMap && !isAdmin) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Ionicons name="navigate-outline" size={48} color={Colors.textMuted} />
        <Text style={s.upgradeTitle}>Corridors non inclus</Text>
        <Text style={s.upgradeSub}>Les corridors de référence sont disponibles à partir du plan Mensuel.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={s.headerTitleRow}>
            <Text style={s.headerTitle}>CORRIDOR DE RÉFÉRENCE</Text>
            {isDemo && (
              <View style={s.demoDot}>
                <Text style={s.demoText}>Démo</Text>
              </View>
            )}
          </View>
          <Text style={s.headerSub} numberOfLines={1}>{corridor.villes.map(v => v.nom).join(' → ')}</Text>
        </View>
      </View>

      {/* Zone */}
      <FlatList
        data={ZONE_LIST}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingTop: 8 }}
        keyExtractor={z => z}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.zoneChip, zone === item && s.zoneChipActive]}
            onPress={() => setZone(item)}
          >
            <Text style={[s.zoneText, zone === item && s.zoneTextActive]}>{ZONES_GEO[item].nom}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Corridor dans la zone */}
      <FlatList
        data={corridors}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: 6 }}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.corridorChip, corridor.id === item.id && s.corridorChipActive]}
            onPress={() => setCorridorId(item.id)}
          >
            <Ionicons name="trail-sign-outline" size={12} color={corridor.id === item.id ? Colors.primary : Colors.textSecond} />
            <Text style={[s.corridorText, corridor.id === item.id && s.corridorTextActive]} numberOfLines={1}>{item.nom}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Stepper des villes-étapes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stepperRow}>
        {corridor.villes.map((v, i) => (
          <View key={v.nom + i} style={s.stepItem}>
            <View style={s.stepNodeWrap}>
              <View style={[s.stepNode, comptesParVille[i] > 0 && s.stepNodeActive]}>
                <Text style={[s.stepNodeTxt, comptesParVille[i] > 0 && s.stepNodeTxtActive]}>{comptesParVille[i]}</Text>
              </View>
              {i < corridor.villes.length - 1 && <View style={s.stepLine} />}
            </View>
            <Text style={s.stepCity} numberOfLines={1}>{v.nom}</Text>
            <Text style={s.stepCountry}>{v.pays}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Fenêtre temporelle */}
      <View style={s.scopeRow}>
        {SCOPES_FENETRE.map(sc => (
          <TouchableOpacity
            key={sc.key}
            style={[s.scopeChip, scope === sc.key && s.scopeChipActive]}
            onPress={() => setScope(sc.key)}
          >
            <Text style={[s.scopeText, scope === sc.key && s.scopeTextActive]}>{sc.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recherche */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher sur ce corridor..."
          placeholderTextColor={Colors.textMuted}
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={Colors.textMuted} /></TouchableOpacity> : null}
      </View>

      {/* Catégories */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingVertical: 6 }}
        keyExtractor={i => i.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.catChip, category === item.key && s.catChipActive]}
            onPress={() => setCategory(item.key)}
          >
            <Text style={[s.catText, category === item.key && s.catTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} size="large" />
      ) : evenements.length === 0 ? (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />} contentContainerStyle={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={36} color={Colors.textMuted} />
          <Text style={s.emptyTxt}>AUCUN FAIT DANS CETTE FENÊTRE</Text>
          <Text style={s.emptySub}>Aucun événement sur ce corridor pour la fenêtre et les filtres sélectionnés.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={evenements}
          keyExtractor={a => a.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: article }) => (
            <TouchableOpacity
              style={s.articleCard}
              onPress={() => router.push({ pathname: '/(app)/article', params: { id: article.id } })}
            >
              <View style={s.articleLeft}>
                <View style={[s.categoryDot, { backgroundColor: CATEGORY_DOT[article.category] || Colors.primary }]} />
              </View>
              <View style={s.articleBody}>
                <Text style={s.articleTitle} numberOfLines={2}>{article.title}</Text>
                <View style={s.articleMeta}>
                  <Text style={s.articleSrc}>{article.source}</Text>
                  <Text style={s.articlePays}>{article.country}</Text>
                  <Text style={s.articleTime}>{format(new Date(article.published_at), 'dd/MM HH:mm', { locale: fr })}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { backgroundColor: Colors.dark, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  demoDot: { backgroundColor: 'rgba(245,158,11,0.18)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  demoText: { fontSize: 10, color: '#f59e0b', fontWeight: '700', letterSpacing: 0.5 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  zoneChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 6 },
  zoneChipActive: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  zoneText: { fontSize: 11, color: Colors.textSecond },
  zoneTextActive: { color: '#fff', fontWeight: '600' },

  corridorChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 6, maxWidth: 220 },
  corridorChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  corridorText: { fontSize: 11, color: Colors.textSecond },
  corridorTextActive: { color: Colors.primary, fontWeight: '600' },

  stepperRow: { paddingHorizontal: Spacing.lg, paddingVertical: 14, alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', width: 78 },
  stepNodeWrap: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepNode: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  stepNodeActive: { borderColor: Colors.danger, backgroundColor: Colors.dangerBg },
  stepNodeTxt: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  stepNodeTxtActive: { color: Colors.danger },
  stepLine: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: -2 },
  stepCity: { fontSize: 10, fontWeight: '600', color: Colors.text, marginTop: 6, textAlign: 'center' },
  stepCountry: { fontSize: 9, color: Colors.textMuted },

  scopeRow: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: 4 },
  scopeChip: { flex: 1, paddingVertical: 6, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.white, alignItems: 'center' },
  scopeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scopeText: { fontSize: 11, color: Colors.textSecond },
  scopeTextActive: { color: '#fff', fontWeight: '600' },

  searchRow: { flexDirection: 'row', alignItems: 'center', margin: Spacing.sm, backgroundColor: Colors.white, borderWidth: 0.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 7 },
  searchInput: { flex: 1, fontSize: 13, color: Colors.text },

  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 0.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 6 },
  catChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  catText: { fontSize: 11, color: Colors.textSecond },
  catTextActive: { color: Colors.primary, fontWeight: '500' },

  empty: { alignItems: 'center', padding: 40, flexGrow: 1 },
  emptyTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecond, marginTop: 10, textAlign: 'center', letterSpacing: 0.5 },
  emptySub: { fontSize: 12, color: Colors.textMuted, marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },

  articleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  articleLeft: { paddingTop: 5 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  articleBody: { flex: 1 },
  articleTitle: { fontSize: 13, fontWeight: '500', color: Colors.text, lineHeight: 18, marginBottom: 5 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  articleSrc: { fontSize: 10, color: Colors.textMuted },
  articlePays: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  articleTime: { fontSize: 10, color: Colors.textMuted, marginLeft: 'auto' },

  upgradeTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 12, textAlign: 'center' },
  upgradeSub: { fontSize: 13, color: Colors.textSecond, textAlign: 'center', marginTop: 6 },
});
