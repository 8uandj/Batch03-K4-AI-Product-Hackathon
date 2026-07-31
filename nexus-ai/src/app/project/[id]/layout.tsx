import type { ReactNode } from "react";

import { ProactiveCheckInBubble } from "@/features/proactive-checkin/ProactiveCheckInBubble";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;

  return (
    <>
      {children}
      {id !== "demo" && <ProactiveCheckInBubble projectId={id} />}
    </>
  );
}
