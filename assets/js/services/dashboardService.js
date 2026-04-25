import { getSupabaseClient } from "../core/supabaseClient.js";

const ORDER_IMAGES_BUCKET = "order-images";
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

function sanitizeFileName(name = "upload") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
}

function mapPublicOrderFields() {
  return "id,user_id,account_id,order_number,order_name,immobilie_uid,input_image,output_image,created_at,updated_at";
}

function mapPublicTemplateFields() {
  return "id,user_id,account_id,note,prompt,comment,tag,color,usage_count,created_at,updated_at";
}

async function createSignedImageUrl(sb, path) {
  if (!path) return null;
  const { data, error } = await sb.storage.from(ORDER_IMAGES_BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);
  if (error) return null;
  return data?.signedUrl || null;
}

function normalizeLatestOutputRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    job_id: row.job_id,
    image_path: row.image_path,
    prompt: row.prompt,
    status: row.status,
    metadata: row.metadata,
    created_at: row.created_at
  };
}

async function fetchLatestOutputMap(sb, orderIds = []) {
  if (!orderIds.length) return new Map();

  const { data, error } = await sb
    .from("image_order_outputs")
    .select("id,job_id,image_path,prompt,status,metadata,created_at")
    .in("job_id", orderIds)
    .order("job_id", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const latestMap = new Map();
  (data || []).forEach((row) => {
    if (!latestMap.has(row.job_id)) {
      latestMap.set(row.job_id, normalizeLatestOutputRow(row));
    }
  });

  return latestMap;
}

async function enrichOrderWithImageUrls(sb, order, latestOutputMap = new Map()) {
  const latestOutput = latestOutputMap.get(order.id) || null;
  const outputPath = latestOutput?.image_path || order.output_image;

  const [inputImageUrl, outputImageUrl] = await Promise.all([
    createSignedImageUrl(sb, order.input_image),
    createSignedImageUrl(sb, outputPath)
  ]);

  return {
    ...order,
    latest_output: latestOutput,
    input_image_url: inputImageUrl,
    output_image_url: outputImageUrl,
    output_image: outputPath
  };
}

export async function listOrders(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_orders")
    .select(mapPublicOrderFields())
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const orders = data || [];
  const latestOutputMap = await fetchLatestOutputMap(
    sb,
    orders.map((order) => order.id)
  );

  return Promise.all(orders.map((order) => enrichOrderWithImageUrls(sb, order, latestOutputMap)));
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
  return enrichOrderWithImageUrls(sb, data);
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
  return enrichOrderWithImageUrls(sb, data);
}

export async function deleteOrderInputImage({ userId, orderId, storagePath }) {
  const sb = await getSupabaseClient();

  if (storagePath) {
    const { error: removeError } = await sb.storage.from(ORDER_IMAGES_BUCKET).remove([storagePath]);
    if (removeError) throw removeError;
  }

  const { data, error } = await sb
    .from("image_orders")
    .update({ input_image: null })
    .eq("id", orderId)
    .eq("user_id", userId)
    .select(mapPublicOrderFields())
    .single();

  if (error) throw error;
  return enrichOrderWithImageUrls(sb, data);
}

export async function listTemplates(userId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_templates")
    .select(mapPublicTemplateFields())
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listOrderOutputs(userId, orderId) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("image_order_outputs")
    .select("id,job_id,image_path,prompt,status,metadata,created_at")
    .eq("user_id", userId)
    .eq("job_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = data || [];
  const signedUrls = await Promise.all(rows.map((row) => createSignedImageUrl(sb, row.image_path)));

  return rows.map((row, index) => ({
    ...normalizeLatestOutputRow(row),
    output_image_url: signedUrls[index] || null
  }));
}

export async function createTemplate(userId, payload) {
  const sb = await getSupabaseClient();
  const note = payload.note?.trim() || "";
  const prompt = payload.prompt?.trim() || note;
  const insertPayload = {
    user_id: userId,
    account_id: userId,
    note,
    prompt,
    comment: Array.isArray(payload.comment) ? payload.comment : [],
    tag: payload.tag?.trim() || null,
    color: payload.color?.trim() || "#E8F8F0",
    usage_count: 0
  };

  const { data, error } = await sb.from("image_templates").insert(insertPayload).select(mapPublicTemplateFields()).single();

  if (error) throw error;
  return data;
}

export async function updateTemplate(userId, templateId, payload) {
  const sb = await getSupabaseClient();

  const updatePayload = {
    note: payload.note?.trim() || "",
    prompt: payload.prompt?.trim() || payload.note?.trim() || "",
    tag: payload.tag?.trim() || null,
    color: payload.color?.trim() || "#E8F8F0"
  };

  const { data, error } = await sb
    .from("image_templates")
    .update(updatePayload)
    .eq("id", templateId)
    .eq("user_id", userId)
    .select(mapPublicTemplateFields())
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplate(userId, templateId) {
  const sb = await getSupabaseClient();
  const { error } = await sb.from("image_templates").delete().eq("id", templateId).eq("user_id", userId);
  if (error) throw error;
}

export async function applyTemplateToOrder({ userId, orderId, templateId }) {
  const sb = await getSupabaseClient();

  const { data: currentTemplate, error: currentTemplateError } = await sb
    .from("image_templates")
    .select("id,note,usage_count")
    .eq("id", templateId)
    .eq("user_id", userId)
    .single();

  if (currentTemplateError) throw currentTemplateError;

  const { data: updatedTemplate, error: updateTemplateError } = await sb
    .from("image_templates")
    .update({ usage_count: (currentTemplate.usage_count || 0) + 1 })
    .eq("id", templateId)
    .eq("user_id", userId)
    .select(mapPublicTemplateFields())
    .single();

  if (updateTemplateError) throw updateTemplateError;

  return {
    template: updatedTemplate,
    orderId,
    templateId,
    orderUpdate: null
  };
}

export async function saveOrderOutputImage({ userId, orderId, imagePath, prompt = null, status = "completed", metadata = {} }) {
  const sb = await getSupabaseClient();

  const { data, error } = await sb
    .from("image_order_outputs")
    .insert({
      user_id: userId,
      job_id: orderId,
      image_path: imagePath,
      prompt,
      status,
      metadata
    })
    .select("id,job_id,image_path,prompt,status,metadata,created_at")
    .single();

  if (error) throw error;

  const signedUrl = await createSignedImageUrl(sb, data.image_path);
  return {
    ...normalizeLatestOutputRow(data),
    output_image_url: signedUrl
  };
}
