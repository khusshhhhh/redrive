import type { PublicListing } from "@redrive/contracts/mobile";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Notice, PrimaryButton } from "@/components/form-controls";
import { useCursorList } from "@/services/api/paginated";
import { colors, radii, spacing } from "@/theme/tokens";

export default function FavouritesScreen() {
  const { query, items, loadMore } = useCursorList<PublicListing>({ queryKey: ["favourites"], path: "/favourites" });
  return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.header}><Text style={styles.title}>Favourites</Text><Text style={styles.detail}>Vehicles you have saved for later.</Text></View>{query.isPending ? <ActivityIndicator style={styles.loader} color={colors.primary} size="large" /> : query.isError ? <View style={styles.state}><Notice>Favourites could not be loaded.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></View> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onEndReached={loadMore} onEndReachedThreshold={0.5} refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={colors.primary} />} ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null} renderItem={({ item }) => <Link href={{ pathname: "/(public)/listing/[listingId]", params: { listingId: item.id } }} asChild><Pressable style={styles.card}><Image source={item.imageUrls[0]} alt={item.title} style={styles.image} contentFit="cover" /><View style={styles.cardBody}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{item.approximateLocation.suburb}, {item.approximateLocation.state}</Text><Text style={styles.price}>${(item.price.amountCents / 100).toFixed(0)} AUD/day</Text></View></Pressable></Link>} ListEmptyComponent={<Text style={styles.empty}>You have not saved any vehicles yet.</Text>} />}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" }, detail: { color: colors.muted }, loader: { flex: 1 }, footer: { paddingVertical: spacing.md }, state: { padding: spacing.lg, gap: spacing.md }, list: { padding: spacing.lg, gap: spacing.md }, card: { flexDirection: "row", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: "hidden" }, image: { width: 112, minHeight: 112, backgroundColor: colors.border }, cardBody: { flex: 1, padding: spacing.md, gap: spacing.xs }, cardTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, meta: { color: colors.muted }, price: { color: colors.primary, fontWeight: "800" }, empty: { color: colors.muted, textAlign: "center", padding: spacing.xl } });
