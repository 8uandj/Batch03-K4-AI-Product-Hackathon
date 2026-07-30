import { Dashboard } from "../../features/dashboard/dashboard";
import { createMockDashboardAnalytics } from "../../features/dashboard/mock-data";

export default function PMDashboardPage() {
  return (
    <Dashboard
      analytics={createMockDashboardAnalytics()}
      dataSource="mock"
    />
  );
}
