import type { Metadata } from 'next';

import { Header } from '@/components/shared/header';
import { Sidebar } from '@/components/shared/sidebar';
import {
  createClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus AI',
  description: 'AI-powered project workspace',
};

async function userRequiresOnboarding() {
  if (!isSupabaseConfigured()) return false;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  return !profile?.onboarding_completed;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requiresOnboarding = await userRequiresOnboarding();

  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <Sidebar requiresOnboarding={requiresOnboarding} />
        <Header />
        <main
          className="min-h-screen pb-24 pt-20 md:pb-0"
          style={{ paddingLeft: "var(--sidebar-w, 0)" }}
        >
          <div className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
