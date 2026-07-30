import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

/**
 * Shared browser client. Mọi thao tác qua client này đều phải được bảo vệ bằng
 * Supabase Auth + RLS. Các secret server-only không được đặt trong module này.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
