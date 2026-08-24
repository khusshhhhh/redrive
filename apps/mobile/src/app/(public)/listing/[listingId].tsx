import type { PublicListing } from "@redrive/contracts/mobile";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { Notice, PrimaryButton } from "@/components/form-controls";
import { useSession } from "@/providers/session-provider";
import { apiRequest } from "@/services/api/client";
import { colors, radii, spacing } from "@/theme/tokens";

type Detail = PublicListing & { information: string | null; owner: { name: string; verified: boolean }; reviewSummary: { count: number; average: number | null } };

export default function ListingDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const { status } = useSession();
  const router = useRouter();
  const query = useQuery({ queryKey: ["listing", listingId], queryFn: () => apiRequest<Detail>(`/listings/${listingId}`, { authenticated: status === "authenticated" }), enabled: Boolean(listingId) });
  if (query.isPending) return <ActivityIndicator style={styles.fill} color={colors.primary} size="large" />;
  if (query.isError || !query.data) return <View style={styles.state}><Notice>This vehicle could not be loaded.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></View>;
  const listing = query.data;
  return <ScrollView style={styles.fill} contentContainerStyle={styles.content}><Image source={listing.imageUrls[0]} alt={listing.title} style={styles.hero} contentFit="cover" /><Text style={styles.title}>{listing.title}</Text><Text style={styles.meta}>{listing.approximateLocation.suburb}, {listing.approximateLocation.state} · {listing.category}</Text><Text style={styles.price}>${(listing.price.amountCents / 100).toFixed(0)} AUD per day</Text><Text style={styles.copy}>{listing.description}</Text><View style={styles.panel}><Text style={styles.panelTitle}>Hosted by {listing.owner.name}</Text><Text style={styles.meta}>{listing.owner.verified ? "Verified owner · " : ""}{listing.reviewSummary.count ? `${listing.reviewSummary.average} from ${listing.reviewSummary.count} reviews` : "No reviews yet"}</Text></View>{status === "authenticated" ? <Notice tone="info">Booking dates and quotes are ready in the API and will be connected in the booking feature slice.</Notice> : <PrimaryButton title="Sign in to save or book" onPress={() => router.push({ pathname: "/(auth)/login", params: { returnTo: `/(public)/listing/${listing.id}` } })} />}</ScrollView>;
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, gap: spacing.md }, hero: { width: "100%", height: 260, borderRadius: radii.lg, backgroundColor: colors.border }, title: { color: colors.ink, fontSize: 28, fontWeight: "800" }, meta: { color: colors.muted, lineHeight: 21 }, price: { color: colors.primary, fontSize: 20, fontWeight: "800" }, copy: { color: colors.ink, fontSize: 16, lineHeight: 24 }, panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }, panelTitle: { color: colors.ink, fontWeight: "800" }, state: { flex: 1, padding: spacing.lg, justifyContent: "center", gap: spacing.md, backgroundColor: colors.background } });
