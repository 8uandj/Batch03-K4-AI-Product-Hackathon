import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import { assertProductionConfig } from "./config";

let openAIClient: OpenAI | undefined;

export function getOpenAIClient() {
  assertProductionConfig();
  openAIClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openAIClient;
}

export function getSupabaseAdmin() {
  assertProductionConfig();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
