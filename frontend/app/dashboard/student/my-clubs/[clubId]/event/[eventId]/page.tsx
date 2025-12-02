"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../../../../lib/api";
import { useParams, useRouter } from "next/navigation";

export default function EditEventPage() {
  const { clubId, eventId } = useParams();
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);

  function toLocalInputValue(date: any) {
  if (!date) return "";

  // If it’s a Firestore Timestamp → convert to JS Date
  const d = date?.toDate ? date.toDate() : new Date(date);

  // Convert to `YYYY-MM-DDTHH:mm` for datetime-local
  return d.toISOString().slice(0, 16);
}

  useEffect(() => {
  async function load() {
    const data = await api.getEvent(eventId as string);

    console.log("🔥 RAW EVENT FROM FIRESTORE:", data);

    if (!data) return;

    setEvent({
      ...data,
      start_time: toLocalInputValue(data.start_time),
      end_time: toLocalInputValue(data.end_time),
    });
  }

  load();
}, []);



  if (!event) return <p>Loading...</p>;

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
    await api.deleteEvent(eventId as string);
    router.push(`/dashboard/student/my-clubs/${clubId}`);
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit Event</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <input
          className="w-full p-2 border rounded"
          value={event.name}
          onChange={(e) => setEvent({ ...event, name: e.target.value })}
        />

        <textarea
          className="w-full p-2 border rounded"
          value={event.description}
          onChange={(e) => setEvent({ ...event, description: e.target.value })}
        />

        <input
          className="w-full p-2 border rounded"
          value={event.location}
          onChange={(e) => setEvent({ ...event, location: e.target.value })}
        />

        <label className="block text-sm">Start Time</label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded"
          value={event.start_time}
          onChange={(e) =>
            setEvent({ ...event, start_time: e.target.value })
          }
        />

        <label className="block text-sm">End Time</label>
        <input
          type="datetime-local"
          className="w-full p-2 border rounded"
          value={event.end_time}
          onChange={(e) =>
            setEvent({ ...event, end_time: e.target.value })
          }
        />

        <button className="px-4 py-2 bg-blue-600 text-white rounded w-full">
          Save Changes
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded w-full mt-2"
        >
          Delete Event
        </button>
      </form>
    </div>
  );
}
