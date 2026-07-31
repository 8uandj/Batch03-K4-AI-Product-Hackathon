import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListTodo,
} from "lucide-react";

import type { DashboardAnalytics } from "./dashboard-analytics";
import { NEXUS_THEME } from "./theme";

interface DashboardProps {
  analytics: DashboardAnalytics;
  dataSource?: "mock" | "supabase";
}

const cardClassName =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

function formatDelay(hours: number): string {
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days === 0) {
    return `${remainingHours} giờ`;
  }

  return remainingHours === 0
    ? `${days} ngày`
    : `${days} ngày ${remainingHours} giờ`;
}

export function Dashboard({
  analytics,
  dataSource = "mock",
}: DashboardProps) {
  const { stats, redFlags } = analytics;

  const statusCards = [
    {
      label: "To-do",
      value: stats.todo,
      icon: ListTodo,
      accent: NEXUS_THEME.blue,
      background: NEXUS_THEME.blueSoft,
    },
    {
      label: "Doing",
      value: stats.doing,
      icon: Clock3,
      accent: NEXUS_THEME.red,
      background: NEXUS_THEME.redSoft,
    },
    {
      label: "Done",
      value: stats.done,
      icon: CheckCircle2,
      accent: NEXUS_THEME.navy,
      background: "#EAF6F1",
    },
  ];

  return (
    <main
      className="min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-10"
      style={{ backgroundColor: NEXUS_THEME.background }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Activity
                aria-hidden="true"
                className="h-5 w-5"
                color={NEXUS_THEME.red}
              />
              <span
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: NEXUS_THEME.blue }}
              >
                Nexus AI
              </span>
            </div>
            <h1
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: NEXUS_THEME.navy }}
            >
              Team Health Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Theo dõi tiến độ và phát hiện sớm những công việc có nguy cơ làm
              thành viên quá tải.
            </p>
          </div>

          <span
            className="w-fit rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor:
                dataSource === "mock"
                  ? NEXUS_THEME.blueSoft
                  : "#EAF6F1",
              color: NEXUS_THEME.navy,
            }}
          >
            {dataSource === "mock" ? "Đang dùng dữ liệu mẫu" : "Supabase live"}
          </span>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {statusCards.map(({ label, value, icon: Icon, accent, background }) => (
            <article className={cardClassName} key={label}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  {label}
                </span>
                <span
                  className="rounded-xl p-2.5"
                  style={{ backgroundColor: background, color: accent }}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
              </div>
              <p
                className="mt-4 text-3xl font-bold"
                style={{ color: NEXUS_THEME.ink }}
              >
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className={`${cardClassName} mb-6`}>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2
                className="text-lg font-bold"
                style={{ color: NEXUS_THEME.navy }}
              >
                Tiến độ tổng quan
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {stats.done}/{stats.total} task đã hoàn thành
              </p>
            </div>
            <strong
              className="text-2xl"
              style={{ color: NEXUS_THEME.blue }}
            >
              {stats.completionPercentage}%
            </strong>
          </div>

          <div
            aria-label={`Tiến độ ${stats.completionPercentage}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={stats.completionPercentage}
            className="h-3 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                background: `linear-gradient(90deg, ${NEXUS_THEME.blue}, ${NEXUS_THEME.red})`,
                width: `${stats.completionPercentage}%`,
              }}
            />
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl border bg-white shadow-sm"
          style={{ borderColor: NEXUS_THEME.redSoft }}
        >
          <div
            className="flex items-center gap-3 border-b px-5 py-4"
            style={{
              backgroundColor: NEXUS_THEME.redSoft,
              borderColor: "#F8CBD2",
            }}
          >
            <span
              className="rounded-xl p-2"
              style={{
                backgroundColor: NEXUS_THEME.surface,
                color: NEXUS_THEME.red,
              }}
            >
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2
                className="font-bold"
                style={{ color: NEXUS_THEME.redDark }}
              >
                Red Flags
              </h2>
              <p className="text-sm text-slate-600">
                Task ở trạng thái Doing quá 48 giờ
              </p>
            </div>
            <span
              className="ml-auto rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: NEXUS_THEME.red }}
            >
              {redFlags.length}
            </span>
          </div>

          {redFlags.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2
                aria-hidden="true"
                className="mx-auto mb-3 h-8 w-8 text-emerald-600"
              />
              <p className="font-medium text-slate-700">
                Chưa phát hiện task có nguy cơ trễ hạn.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {redFlags.map((flag) => (
                <li
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={flag.taskId}
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {flag.taskTitle}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Phụ trách: {flag.assigneeName}
                    </p>
                  </div>
                  <span
                    className="w-fit rounded-full px-3 py-1 text-sm font-semibold"
                    style={{
                      backgroundColor: NEXUS_THEME.redSoft,
                      color: NEXUS_THEME.redDark,
                    }}
                  >
                    Chậm {formatDelay(flag.delayHours)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {analytics.warningCount > 0 && (
          <p className="mt-4 text-sm text-amber-700" role="status">
            Có {analytics.warningCount} bản ghi chưa hợp lệ và đã được bỏ qua.
          </p>
        )}
      </div>
    </main>
  );
}
