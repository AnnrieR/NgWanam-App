"use server";

import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/embedded";
import { trackingOrderNumber, type ChatOrderTracking } from "@/lib/chat-order-tracking";
import { isTrackingQuestion } from "@/lib/chat-order-tracking";
import { MAX_CHAT_QUESTION, type AssistantReply } from "@/lib/chat-assistant";
import { geminiConfiguration, generateSupportAnswer } from "@/lib/gemini";
import { getSupportContext } from "@/lib/chat-support-context";
import { reserveChatAiAttempt } from "@/lib/chat-ai-budget";

type TrackingReply = { text: string; tracking?: ChatOrderTracking; href?: string; linkLabel?: string };

export async function getChatOrderTracking(question: string): Promise<TrackingReply> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { text: "Please sign in to track your own order.", href: "/login", linkLabel: "Sign in" };
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || profile.role !== "customer") return { text: "Personal order tracking is available for customer accounts. Please use your role's Orders or Deliveries page." };
  const number = trackingOrderNumber(String(question).slice(0, 500));
  const select = "id, order_number, status, order_type, created_at, required_at, deliveries(status, out_for_delivery_at, delivered_at)";
  let query = supabase.from("orders").select(select).eq("customer_id", user.id);
  if (number) query = query.eq("order_number", number);
  else query = query.in("status", ["pending", "confirmed", "preparing", "ready"]);
  let result = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!number && !result.error && !result.data) {
    result = await supabase.from("orders").select(select).eq("customer_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  }
  if (result.error) return { text: "I couldn't check your order right now. Please try again.", href: "/orders", linkLabel: "View my orders" };
  const order = result.data;
  if (!order) return { text: number ? "I couldn't find that order in your account. Check the order number in My Orders." : "You don't have any orders yet. Choose your favorite dishes on Home to get started.", href: number ? "/orders" : "/home", linkLabel: number ? "View my orders" : "Browse dishes" };
  const { data: metadata } = await supabase.rpc("get_order_tracking", { p_order_id: order.id });
  const milestones = (metadata as { milestones?: Record<string, string> } | null)?.milestones ?? {};
  const delivery = one(order.deliveries);
  const tracking: ChatOrderTracking = {
    id: order.id, number: String(order.order_number), status: order.status, pickup: order.order_type === "pickup",
    createdAt: order.created_at, requestedAt: order.required_at,
    preparingAt: milestones["order_status:preparing"] ?? null,
    readyAt: milestones["order_status:ready"] ?? null,
    completedAt: milestones["order_status:completed"] ?? null,
    outAt: delivery?.out_for_delivery_at ?? null, deliveredAt: delivery?.delivered_at ?? null,
    deliveryStatus: delivery?.status ?? null,
  };
  return { text: number ? "Here's your order status:" : "Here's the status of your latest active order (or your most recent order if none is active):", tracking };
}

export async function askAssistant(question: unknown): Promise<AssistantReply> {
  if (typeof question !== "string" || !question.trim() || question.length > MAX_CHAT_QUESTION) {
    return { source: "fallback", text: `Please enter a question of 1–${MAX_CHAT_QUESTION} characters.` };
  }
  const text = question.trim();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  // Public widget keeps local FAQ help without exposing a public paid endpoint.
  if (!user || authError) {
    if (isTrackingQuestion(text) || trackingOrderNumber(text)) {
      return { source: "database", text: "Please sign in to track your own order.", href: "/login", linkLabel: "Sign in" };
    }
    const { data, error } = await supabase.rpc("match_chatbot_rule", { p_message: text });
    return {
      source: "fallback", notice: "Saved FAQ — sign in to use AI support.",
      text: !error && data ? String(data) : "Support is unavailable right now. Please try again later.",
      href: "/login", linkLabel: "Sign in",
    };
  }
  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).single();
  if (!profile?.is_active) return { source: "fallback", text: "Please sign in with an active account to use support." };

  // Exact tracking goes straight to the ownership-filtered lookup, even offline
  // or after the AI budget is exhausted. Nothing is sent to Google here.
  if (isTrackingQuestion(text) || trackingOrderNumber(text)) {
    return { source: "database", ...await getChatOrderTracking(text) };
  }
  const fallback = async (notice: string): Promise<AssistantReply> => {
    const { data, error } = await supabase.rpc("match_chatbot_rule", { p_message: text });
    return {
      source: "fallback", notice,
      text: !error && data ? String(data) : "Please check Home for current dishes, Checkout for delivery areas and fees, or My Orders for your status.",
    };
  };
  if (!geminiConfiguration()) return fallback("AI is not configured or is disabled. Showing saved FAQ help, not an AI answer.");
  const facts = await getSupportContext(supabase);
  if (!await reserveChatAiAttempt(user.id)) {
    return fallback("AI support is limited or temporarily unavailable. Showing saved FAQ help; please try AI again later.");
  }
  const answer = await generateSupportAnswer(text, facts);
  if (!answer) return fallback("AI is unavailable right now. Showing saved FAQ help, not an AI answer.");
  if (answer.topic === "order_tracking") {
    // Semantic order intent: the model only classifies. No private order data
    // ever reaches Google; account ownership is enforced again on the server.
    return { source: "database", ...await getChatOrderTracking(text) };
  }
  return { source: "gemini", text: answer.text, notice: "AI-generated using current system data. Confirm prices, availability and fees at checkout." };
}
