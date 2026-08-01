export type AdHocMetricRow = {
  status?: string | null;
  origin?: string | null;
  source_type?: string | null;
  effort_size?: string | null;
};

export type AdHocMetrics = {
  planned: number;
  adHoc: number;
  rework: number;
  adHocRatio: number;
  adHocEffortRatio: number;
  forecastAlert: boolean;
};

export function calculateAdHocMetrics(rows: readonly AdHocMetricRow[]): AdHocMetrics {
  // Forecast only the work that is still open. Completed ad-hoc work should not
  // consume the remaining capacity denominator anymore.
  const remainingRows = rows.filter((task) => task.status !== "done");
  const planned = remainingRows.filter((task) => !task.origin || task.origin === "ai_planned").length;
  const adHoc = remainingRows.filter((task) => task.origin === "ad_hoc" || task.origin === "manual").length;
  const rework = remainingRows.filter((task) => task.origin === "rework" || task.source_type === "feedback_change" || task.source_type === "bug_fix").length;
  const total = planned + adHoc + rework;
  const adHocRatio = total === 0 ? 0 : Math.round(((adHoc + rework) / total) * 100);
  const effort = (task: AdHocMetricRow) => task.effort_size === "large" ? 3 : task.effort_size === "small" ? 1 : 2;
  const totalEffort = remainingRows.reduce((sum, task) => sum + effort(task), 0);
  const adHocEffort = remainingRows.filter((task) => task.origin !== "ai_planned").reduce((sum, task) => sum + effort(task), 0);
  const adHocEffortRatio = totalEffort === 0 ? 0 : Math.round((adHocEffort / totalEffort) * 100);
  return { planned, adHoc, rework, adHocRatio, adHocEffortRatio, forecastAlert: adHocEffortRatio > 30 };
}
