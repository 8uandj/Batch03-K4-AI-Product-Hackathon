export type AssignmentPhase = "normal" | "sprint" | "emergency";
export type AssignmentRisk = "low" | "moderate" | "high" | "critical";

export type AssignmentWeights = { skill: number; capacity: number; urgency: number; history: number; workStyle: number };
export type AssignmentCandidate = { userId: string; score: number; skillFit: number; capacityRisk: AssignmentRisk; reasons: string[]; warnings: string[] };

export function getAssignmentPhase(daysUntilDeadline: number | null, urgent: boolean, criticalOpenTasks = false): AssignmentPhase {
  if (urgent || (daysUntilDeadline !== null && daysUntilDeadline <= 2)) return "emergency";
  if (criticalOpenTasks || (daysUntilDeadline !== null && daysUntilDeadline <= 7)) return "sprint";
  return "normal";
}

export function assignmentWeights(phase: AssignmentPhase): AssignmentWeights {
  if (phase === "emergency") return { skill: 20, capacity: 40, urgency: 30, history: 5, workStyle: 5 };
  if (phase === "sprint") return { skill: 30, capacity: 35, urgency: 25, history: 5, workStyle: 5 };
  return { skill: 40, capacity: 25, urgency: 15, history: 10, workStyle: 10 };
}

export function riskFromScore(score: number): AssignmentRisk {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

export function forceAssignOverrideError(risk: AssignmentRisk, reason: string, mitigation: string): "assignment_confirmation_required" | "emergency_override_required" | null {
  if ((risk === "high" || risk === "critical") && (!reason.trim() || !mitigation.trim())) return "assignment_confirmation_required";
  if (risk === "critical" && mitigation !== "emergency") return "emergency_override_required";
  return null;
}

export function assignmentScore(input: { skillFit: number; capacity: number; urgency: number; history: number; workStyle: number; phase: AssignmentPhase }) {
  const w = assignmentWeights(input.phase);
  return Math.round((input.skillFit * w.skill + input.capacity * w.capacity + input.urgency * w.urgency + input.history * w.history + input.workStyle * w.workStyle) / 100);
}
