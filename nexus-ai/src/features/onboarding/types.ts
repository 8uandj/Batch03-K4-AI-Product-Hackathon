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

export const defaultSkillGroups = [
  {
    name: "Frontend & Mobile",
    skills: ["HTML/CSS", "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular", "Tailwind CSS", "React Native", "Flutter", "UI/UX Design"],
  },
  {
    name: "Backend & API",
    skills: ["Node.js", "NestJS", "Python", "FastAPI", "Django", "Java", "Spring Boot", ".NET/C#", "Go", "PHP/Laravel", "REST API", "GraphQL"],
  },
  {
    name: "Data, AI & Machine Learning",
    skills: ["SQL", "PostgreSQL", "MongoDB", "Redis", "Data Analysis", "Pandas", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "OpenAI API", "Prompt Engineering"],
  },
  {
    name: "Cloud, DevOps & Infrastructure",
    skills: ["Git & GitHub", "Docker", "Kubernetes", "CI/CD", "Linux", "AWS", "Microsoft Azure", "Google Cloud", "Terraform", "Supabase", "Firebase", "System Design"],
  },
  {
    name: "QA, Security & Operations",
    skills: ["Manual Testing", "Automation Testing", "Jest", "Cypress", "Playwright", "Performance Testing", "Cybersecurity", "Application Security", "Monitoring", "Agile/Scrum", "Technical Support", "IT Helpdesk"],
  },
  {
    name: "Product & Delivery",
    skills: ["Product Management", "Business Analysis", "Requirements Analysis", "Project Management", "Technical Writing", "Documentation", "Figma", "Prototyping", "UX Research", "Stakeholder Management", "Presentation", "Team Leadership"],
  },
] as const;

// Giữ danh sách phẳng để dùng ở các luồng xử lý cần toàn bộ kỹ năng.
export const defaultSkillTags = defaultSkillGroups.flatMap((group) => group.skills);
