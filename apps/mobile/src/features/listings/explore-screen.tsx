import type { PublicListing } from "@redrive/contracts/mobile";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Notice, PrimaryButton } from "@/components/form-controls";
import { useCursorList } from "@/services/api/paginated";
import { colors, radii, spacing } from "@/theme/tokens";

export function ExploreScreen() {
  const { query, items, loadMore } = useCursorList<PublicListing>({
    queryKey: ["listings", "explore"],
    path: "/listings",
    authenticated: false,
  });

  return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.header}><Text style={styles.eyebrow}>REDRIVE</Text><Text style={styles.title}>Find your next vehicle</Text><Text style={styles.subtitle}>Cars, utes, caravans, boats and more from Australian owners.</Text></View>{query.isPending ? <ActivityIndicator style={styles.loader} color={colors.primary} size="large" /> : query.isError ? <View style={styles.state}><Notice>Vehicles could not be loaded. Check your connection and try again.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></View> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onEndReached={loadMore} onEndReachedThreshold={0.5} refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.primary} />} ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null} renderItem={({ item }) => <Link href={{ pathname: "/(public)/listing/[listingId]", params: { listingId: item.id } }} asChild><Pressable style={styles.card}><Image source={item.imageUrls[0]} alt={item.title} style={styles.image} contentFit="cover" transition={150} /><View style={styles.cardBody}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{item.approximateLocation.suburb}, {item.approximateLocation.state} · {item.category}</Text><Text style={styles.price}>${(item.price.amountCents / 100).toFixed(0)} AUD/day</Text></View></Pressable></Link>} ListEmptyComponent={<Text style={styles.empty}>No vehicles match this environment yet.</Text>} />}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.xs }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "900", letterSpacing: 2 }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" }, subtitle: { color: colors.muted, lineHeight: 21 }, loader: { flex: 1 }, list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }, footer: { paddingVertical: spacing.md }, card: { backgroundColor: colors.surface, borderRadius: radii.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }, image: { height: 190, width: "100%", backgroundColor: colors.border }, cardBody: { padding: spacing.md, gap: spacing.xs }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" }, meta: { color: colors.muted }, price: { color: colors.primary, fontSize: 16, fontWeight: "800", marginTop: spacing.xs }, state: { padding: spacing.lg, gap: spacing.md }, empty: { color: colors.muted, textAlign: "center", padding: spacing.xl } });
