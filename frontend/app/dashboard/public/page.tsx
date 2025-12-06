"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../AuthProvider";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { api } from "../../../lib/api";

interface PublicDashboardProps {
  hideHeader?: boolean;
  hideTopHeader?: boolean;
  hideSidebar?: boolean;
  hideSidebarUserLinks?: boolean;
  hideHeaderMyAccount?: boolean;
}

export default function PublicDashboard({
  hideHeader,
  hideTopHeader,
  hideSidebar,
  hideSidebarUserLinks,
  hideHeaderMyAccount
}: PublicDashboardProps) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [myMemberships, setMyMemberships] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Clubs");
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("All Events");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const clubsData = await api.getClubs();
        setClubs(clubsData);

        // Fetch user's memberships and events if logged in
        if (user) {
          try {
            const memberships = await api.getMyMemberships();
            setMyMemberships(Array.isArray(memberships) ? memberships : []);

            // Fetch all events
            const eventsData = await api.getEvents();
            if (eventsData?.events) {
              setEvents(eventsData.events);
            }
          } catch (e) {
            console.error("Failed to load user data", e);
          }
        }
      } catch (e) {
        console.error("Failed to load clubs", e);
      }
    }
    loadData();
  }, [user]);

  // Helper to check if user has joined a club
  const isJoined = (clubId: string) => {
    return myMemberships.some((m) => m.club_id === clubId);
  };

  // Format event date/time
  function formatEventTime(timestamp: any): string {
    if (!timestamp) return "";
    try {
      const date = typeof timestamp === "number"
        ? new Date(timestamp * 1000)
        : new Date(timestamp);
      return date.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }

  const featuredEvents = useMemo(() => events.filter((event) => event.featured), [events]);

  useEffect(() => {
    if (featuredEvents.length > 1) {
      const interval = setInterval(() => {
        setCurrentEventIndex((prev) => (prev + 1) % featuredEvents.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredEvents]);

  const categories = useMemo(() => {
    const uniqueTypes = new Set(clubs.map((club) => club.type || club.category).filter(Boolean));
    const typesList = Array.from(uniqueTypes).sort();
    return ["All Clubs", ...typesList];
  }, [clubs]);

  // Get unique club names from events for filter
  const eventClubFilters = useMemo(() => {
    const clubNames = new Set<string>();
    events.forEach((e) => {
      if (e.club_name || e.club_abbreviation) {
        clubNames.add(e.club_name || e.club_abbreviation);
      }
    });
    return ["All Events", ...Array.from(clubNames).sort()];
  }, [events]);

  const filteredClubs = clubs.filter((club) => {
    const clubType = club.type || club.category;
    const matchesCategory = selectedCategory === "All Clubs" || clubType === selectedCategory;
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const currentEvent = featuredEvents[currentEventIndex];

  // Get upcoming events (sorted by start_time, filtered by club)
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => e.start_time)
      .filter((e) => selectedEventFilter === "All Events" || (e.club_name || e.club_abbreviation) === selectedEventFilter)
      .sort((a, b) => {
        const aTime = typeof a.start_time === "number" ? a.start_time : new Date(a.start_time).getTime() / 1000;
        const bTime = typeof b.start_time === "number" ? b.start_time : new Date(b.start_time).getTime() / 1000;
        return aTime - bTime;
      })
      .slice(0, 6);
  }, [events, selectedEventFilter]);

  async function handleLogout() {
    await signOut(auth);
    router.push("/dashboard/public");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {!hideHeader && !hideSidebar && (
        <aside className="w-64 flex-shrink-0 bg-white p-6 hidden lg:flex flex-col border-r border-gray-200">
          <div className="mb-10">
            <span className="text-2xl font-bold text-gray-900">StudentSpace</span>
          </div>

          {/* Event Filter */}
          {user && profile?.role === "student" && eventClubFilters.length > 1 && (
            <nav className="flex flex-col space-y-1 mb-8">
              <h3 className="px-3 text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">
                Filter Events
              </h3>
              {eventClubFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedEventFilter(filter)}
                  className={`px-3 py-2.5 text-sm font-medium rounded-lg transition text-left ${selectedEventFilter === filter
                    ? "text-white bg-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  {filter}
                </button>
              ))}
            </nav>
          )}

          {/* Club Filter */}
          <nav className="flex flex-col space-y-1">
            <h3 className="px-3 text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">
              Filter Clubs
            </h3>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-2.5 text-sm font-medium rounded-lg transition text-left ${selectedCategory === category
                  ? "text-white bg-blue-600"
                  : "text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {category}
              </button>
            ))}
          </nav>
        </aside>
      )}


      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        {!hideHeader && !hideTopHeader && (
          <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-20 gap-4">
                <div className="hidden md:flex flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search for clubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg text-gray-900 placeholder-gray-400 outline-none"
                  />
                </div>

                <div className="md:ml-auto">
                  {!user && (
                    <Link
                      href="/login"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                    >
                      Log In
                    </Link>
                  )}
                  {user && profile?.role === "student" && (
                    <div className="flex gap-4 items-center">
                      <Link
                        href="/dashboard/student/my-clubs"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                      >
                        My Clubs
                      </Link>
                      <Link
                        href="/schedule"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                      >
                        Schedule
                      </Link>
                      <Link
                        href="/settings"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                      >
                        Settings
                      </Link>
                      {!hideHeaderMyAccount && (
                        <Link href="/account" className="underline text-sm">
                          My Account
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                  {user && profile?.role === "admin" && (
                    <div className="flex gap-4 items-center">
                      <Link href="/dashboard/admin" className="underline text-sm">
                        Admin Panel
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
        )}

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">

          {/* Events Overview for Logged-in Students */}
          {user && profile?.role === "student" && (
            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedEventFilter === "All Events" ? "Upcoming Events" : `${selectedEventFilter} Events`}
                </h2>
                <Link
                  href="/schedule"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </Link>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-5 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/student/my-clubs/${event.club_id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex flex-col items-center justify-center text-xs font-bold">
                          <span>{new Date(typeof event.start_time === "number" ? event.start_time * 1000 : event.start_time).toLocaleDateString("en-US", { month: "short" })}</span>
                          <span className="text-lg">{new Date(typeof event.start_time === "number" ? event.start_time * 1000 : event.start_time).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{event.name}</h3>
                          <p className="text-sm text-blue-600">{event.club_name || event.club_abbreviation}</p>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{event.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{formatEventTime(event.start_time)}</p>
                          {event.location && (
                            <p className="text-xs text-gray-500 truncate">{event.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>{selectedEventFilter === "All Events" ? "No upcoming events. Join some clubs to see their events!" : `No events from ${selectedEventFilter}.`}</p>
                </div>
              )}
            </section>
          )}

          {/* Welcome Section for Non-Logged-in Users */}
          {!user && (
            <section className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-8 text-white overflow-hidden min-h-[280px] flex flex-col justify-center">
              <div className="relative z-10">
                <h2 className="text-4xl font-bold">Welcome to StudentSpace!</h2>
                <p className="text-lg mt-2 max-w-2xl">
                  Log in to discover clubs, join events, and get involved on campus.
                </p>
              </div>
            </section>
          )}

          {/* Explore Clubs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory === "All Clubs" ? "All Clubs" : `${selectedCategory} Clubs`}
              </h2>
              <p className="text-sm text-gray-600">
                {filteredClubs.length} {filteredClubs.length === 1 ? "club" : "clubs"}
              </p>
            </div>

            {filteredClubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {filteredClubs.map((club) => {
                  const handleCardClick = () => {
                    if (profile?.role === "student") {
                      router.push(`/dashboard/student/my-clubs/${club.id}`);
                    }
                  };

                  const joined = isJoined(club.id);

                  return (
                    <div
                      key={club.id}
                      className={`bg-white rounded-lg p-5 flex flex-col border border-gray-200 hover:shadow-lg transition-shadow ${profile?.role === "student" ? "cursor-pointer" : ""}`}
                      onClick={handleCardClick}
                    >
                      <div className="mb-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {club.name}
                            {club.abbreviation && <span className="ml-2 text-gray-500 text-sm">({club.abbreviation})</span>}
                          </h3>
                          {joined && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              Joined
                            </span>
                          )}
                        </div>
                        {(club.type || club.category) && (
                          <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium inline-block mt-2">
                            {club.type || club.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex-grow line-clamp-3">{club.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No clubs found. Try a different filter or search.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}