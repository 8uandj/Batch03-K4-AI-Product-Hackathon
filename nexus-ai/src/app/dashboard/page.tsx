import { RoleDashboard } from "@/features/dashboard/role-dashboard";
import { getRoleDashboardData } from "@/features/dashboard/role-dashboard-data";
import { BackButton } from "@/components/shared/BackButton";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ projectId?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { projectId } = await searchParams;

  let data;
  try {
    data = await getRoleDashboardData(projectId);
  } catch (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Dashboard error</p>
        <h1 className="mt-3 text-2xl font-black text-red-950">Không thể tải dữ liệu live</h1>
        <p className="mt-3 text-sm leading-6">
          {error instanceof Error ? error.message : "Không thể tải dashboard."}
        </p>
      </section>
    );
  }

  return <><BackButton /><RoleDashboard data={data} /></>;
}
