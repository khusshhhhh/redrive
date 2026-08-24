import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Notice, PrimaryButton } from "@/components/form-controls";
import { apiRequest } from "@/services/api/client";
import { colors, radii, spacing } from "@/theme/tokens";

type Trip = { id: string; role: "renter" | "owner"; status: string; startDate: string; endDate: string; pricing: { totalCents: number; currency: string }; listing: { title: string; approximateLocation: { suburb: string; state: string } } };
type TripPage = { data: Trip[]; page: { nextCursor: string | null; hasMore: boolean } };
const day = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function TripsScreen() {
  const query = useQuery({ queryKey: ["reservations"], queryFn: () => apiRequest<TripPage>("/reservations") });
  return <SafeAreaView style={styles.safe} edges={["top"]}><View style={styles.header}><Text style={styles.title}>Trips</Text><Text style={styles.detail}>Booking requests and confirmed journeys.</Text></View>{query.isPending ? <ActivityIndicator style={styles.loader} color={colors.primary} size="large" /> : query.isError ? <View style={styles.state}><Notice>Trips could not be loaded.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></View> : <FlatList data={query.data?.data || []} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Link href={{ pathname: "/(app)/reservation/[reservationId]", params: { reservationId: item.id } }} asChild><Pressable style={styles.card}><View style={styles.row}><Text style={styles.cardTitle}>{item.listing.title}</Text><Text style={styles.status}>{item.status}</Text></View><Text style={styles.meta}>{day(item.startDate)} – {day(item.endDate)}</Text><Text style={styles.meta}>{item.listing.approximateLocation.suburb}, {item.listing.approximateLocation.state} · {item.role === "owner" ? "Hosting" : "Travelling"}</Text><Text style={styles.price}>${(item.pricing.totalCents / 100).toFixed(2)} {item.pricing.currency}</Text></Pressable></Link>} ListEmptyComponent={<Text style={styles.empty}>No trips yet.</Text>} />}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs }, title: { color: colors.ink, fontSize: 30, fontWeight: "800" }, detail: { color: colors.muted }, loader: { flex: 1 }, state: { padding: spacing.lg, gap: spacing.md }, list: { padding: spacing.lg, gap: spacing.md }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm }, row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }, cardTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: "800" }, status: { color: colors.primary, fontSize: 12, fontWeight: "900" }, meta: { color: colors.muted }, price: { color: colors.ink, fontWeight: "800" }, empty: { color: colors.muted, textAlign: "center", padding: spacing.xl } });
