import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const event = await prisma.event.findUnique({
    where: { shareToken: token },
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
      public: true,
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Preview not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(event);
}
