import { createClient, type User } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

export const cloudConfigured = Boolean(projectUrl && publishableKey);
export const googleAuthEnabled = cloudConfigured && googleEnabled;
export const supabase = cloudConfigured
  ? createClient(projectUrl!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    })
  : null;

export type CloudUser = User;

export async function signInWithGoogle() {
  if (!supabase || !googleAuthEnabled) throw new Error("Google authentication is not enabled");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://geoidegeoidal.github.io/ruta-fuerte/",
    },
  });
  if (error) throw error;
}

export async function readCloudStore() {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? null;
}

export async function writeCloudStore(data: unknown) {
  if (!supabase) return;
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 1_000_000) {
    throw new Error("Cloud payload exceeds the safe size limit");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;
  const { error } = await supabase.from("user_data").upsert({
    user_id: user.id,
    data,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
