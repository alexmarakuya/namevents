import { prisma } from "@/lib/prisma";
import { STAGE_ORDER } from "@/lib/utils";
import { Board } from "@/components/pipeline/Board";
import { ComingUp } from "@/components/pipeline/ComingUp";
import { Header } from "@/components/layout/Header";
import type { Entity } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ entity?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const entityFilter = params.entity as Entity | undefined;

  const where = entityFilter ? { entity: entityFilter } : {};

  const events = await prisma.event.findMany({
    where: {
      ...where,
      stage: { in: STAGE_ORDER },
    },
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
  });

  const upcomingEvents = await prisma.event.findMany({
    where: {
      date: { gte: new Date() },
      stage: { in: ["CONFIRMED", "ANNOUNCED"] },
      ...(entityFilter ? { entity: entityFilter } : {}),
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="px-6 pt-6 pb-6">
        <ComingUp events={JSON.parse(JSON.stringify(upcomingEvents))} />
        <Board
          events={JSON.parse(JSON.stringify(events))}
          activeEntity={entityFilter || null}
        />
      </main>
    </div>
  );
}
