import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { EventForm } from "@/components/events/EventForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;

  const [event, venues, people] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        distributions: true,
        venue: true,
        people: { include: { person: true }, orderBy: { order: "asc" } },
      },
    }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <main className="px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-6">
          Edit Event
        </h1>
        <EventForm
          event={JSON.parse(JSON.stringify(event))}
          venues={JSON.parse(JSON.stringify(venues))}
          people={JSON.parse(JSON.stringify(people))}
        />
      </main>
    </div>
  );
}
