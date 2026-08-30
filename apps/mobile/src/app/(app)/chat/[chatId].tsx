import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Notice } from "@/components/form-controls";
import { apiRequest, newIdempotencyKey } from "@/services/api/client";
import { useCursorList } from "@/services/api/paginated";
import { colors, radii, spacing } from "@/theme/tokens";

type Message = { id: string; senderId: string; text: string | null; imageUrl: string | null; createdAt: string };

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const client = useQueryClient();
  const [text, setText] = useState("");
  const { query, items, loadMore } = useCursorList<Message>({ queryKey: ["chat", chatId], path: `/chats/${chatId}/messages`, enabled: Boolean(chatId), refetchInterval: 12_000 });
  const send = useMutation({ mutationFn: (message: string) => apiRequest<Message>(`/chats/${chatId}/messages`, { method: "POST", body: { text: message }, idempotencyKey: newIdempotencyKey("message") }), onSuccess: async () => { setText(""); await client.invalidateQueries({ queryKey: ["chat", chatId] }); await client.invalidateQueries({ queryKey: ["chats"] }); } });
  return <SafeAreaView style={styles.safe} edges={["bottom"]}>{query.isPending ? <ActivityIndicator style={styles.loader} color={colors.primary} size="large" /> : query.isError ? <View style={styles.state}><Notice>Messages could not be loaded.</Notice></View> : <FlatList inverted data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onEndReached={loadMore} onEndReachedThreshold={0.4} ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={styles.footer} /> : null} renderItem={({ item }) => <View style={styles.message}><Text style={styles.messageText}>{item.text || "Image attachment"}</Text><Text style={styles.time}>{new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date(item.createdAt))}</Text></View>} ListEmptyComponent={<Text style={styles.empty}>Start the conversation.</Text>} />}<View style={styles.composer}><TextInput value={text} onChangeText={setText} placeholder="Write a message" placeholderTextColor={colors.muted} multiline style={styles.input} /><Pressable disabled={!text.trim() || send.isPending} onPress={() => send.mutate(text.trim())} style={styles.send}><Text style={styles.sendText}>{send.isPending ? "…" : "Send"}</Text></Pressable></View>{send.isError ? <Text style={styles.error}>Message was not sent. Try again.</Text> : null}</SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, loader: { flex: 1 }, footer: { paddingVertical: spacing.md }, state: { padding: spacing.lg }, list: { padding: spacing.md, gap: spacing.sm }, message: { alignSelf: "stretch", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }, messageText: { color: colors.ink, lineHeight: 20 }, time: { color: colors.muted, fontSize: 11 }, empty: { color: colors.muted, textAlign: "center", padding: spacing.xl }, composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.ink, padding: spacing.sm }, send: { minHeight: 44, justifyContent: "center", borderRadius: radii.md, backgroundColor: colors.primary, paddingHorizontal: spacing.md }, sendText: { color: "#FFFFFF", fontWeight: "800" }, error: { color: colors.danger, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface } });
