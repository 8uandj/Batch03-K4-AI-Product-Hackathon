import { RoleDashboard } from "@/features/dashboard/role-dashboard";
import { getRoleDashboardData } from "@/features/dashboard/role-dashboard-data";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  try {
    return {
      data: await getRoleDashboardData(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Không thể tải dashboard.",
    };
  }
}

export default async function DashboardPage() {
  const { data, error } = await loadDashboard();

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Dashboard error</p>
        <h1 className="mt-3 text-2xl font-black text-red-950">Không thể tải dữ liệu live</h1>
        <p className="mt-3 text-sm leading-6">{error}</p>
      </section>
    );
  }

  return <RoleDashboard data={data} />;
}
