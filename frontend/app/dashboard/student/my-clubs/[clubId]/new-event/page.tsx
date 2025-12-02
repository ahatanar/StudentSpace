"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../../../AuthProvider";
import { api } from "../../../../../../lib/api";
import { useParams, redirect, useRouter } from "next/navigation";
import Link from "next/link";

export default function NewEventPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();

  const clubId = params.clubId as string;

  const [role, setRole] = useState<string | null>(null);
  const [checkingPerms, setCheckingPerms] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // -----------------------------------------------------
  // LOAD PERMISSIONS
  // -----------------------------------------------------
  useEffect(() => {
    if (user) loadPermissions();
  }, [user]);

  async function loadPermissions() {
    try {
      const memberships = await api.getMyMemberships();
      const membership = memberships.find((m: any) => m.club_id === clubId);
      setRole(membership?.role || null);
    } catch (e) {
      console.error("Error loading membership permissions", e);
    } finally {
      setCheckingPerms(false);
    }
  }

  if (authLoading || checkingPerms) return null;
  if (!user) return redirect("/login");

  const canCreate =
    role === "president" || role === "executive";

  if (role && !canCreate) {
    return (
      <div className="p-6 text-red-500">
        You do not have permission to create events for this club.
      </div>
    );
  }

  // -----------------------------------------------------
  // SUBMIT EVENT
  // -----------------------------------------------------
  async function submitEvent(e: any) {
    e.preventDefault();

    try {
      await api.createEvent({
        club_id: clubId,
        name,
        description,
        location,
        start_time: new Date(startTime),
        end_time: endTime ? new Date(endTime) : null,
      });

      router.push(`/dashboard/student/my-clubs/${clubId}`);
    } catch (err) {
      console.error("Error creating event:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-xl mx-auto">

        <Link
          href={`/dashboard/student/my-clubs/${clubId}`}
          className="text-indigo-600 hover:underline mb-4 block"
        >
          ← Back to Club
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Create New Event
        </h1>

        <form
          onSubmit={submitEvent}
          className="bg-white dark:bg-gray-800 border rounded-xl p-6 shadow-sm space-y-4"
        >
          <input
            type="text"
            placeholder="Event Name"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <textarea
            placeholder="Description"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <input
            type="text"
            placeholder="Location"
            className="w-full p-2 rounded border dark:bg-gray-700"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* START TIME */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Start Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 rounded border dark:bg-gray-700"
              value={startTime}
              required
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* END TIME */}
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">
              End Time (optional)
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 rounded border dark:bg-gray-700"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-3 rounded-lg font-semibold hover:bg-indigo-700"
          >
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
}
