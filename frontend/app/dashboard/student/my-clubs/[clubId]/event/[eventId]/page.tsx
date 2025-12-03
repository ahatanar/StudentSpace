"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function EditEventPage() {
  const { clubId, eventId } = useParams();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function toLocalInputValue(date: any) {
    if (!date) return "";
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toISOString().slice(0, 16);
  }

  useEffect(() => {
    async function load() {
      try {
        const [eventData, membership] = await Promise.all([
          api.getEvent(eventId as string),
          api.getMyMembershipForClub(clubId as string).catch(() => null),
        ]);

        if (!eventData) {
          router.push(`/dashboard/student/my-clubs/${clubId}`);
          return;
        }

        setEvent({
          ...eventData,
          start_time: toLocalInputValue(eventData.start_time),
          end_time: toLocalInputValue(eventData.end_time),
        });

        const role = membership?.role || null;
        setUserRole(role);

        // Check permission and redirect if needed
        if (role !== "president" && role !== "executive") {
          router.push(`/dashboard/student/my-clubs/${clubId}`);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpdate(e: any) {
    e.preventDefault();

    await api.updateEvent(eventId as string, {
      name: event.name,
      description: event.description,
      location: event.location,
      start_time: new Date(event.start_time),
      end_time: event.end_time ? new Date(event.end_time) : null,
    });

    router.push(`/dashboard/student/my-clubs/${clubId}`);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this event?")) return;
    await api.deleteEvent(eventId as string);
    router.push(`/dashboard/student/my-clubs/${clubId}`);
  }

  if (loading || !event) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg text-gray-600">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1">

        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>

              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/student/my-clubs/${clubId}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  ← Back to Club
                </Link>
              </div>

            </div>
          </div>
        </header>

        {/* Main Form */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-lg mx-auto">
          <form
            onSubmit={handleUpdate}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6"
          >
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={event.name}
                onChange={(e) => setEvent({ ...event, name: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full p-3 border rounded-lg min-h-[120px] text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={event.description}
                onChange={(e) =>
                  setEvent({ ...event, description: e.target.value })
                }
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Location</label>
              <input
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={event.location}
                onChange={(e) =>
                  setEvent({ ...event, location: e.target.value })
                }
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={event.start_time}
                onChange={(e) =>
                  setEvent({ ...event, start_time: e.target.value })
                }
                required
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">End Time</label>
              <input
                type="datetime-local"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={event.end_time}
                onChange={(e) =>
                  setEvent({ ...event, end_time: e.target.value })
                }
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Save Changes
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              className="w-full bg-red-600 text-white p-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Delete Event
            </button>

          </form>
        </div>
      </main>
    </div>
  );
}