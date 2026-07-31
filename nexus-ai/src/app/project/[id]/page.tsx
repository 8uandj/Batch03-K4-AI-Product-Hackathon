import { notFound, redirect } from "next/navigation";

import { ProjectOverview } from "@/features/workspace/components/ProjectOverview";
import { getWorkspaceOverview } from "@/features/workspace/data";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;

  if (id === "demo") {
    redirect("/project");
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const overview = await getWorkspaceOverview(id);

  if (!overview) notFound();

  return <ProjectOverview {...overview} />;
}
