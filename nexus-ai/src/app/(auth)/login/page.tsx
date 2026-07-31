import { AuthForm } from "@/features/auth/components/AuthForm";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next = "/" } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <AuthForm next={next} />
    </main>
  );
}
