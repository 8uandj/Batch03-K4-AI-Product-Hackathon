import { assignmentScore, assignmentWeights, getAssignmentPhase, riskFromScore, type AssignmentRisk } from "./assignment";

export type DelegationTask = {
  status: string;
  priority: string;
  assignee_id: string;
  due_at: string | null;
  updated_at: string;
};

export type DelegationMember = {
  id: string;
  name: string;
  skills: string[];
  eqAnswers?: Record<string, unknown> | null;
};

export type DelegationDaily = {
  user_id: string;
  activity_date: string;
  open_tasks: number;
  doing_tasks: number;
  overdue_tasks: number;
  stale_doing_tasks: number;
  reminder_count: number;
  completed_tasks: number;
  late_night_updates: number;
};

export type DelegationPrivacy = {
  user_id: string;
  behavioral_insights_enabled: boolean;
  late_night_signal_enabled: boolean;
};

export type DelegationCandidate = {
  userId: string;
  name: string;
  score: number;
  skillFit: number;
  capacity: number;
  urgencyCompatibility: number;
  historyFit: number;
  workStyleFit: number;
  capacityRisk: AssignmentRisk;
  behavioralRiskScore: number;
  behavioralRiskLevel: AssignmentRisk;
  reasons: string[];
  warnings: string[];
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function aggregateDelegationRisk(rows: readonly DelegationDaily[], enabled: boolean, lateNightEnabled: boolean, now = new Date()) {
  if (!enabled) return { score: 0, level: "low" as const, windowDays: 7, daysObserved: 0 };
  const cutoff = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const recent = rows.filter((row) => row.activity_date >= cutoff);
  if (!recent.length) return { score: 0, level: "low" as const, windowDays: 7, daysObserved: 0 };
  const open = recent.reduce((sum, row) => sum + Math.max(0, row.open_tasks), 0);
  const doing = recent.reduce((sum, row) => sum + Math.max(0, row.doing_tasks), 0);
  const overdue = recent.reduce((sum, row) => sum + Math.max(0, row.overdue_tasks), 0);
  const stale = recent.reduce((sum, row) => sum + Math.max(0, row.stale_doing_tasks), 0);
  const reminders = recent.reduce((sum, row) => sum + Math.max(0, row.reminder_count), 0);
  const completed = recent.reduce((sum, row) => sum + Math.max(0, row.completed_tasks), 0);
  const lateNight = lateNightEnabled ? recent.reduce((sum, row) => sum + Math.max(0, row.late_night_updates), 0) : 0;
  const overdueRatio = clamp((overdue / Math.max(1, open + overdue)) * 100);
  const staleRatio = clamp((stale / Math.max(1, doing)) * 100);
  const activeWorkload = clamp((open / Math.max(1, recent.length * 8)) * 100);
  const reminderEscalation = clamp((reminders / Math.max(1, recent.length * 3)) * 100);
  const lateNightSignal = clamp((lateNight / Math.max(1, open + completed)) * 100);
  const consistency = clamp((completed / Math.max(1, completed + overdue)) * 100);
  const score = clamp(overdueRatio * 0.25 + Math.max(staleRatio, overdueRatio) * 0.2 + activeWorkload * 0.2 + reminderEscalation * 0.15 + lateNightSignal * 0.1 + (100 - consistency) * 0.1);
  return { score, level: riskFromScore(score), windowDays: 7, daysObserved: recent.length };
}

function answerChoice(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1).toUpperCase() : "";
}

function workStyleFit(eqAnswers: Record<string, unknown> | null | undefined, urgent: boolean) {
  const taskPreference = answerChoice(eqAnswers?.q2_taskPreference ?? eqAnswers?.task_preference);
  const communication = answerChoice(eqAnswers?.q3_communication ?? eqAnswers?.communication);
  if (!taskPreference && !communication) return 50;
  if (urgent && communication === "A") return 90;
  if (!urgent && (taskPreference === "B" || taskPreference === "C")) return 80;
  return 65;
}

export function buildDelegationCandidates(input: {
  members: readonly DelegationMember[];
  tasks: readonly DelegationTask[];
  dailyRows: readonly DelegationDaily[];
  privacy: readonly DelegationPrivacy[];
  requiredSkills: readonly string[];
  urgent: boolean;
  dueAt: string | null;
  deadlineAt: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const criticalOpenTasks = input.tasks.some((task) => task.priority === "high" && task.status !== "done");
  const daysUntil = input.deadlineAt ? Math.ceil((new Date(input.deadlineAt).getTime() - now.getTime()) / 86400000) : null;
  const phase = getAssignmentPhase(daysUntil, input.urgent, criticalOpenTasks);
  const weights = assignmentWeights(phase);
  const candidates = input.members.map((member) => {
    const open = input.tasks.filter((task) => task.assignee_id === member.id && task.status !== "done");
    const overdue = open.filter((task) => task.due_at && new Date(task.due_at).getTime() < now.getTime()).length;
    const stale = open.filter((task) => task.status === "doing" && now.getTime() - new Date(task.updated_at).getTime() > 48 * 3600000).length;
    const skillFit = input.requiredSkills.length ? clamp(input.requiredSkills.filter((skill) => member.skills.some((own) => own.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(own.toLowerCase()))).length / input.requiredSkills.length * 100) : 50;
    const privacy = input.privacy.find((item) => item.user_id === member.id);
    const behavioralRows = input.dailyRows.filter((row) => row.user_id === member.id);
    const behavioral = aggregateDelegationRisk(behavioralRows, privacy?.behavioral_insights_enabled !== false, privacy?.late_night_signal_enabled !== false, now);
    const baseCapacity = clamp(100 - open.length * 15 - overdue * 20 - stale * 20);
    const capacity = clamp(baseCapacity - behavioral.score * 0.35);
    const urgencyCompatibility = input.urgent || (input.dueAt && new Date(input.dueAt).getTime() < now.getTime() + 3 * 86400000) ? clamp(capacity + 20) : capacity;
    const historyFit = clamp((input.tasks.filter((task) => task.assignee_id === member.id && task.status === "done").length / Math.max(1, input.tasks.filter((task) => task.assignee_id === member.id).length)) * 100);
    const styleFit = workStyleFit(member.eqAnswers, input.urgent);
    const score = assignmentScore({ skillFit, capacity, urgency: urgencyCompatibility, history: historyFit, workStyle: styleFit, phase });
    const capacityRisk = riskFromScore(Math.max(behavioral.score, 100 - capacity));
    const warnings = [
      overdue ? `${overdue} task quá hạn` : "",
      stale ? `${stale} task Doing chưa cập nhật quá 48 giờ` : "",
      behavioral.score >= 40 ? `Workload risk aggregate ${behavioral.score}/100 trong ${behavioral.windowDays} ngày` : "",
    ].filter(Boolean);
    return {
      userId: member.id,
      name: member.name,
      score,
      skillFit,
      capacity,
      urgencyCompatibility,
      historyFit,
      workStyleFit: styleFit,
      capacityRisk,
      behavioralRiskScore: behavioral.score,
      behavioralRiskLevel: behavioral.level,
      reasons: [skillFit >= 70 ? "Skill phù hợp với task" : "Skill match cần bổ sung hỗ trợ", capacity >= 70 ? "Đang có capacity tốt" : "Workload cần cân nhắc", historyFit >= 70 ? "Lịch sử hoàn thành ổn định" : "Cần theo dõi thêm lịch sử hoàn thành"],
      warnings,
    } satisfies DelegationCandidate;
  }).sort((left, right) => right.score - left.score);
  return { phase, weights, candidates };
}
