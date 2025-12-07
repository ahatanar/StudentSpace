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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (authLoading || checkingPerms) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return redirect("/login");

  const canCreate = role === "president" || role === "executive";

  if (role && !canCreate) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You do not have permission to create events for this club.
          </p>
          <Link
            href={`/dashboard/student/my-clubs/${clubId}`}
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Back to Club
          </Link>
        </div>
      </div>
    );
  }

  async function submitEvent(e: any) {
    e.preventDefault();

    // Guard against double submission
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createEvent({
        club_id: clubId,
        name,
        description,
        location,
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : undefined,
      });

      // Success! Navigate back
      router.push(`/dashboard/student/my-clubs/${clubId}`);
    } catch (err: any) {
      console.error("Error creating event:", err);
      setError(err.message || "Failed to create event. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          href={`/dashboard/student/my-clubs/${clubId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Event</h1>
          <p className="text-gray-500">Fill in the details below</p>
        </div>

        {/* Form */}
        <form onSubmit={submitEvent} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="bg-indigo-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Event Details
              </h2>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-5">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Event Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Event Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="e.g., Weekly Club Meeting"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg min-h-[100px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Describe what this event is about..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="e.g., Room 101, Main Building"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="datetime-local"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      value={startTime}
                      required
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Time <span className="text-gray-400 text-xs font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="datetime-local"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Link
              href={`/dashboard/student/my-clubs/${clubId}`}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}