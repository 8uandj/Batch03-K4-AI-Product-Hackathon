import { redirect } from "next/navigation";

import { OnboardingClient } from "@/features/onboarding/components/onboarding-client";
import { createClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("users")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  const { next = "/dashboard" } = await searchParams;

  if (profile?.onboarding_completed) redirect(next);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border bg-slate-950 p-8 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">DEV-01 Onboarding</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Upload CV và hoàn thiện EQ survey</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Bước này là bắt buộc ngay sau register/login để Nexus AI có dữ liệu kỹ năng và EQ trước khi vào workspace.
        </p>
      </header>
      <OnboardingClient next={next} />
    </section>
  );
}
