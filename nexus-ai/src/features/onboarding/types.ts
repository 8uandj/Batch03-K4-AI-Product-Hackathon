export interface EQProfile {
  q1_bugHandling: string;
  q2_taskPreference: string;
  q3_communication: string;
  q4_conflictResolution?: string;
  q5_feedbackHandling?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  inviteCode?: string;
  avatarUrl?: string;
  skills: string[];
  eqProfile: EQProfile;
  createdAt: string;
}

export const defaultSkillTags = [
  "React",
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Python",
  "FastAPI",
  "Supabase",
  "OpenAI API",
  "UI/UX Design",
  "Git & GitHub"
];
