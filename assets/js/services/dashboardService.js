import { getSupabaseClient } from "../core/supabaseClient.js";

function buildOrderNumber() {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomChunk = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AUF-${isoDate}-${randomChunk}`;
}

export async function listOrders(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_orders")
    .select("id,user_id,order_number,order_name,immobilie_uid,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createOrder(userId, orderName = "") {
  const sb = await getSupabaseClient();
  const payload = {
    user_id: userId,
    order_number: buildOrderNumber(),
    order_name: orderName?.trim() || null,
    immobilie_uid: null
  };

  const { data, error } = await sb
    .from("image_orders")
    .insert(payload)
    .select("id,user_id,order_number,order_name,immobilie_uid,created_at,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export async function listTemplates(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_templates")
    .select("id,user_id,note,tags,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
