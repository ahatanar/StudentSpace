"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "../../../../../lib/api";
import { useAuth } from "../../../../AuthProvider";

type Club = {
  id: string;
  name?: string;
  description?: string;
};

type Member = {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  joined_at?: string;
};

type Event = {
  id: string;
  name?: string;
  description?: string;
  location?: string;
  start_time?: any;
  end_time?: any;
};

export default function ClubPage() {
  const { clubId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [club, setClub] = useState<Club | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);

  async function load() {
    if (!clubId) return;
    setLoading(true);
    try {
      const [clubData, clubEvents, membership, clubMembers] = await Promise.all([
        api.getClub(clubId as string).catch(() => null),
        api.getEventsByClub(clubId as string).catch(() => []),
        api.getMyMembershipForClub(clubId as string).catch(() => null),
        api.getClubMembers(clubId as string).catch(() => []),
      ]);

      setClub(clubData ?? { id: clubId as string });
      setEvents(Array.isArray(clubEvents) ? clubEvents : []);
      setUserRole(membership?.role || null);
      setIsMember(!!membership);
      setMembers(Array.isArray(clubMembers) ? clubMembers : []);
    } catch (err) {
      console.error("Error loading club data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Wait for auth to be ready before making API calls
    if (!authLoading && clubId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, authLoading]);

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await api.deleteEvent(eventId);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  }

  async function handleLeaveClub() {
    if (!confirm("Are you sure you want to leave this club?")) return;
    setLeaving(true);
    try {
      await api.leaveClub(clubId as string);
      alert("You have left the club.");
      router.push("/dashboard/student/my-clubs");
    } catch (e) {
      console.error("Failed to leave club", e);
      alert("Failed to leave club. Please try again.");
    } finally {
      setLeaving(false);
    }
  }

  async function handleJoinClub() {
    setJoining(true);
    try {
      await api.joinClub(clubId as string);
      alert("You have joined the club!");
      await load();
    } catch (e) {
      console.error("Failed to join club", e);
      alert("Failed to join club. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  function formatRole(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function formatDateTime(timestamp: any): string {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder: Record<string, number> = { president: 0, executive: 1, member: 2 };
    return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
  });

  if (loading || authLoading) {
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
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold text-gray-900">
                  {club?.name ?? "Club"}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/student/my-clubs"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  ← Back to My Clubs
                </Link>

                {!isMember && (
                  <button
                    onClick={handleJoinClub}
                    disabled={joining}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {joining ? "Joining..." : "Join Club"}
                  </button>
                )}

                {(userRole === "president" || userRole === "executive") && (
                  <Link
                    href={`/dashboard/student/my-clubs/${clubId}/new-event`}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    New Event
                  </Link>
                )}

                {userRole === "president" && (
                  <Link
                    href={`/dashboard/student/my-clubs/${clubId}/settings`}
                    className="px-5 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition"
                  >
                    Settings
                  </Link>
                )}

                {isMember && userRole !== "president" && (
                  <button
                    onClick={handleLeaveClub}
                    disabled={leaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {leaving ? "Leaving..." : "Leave Club"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto">

          {/* About Section - Redesigned */}
          {club?.description && (
            <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-8 overflow-hidden">
              {/* Gradient accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600" />

              <div className="p-6 pl-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">About</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">{club.description}</p>
              </div>
            </div>
          )}

          {/* Two column layout: Events (left) + Members (right) */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Events section - Left side */}
            <section className="flex-1">
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
                  <p className="text-gray-500 max-w-md mx-auto">
                    This club doesn&apos;t have any events scheduled yet.
                  </p>
                </div>
              )}

              <div className={`space-y-4 ${events.length > 3 ? "max-h-[600px] overflow-y-auto pr-2" : ""}`}>
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition"
                  >
                    {/* Event Header */}
                    <div className="p-5 border-b border-gray-100">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Link
                            href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                            className="text-xl font-bold text-gray-900 hover:text-blue-600 transition"
                          >
                            {ev.name ?? "Untitled Event"}
                          </Link>
                          {ev.description && (
                            <p className="text-gray-600 mt-2 line-clamp-2">{ev.description}</p>
                          )}
                        </div>

                        {(userRole === "president" || userRole === "executive") && (
                          <div className="flex gap-2 flex-shrink-0">
                            <Link
                              href={`/dashboard/student/my-clubs/${clubId}/event/${ev.id}`}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Event Details */}
                    <div className="px-5 py-4 bg-gray-50 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      {ev.start_time && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDateTime(ev.start_time)}</span>
                          {ev.end_time && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span>{formatDateTime(ev.end_time)}</span>
                            </>
                          )}
                        </div>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Members section - Right side */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm sticky top-24">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Members</h2>
                  <span className="text-sm text-gray-500">{members.length}</span>
                </div>

                {members.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-500 text-sm">No members yet.</p>
                  </div>
                ) : (
                  <div className={`divide-y divide-gray-100 ${members.length > 5 ? "max-h-80 overflow-y-auto" : ""}`}>
                    {sortedMembers.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
                      >
                        <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {member.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{member.display_name}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${member.role === "president"
                            ? "bg-purple-100 text-purple-700"
                            : member.role === "executive"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {formatRole(member.role)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}