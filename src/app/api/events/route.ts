import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Entity, EventFormat, EventStage } from "@/generated/prisma/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const entity = searchParams.get("entity")?.toUpperCase() as Entity | undefined;
  const stage = searchParams.get("stage");
  const format = searchParams.get("format")?.toUpperCase() as EventFormat | undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

  const where: Record<string, unknown> = {
    public: true,
  };

  if (entity) where.entity = entity;
  if (format) where.format = format;

  if (stage) {
    const stages = stage.toUpperCase().split(",") as EventStage[];
    where.stage = { in: stages };
  }

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to);
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      entity: true,
      format: true,
      stage: true,
      date: true,
      endDate: true,
      location: true,
      locationUrl: true,
      shortBlurb: true,
      description: true,
      coverImage: true,
      images: true,
      tags: true,
      coHosts: true,
      capacity: true,
      registrationUrl: true,
      externalUrl: true,
      // Exclude: notes, shareToken, public (always true here)
    },
  });

  const total = await prisma.event.count({ where });

  return NextResponse.json(
    {
      events,
      total,
      updatedAt: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}
