import { redirect } from "next/navigation";

import { JoinProjectForm } from "@/features/workspace/components/JoinProjectForm";
import { createClient } from "@/lib/supabase/server";

type JoinProjectPageProps = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function JoinProjectPage({ params }: JoinProjectPageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/join/${token}`);

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect(`/onboarding?next=/join/${token}`);

  return <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center"><JoinProjectForm token={token} /></section>;
}
