import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Field, Heading, Notice, PrimaryButton } from "@/components/form-controls";
import { Screen } from "@/components/screen";
import { apiRequest, newIdempotencyKey } from "@/services/api/client";
import { ApiError } from "@/services/api/errors";
import { colors, radii, spacing } from "@/theme/tokens";

type InsuranceType = "No Insurance" | "Risk Taker" | "Happy Driver";
type Quote = { days: number; dailyRateCents: number; basePriceCents: number; redriveFeeCents: number; serviceFeeCents: number; insuranceType: InsuranceType; insuranceFeeCents: number; cleaningFeeCents: number; totalCents: number; currency: "AUD"; cancellationPolicy: { name?: string; description?: string }; expiresAt: string };
type Reservation = { id: string };

const insuranceOptions: InsuranceType[] = ["No Insurance", "Risk Taker", "Happy Driver"];
const money = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

function localDateToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function BookingRequestScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [insuranceType, setInsuranceType] = useState<InsuranceType>("No Insurance");
  const [message, setMessage] = useState("");
  const [quote, setQuote] = useState<Quote>();
  const [error, setError] = useState<string>();
  const requestKey = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const dates = useMemo(() => ({ startDate: localDateToIso(startDate), endDate: localDateToIso(endDate) }), [startDate, endDate]);

  const quoteMutation = useMutation({
    mutationFn: () => apiRequest<Quote>("/reservations/quote", { method: "POST", body: { listingId, startDate: dates.startDate, endDate: dates.endDate, insuranceType } }),
    onSuccess: (result) => { setQuote(result); setError(undefined); requestKey.current = undefined; },
    onError: (caught) => { setQuote(undefined); setError(caught instanceof ApiError ? caught.message : "A quote could not be prepared."); },
  });
  const bookingMutation = useMutation({
    mutationFn: () => {
      const body = { listingId, startDate: dates.startDate, endDate: dates.endDate, insuranceType, message: message.trim() };
      const fingerprint = JSON.stringify(body);
      if (!requestKey.current || requestKey.current.fingerprint !== fingerprint) requestKey.current = { fingerprint, key: newIdempotencyKey("reservation") };
      return apiRequest<Reservation>("/reservations", { method: "POST", body, idempotencyKey: requestKey.current.key });
    },
    onSuccess: async (result) => { requestKey.current = undefined; await queryClient.invalidateQueries({ queryKey: ["reservations"] }); router.replace({ pathname: "/(app)/reservation/[reservationId]", params: { reservationId: result.id } }); },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "The booking request could not be submitted."),
  });

  const validDates = Boolean(dates.startDate && dates.endDate);
  const quoteExpired = quote ? new Date(quote.expiresAt).getTime() <= Date.now() : false;
  return <Screen><Heading detail="Choose dates, review a server-issued price, then submit one confirmed request. No payment is taken at this step.">Request this vehicle</Heading>{error ? <Notice>{error}</Notice> : null}<View style={styles.card}><Text style={styles.cardTitle}>Trip dates</Text><Field label="Pickup date (YYYY-MM-DD)" value={startDate} onChangeText={(value) => { setStartDate(value); setQuote(undefined); }} keyboardType="numbers-and-punctuation" maxLength={10} /><Field label="Return date (YYYY-MM-DD)" value={endDate} onChangeText={(value) => { setEndDate(value); setQuote(undefined); }} keyboardType="numbers-and-punctuation" maxLength={10} /><Text style={styles.label}>Protection selection</Text><View style={styles.options}>{insuranceOptions.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: insuranceType === option }} onPress={() => { setInsuranceType(option); setQuote(undefined); }} style={({ pressed }) => [styles.option, insuranceType === option && styles.optionSelected, pressed && styles.pressed]}><Text style={[styles.optionText, insuranceType === option && styles.optionTextSelected]}>{option}</Text></Pressable>)}</View><PrimaryButton title="Check availability and price" loading={quoteMutation.isPending} disabled={!validDates} onPress={() => { setError(undefined); quoteMutation.mutate(); }} /></View>{quote ? <View style={styles.quote}><View style={styles.quoteHeading}><View><Text style={styles.cardTitle}>Your estimate</Text><Text style={styles.copy}>{quote.days} day{quote.days === 1 ? "" : "s"} · valid until {new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date(quote.expiresAt))}</Text></View><Text style={styles.total}>{money(quote.totalCents)}</Text></View>{[["Daily rate", quote.dailyRateCents], ["Vehicle subtotal", quote.basePriceCents], ["Redrive fee", quote.redriveFeeCents], ["Service fee", quote.serviceFeeCents], [quote.insuranceType, quote.insuranceFeeCents], ["Cleaning", quote.cleaningFeeCents]].map(([label, cents]) => <View key={String(label)} style={styles.priceRow}><Text style={styles.copy}>{label}</Text><Text style={styles.priceValue}>{money(Number(cents))}</Text></View>)}<View style={styles.divider} /><Text style={styles.policyTitle}>{quote.cancellationPolicy.name || "Cancellation policy"}</Text>{quote.cancellationPolicy.description ? <Text style={styles.copy}>{quote.cancellationPolicy.description}</Text> : null}{quoteExpired ? <Notice>Your quote has expired. Refresh it before requesting.</Notice> : null}<Field label="Message to the owner (optional)" value={message} onChangeText={setMessage} multiline maxLength={1500} /><Notice tone="info">The server rechecks price, notice period, licence status, availability, and conflicts when you submit. A success screen is shown only after the server creates the reservation.</Notice><PrimaryButton title="Send booking request" loading={bookingMutation.isPending} disabled={quoteExpired} onPress={() => { setError(undefined); bookingMutation.mutate(); }} /></View> : null}</Screen>;
}

const styles = StyleSheet.create({ card: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface }, cardTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" }, label: { color: colors.ink, fontSize: 14, fontWeight: "700" }, options: { gap: spacing.sm }, option: { minHeight: 46, justifyContent: "center", paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }, optionSelected: { borderColor: colors.primary, backgroundColor: "#E8F5F2" }, optionText: { color: colors.ink, fontWeight: "700" }, optionTextSelected: { color: colors.primary }, pressed: { opacity: 0.7 }, quote: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.lg, backgroundColor: colors.surface }, quoteHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md }, copy: { color: colors.muted, lineHeight: 20 }, total: { color: colors.primary, fontSize: 22, fontWeight: "900" }, priceRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md }, priceValue: { color: colors.ink, fontWeight: "700" }, divider: { height: 1, backgroundColor: colors.border }, policyTitle: { color: colors.ink, fontWeight: "800" } });
