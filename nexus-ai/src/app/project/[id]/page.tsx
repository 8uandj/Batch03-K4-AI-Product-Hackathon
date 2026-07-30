import { notFound } from "next/navigation";

import { ProjectOverview } from "@/features/workspace/components/ProjectOverview";
import { getWorkspaceOverview } from "@/features/workspace/data";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const overview = await getWorkspaceOverview(id);

  if (!overview) notFound();

  return <ProjectOverview {...overview} />;
}
