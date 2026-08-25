import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { apiRequest } from "@/services/api/client";
import { colors, radii, spacing } from "@/theme/tokens";

type Reservation = { id: string; role: string; status: string; paymentStatus: string; startDate: string; endDate: string; pricing: { totalCents: number; currency: string }; listing: { title: string; approximateLocation: { suburb: string; state: string }; exactLocation: { address: string } | null } };
const day = (value: string) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));

export default function ReservationDetailScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const query = useQuery({ queryKey: ["reservation", reservationId], enabled: Boolean(reservationId), queryFn: () => apiRequest<Reservation>(`/reservations/${reservationId}`) });
  if (query.isPending) return <Screen><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  if (query.isError || !query.data) return <Screen><Notice>Trip details could not be loaded.</Notice><PrimaryButton title="Try again" onPress={() => void query.refetch()} /></Screen>;
  const trip = query.data;
  return <Screen><Heading detail={`${trip.role === "owner" ? "Hosting" : "Travelling"} · ${trip.status}`}>{trip.listing.title}</Heading><View style={styles.card}><Text style={styles.label}>Dates</Text><Text style={styles.value}>{day(trip.startDate)} – {day(trip.endDate)}</Text><Text style={styles.label}>Location</Text><Text style={styles.value}>{trip.listing.exactLocation?.address || `${trip.listing.approximateLocation.suburb}, ${trip.listing.approximateLocation.state}`}</Text><Text style={styles.label}>Total</Text><Text style={styles.total}>${(trip.pricing.totalCents / 100).toFixed(2)} {trip.pricing.currency}</Text><Text style={styles.label}>Payment</Text><Text style={styles.value}>{trip.paymentStatus}</Text></View></Screen>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm }, label: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase", marginTop: spacing.sm }, value: { color: colors.ink, fontSize: 16 }, total: { color: colors.primary, fontSize: 20, fontWeight: "900" } });
