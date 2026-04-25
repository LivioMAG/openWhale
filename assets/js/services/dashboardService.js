import { getSupabaseClient } from "../core/supabaseClient.js";

const ORDER_IMAGES_BUCKET = "order-images";

function sanitizeFileName(name = "upload") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
}

function mapPublicOrderFields() {
  return "id,user_id,account_id,order_number,order_name,immobilie_uid,input_image,output_image,created_at,updated_at";
}

export async function listOrders(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_orders")
    .select(mapPublicOrderFields())
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createOrder(userId, orderName = "") {
  const sb = await getSupabaseClient();
  const payload = {
    user_id: userId,
    account_id: userId,
    order_name: orderName?.trim() || null,
    immobilie_uid: null,
    input_image: null,
    output_image: null
  };

  const { data, error } = await sb.from("image_orders").insert(payload).select(mapPublicOrderFields()).single();

  if (error) throw error;
  return data;
}

export async function uploadOrderInputImage({ userId, orderId, file }) {
  const sb = await getSupabaseClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const fileName = `${Date.now()}-${sanitizeFileName(file.name || `input.${ext}`)}`;
  const storagePath = `${userId}/${orderId}/input/${fileName}`;

  const { error: uploadError } = await sb.storage.from(ORDER_IMAGES_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined
  });

  if (uploadError) throw uploadError;

  const { data, error } = await sb
    .from("image_orders")
    .update({ input_image: storagePath })
    .eq("id", orderId)
    .eq("user_id", userId)
    .select(mapPublicOrderFields())
    .single();

  if (error) throw error;
  return data;
}

export async function listTemplates(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_templates")
    .select("id,user_id,account_id,note,comment,tag,color,usage_count,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
