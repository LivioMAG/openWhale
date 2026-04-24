import { getSupabaseClient } from "../core/supabaseClient.js";

export async function getSession() {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email, password) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signUp(payload) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        first_name: payload.firstName,
        last_name: payload.lastName,
        company_name: payload.companyName,
        phone: payload.phone || ""
      }
    }
  });
  if (error) throw error;
  return data;
}

export async function requestOneTimeCode(email) {
  const sb = await getSupabaseClient();
  const { error } = await sb.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function verifyOneTimeCode(email, token) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  return data.session;
}

export async function sendPasswordReset(email) {
  const sb = await getSupabaseClient();
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function updateUserMetadata(updates) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.updateUser({ data: updates });
  if (error) throw error;
  return data.user;
}

export async function updatePassword(password) {
  const sb = await getSupabaseClient();
  const { data, error } = await sb.auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const sb = await getSupabaseClient();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

export async function deleteAccount() {
  const sb = await getSupabaseClient();
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Nicht eingeloggt.");

  const { data, error } = await sb.functions.invoke("delete-account", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error) {
    throw new Error("Account-Löschung erfordert eine deployte Edge Function 'delete-account'.");
  }

  return data;
}
