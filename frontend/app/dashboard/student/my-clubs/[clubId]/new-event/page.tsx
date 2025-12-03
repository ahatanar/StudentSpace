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

  const canCreate = role === "president" || role === "executive";

  if (role && !canCreate) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500 text-lg">
        You do not have permission to create events for this club.
      </div>
    );
  }

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
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              <h1 className="text-3xl font-bold text-gray-900">
                Create New Event
              </h1>

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

        {/* Form */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-lg mx-auto">
          <form
            onSubmit={submitEvent}
            className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6"
          >
            {/* EVENT NAME */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Event Name</label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full p-3 border rounded-lg min-h-[120px] text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* LOCATION */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Location</label>
              <input
                type="text"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* START TIME */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Start Time</label>
              <input
                type="datetime-local"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={startTime}
                required
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            {/* END TIME */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">End Time (optional)</label>
              <input
                type="datetime-local"
                className="w-full p-3 border rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Create Event
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}