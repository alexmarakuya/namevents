import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      public: true,
    },
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
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Event not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json(event, { headers: corsHeaders });
}
