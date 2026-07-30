import { Dashboard } from "@/features/dashboard/dashboard";
import { fetchDashboardAnalytics } from "@/features/dashboard/dashboard-analytics";
import { createMockDashboardAnalytics } from "@/features/dashboard/mock-data";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  try {
    const analytics = await fetchDashboardAnalytics(supabase);

    return {
      analytics,
      dataSource: "supabase" as const,
    };
  } catch (error) {
    console.error("Failed to load PM dashboard from Supabase", error);

    return {
      analytics: createMockDashboardAnalytics(),
      dataSource: "mock" as const,
    };
  }
}

export default async function PMDashboardPage() {
  const { analytics, dataSource } = await getDashboardData();

  return <Dashboard analytics={analytics} dataSource={dataSource} />;
}
