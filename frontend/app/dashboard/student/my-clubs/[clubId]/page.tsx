"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";

type Club = {
  id: string;
  name?: string;
  description?: string;
};

export default function ClubPage() {
  const { clubId } = useParams();
  const router = useRouter();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await api.deleteEvent(eventId);
    // refresh list
    setEvents((e) => e.filter((ev) => ev.id !== eventId));
  }

  if (loading) return <p>Loading club...</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{club?.name ?? "Club"}</h1>
          {club?.description && (
            <p className="text-sm text-gray-600">{club.description}</p>
          )}
        </div>
        <div>
          <Link
            href={`/dashboard/student/my-clubs/${clubId}/new-event`}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            New Event
          </Link>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-3">Events</h2>

      {events.length === 0 && <p>No events yet.</p>}

      <ul className="space-y-4">
        {events.map((ev) => (
          <li
            key={ev.id}
            className="p-4 border rounded flex items-center justify-between"
          >
            <div>
              <Link
                href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                className="text-lg font-medium text-blue-600"
              >
                {ev.name ?? "Untitled event"}
              </Link>
              {ev.location && (
                <div className="text-sm text-gray-500">{ev.location}</div>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                className="px-3 py-1 bg-blue-500 text-white rounded"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDelete(ev.id)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
