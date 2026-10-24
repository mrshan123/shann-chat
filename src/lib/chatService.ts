import { supabase } from "./supabase";

export type ChatMessage = {
  id: string; chat_id: string; sender_id: string; ciphertext: string;
  iv: string; created_at: string; message_type: "text" | "image" | "file" | "voice";
};

export async function sendEncryptedMessage(input: {
  chatId: string; ciphertext: string; iv: string; messageType?: ChatMessage["message_type"];
}) {
  if (!supabase) throw new Error("Supabase is not configured. Copy .env.example to .env.local and add project credentials.");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in first.");
  const { data, error } = await supabase.from("messages").insert({
    chat_id: input.chatId, sender_id: user.id, ciphertext: input.ciphertext,
    iv: input.iv, message_type: input.messageType ?? "text"
  }).select().single();
  if (error) throw error;
  return data as ChatMessage;
}

export async function fetchMessages(chatId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.from("messages").select("*")
    .eq("chat_id", chatId).order("created_at", { ascending: true }).limit(200);
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export function subscribeToMessages(chatId: string, onMessage: (message: ChatMessage) => void) {
  if (!supabase) return () => {};
  const channel = supabase.channel(`messages:${chatId}`).on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
    (payload) => onMessage(payload.new as ChatMessage)
  ).subscribe();
  return () => { void supabase?.removeChannel(channel); };
}
