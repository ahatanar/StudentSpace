"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../../../lib/api";
import { useParams } from "next/navigation";

type Club = {
  id: string;
  name?: string;
  description?: string;
};

export default function ClubPage() {
  const { clubId } = useParams();

  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!clubId) return;
    setLoading(true);
    try {
      const [clubData, clubEvents] = await Promise.all([
        api.getClub(clubId as string).catch(() => null),
        api.getEventsByClub(clubId as string).catch(() => []),
      ]);

      setClub(clubData ?? { id: clubId });
      setEvents(Array.isArray(clubEvents) ? clubEvents : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [clubId]);

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await api.deleteEvent(eventId);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg text-gray-600">
        Loading club...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              {/* Title section */}
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-gray-900">
                  {club?.name ?? "Club"}
                </h1>
              </div>

              {/* Buttons on right side */}
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/student/my-clubs"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  ← Back to My Clubs
                </Link>

                <Link
                  href={`/dashboard/student/my-clubs/${clubId}/new-event`}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  New Event
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Content container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-lg mx-auto space-y-8">

          {/* Club description */}
          {club?.description && (
            <p className="text-gray-700 text-lg max-w-2xl">{club.description}</p>
          )}

          {/* Events section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Events</h2>
              <p className="text-sm text-gray-600">
                {events.length} {events.length === 1 ? "event" : "events"}
              </p>
            </div>

            {events.length === 0 && (
              <div className="py-16 text-center bg-white border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Events Yet
                </h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  This club doesn’t have any events scheduled yet.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow transition"
                >
                  <div>
                    <Link
                      href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {ev.name ?? "Untitled Event"}
                    </Link>
                    {ev.location && (
                      <p className="text-sm text-gray-500">{ev.location}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Link
                      href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(ev.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}