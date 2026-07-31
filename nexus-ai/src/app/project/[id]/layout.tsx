import type { ReactNode } from "react";

import { ProactiveCheckInBubble } from "@/features/proactive-checkin/ProactiveCheckInBubble";
import { canReceiveReworkAlert } from "@/features/proactive-checkin/checkin";
import { requireProjectAccess } from "@/features/workspace/access";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { id } = await params;
  let showReworkAlert = false;

  if (id !== "demo") {
    try {
      const access = await requireProjectAccess(id);
      showReworkAlert = canReceiveReworkAlert(access.role);
    } catch {
      // The page itself owns access errors; the optional bubble stays hidden.
    }
  }

  return (
    <>
      {children}
      {showReworkAlert && <ProactiveCheckInBubble projectId={id} />}
    </>
  );
}
