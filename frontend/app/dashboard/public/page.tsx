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
  const [selectedCategory, setSelectedCategory] = useState<string>("All Clubs");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function loadClubs() {
      try {
        const clubsData = await api.getClubs();
        setClubs(clubsData);
      } catch (e) {
        console.error("Failed to load clubs", e);
      }
    }
    loadClubs();
  }, []);

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

  const filteredClubs = clubs.filter((club) => {
    const clubType = club.type || club.category;
    const matchesCategory = selectedCategory === "All Clubs" || clubType === selectedCategory;
    const matchesSearch =
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.description && club.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const currentEvent = featuredEvents[currentEventIndex];

  async function handleLogout() {
    await signOut(auth);
    router.push("/dashboard/public");
  }

  async function joinClub(clubId: string, clubData: any) {
    if (!user || profile?.role !== "student") return;

    try {
      await api.joinClub(clubId);

      // Update local profile state
      if (profile && profile.joinedClubs) {
        profile.joinedClubs.push(clubId);
      }

      alert("Joined club!");
      // Reload to refresh UI state properly
      window.location.reload();
    } catch (e) {
      console.error("Failed to join club", e);
      alert("Failed to join club");
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {!hideHeader && !hideSidebar && (
        <aside className="w-64 flex-shrink-0 bg-white p-6 hidden lg:flex flex-col border-r border-gray-200">
          <div className="mb-10">
            <span className="text-2xl font-bold text-gray-900">StudentSpace</span>
          </div>

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
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition"
                      >
                        Schedule
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
          {/* Featured Event */}
          {currentEvent && (
            <section className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-8 text-white overflow-hidden min-h-[320px] flex flex-col justify-end">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative z-10">
                <span className="text-sm font-semibold bg-white/20 px-3 py-1 rounded-full">
                  Featured Event
                </span>
                <h2 className="text-4xl font-bold mt-4">{currentEvent.title}</h2>
                <p className="text-lg mt-2 max-w-2xl">{currentEvent.description}</p>
                <div className="mt-6 flex items-center gap-4">
                  <Link
                    href="/login"
                    className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-gray-100 transition"
                  >
                    Log In to Learn More
                  </Link>
                  {featuredEvents.length > 1 && (
                    <div className="flex gap-2">
                      {featuredEvents.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentEventIndex(idx)}
                          className={`w-2 h-2 rounded-full transition ${idx === currentEventIndex ? "bg-white" : "bg-white/40"
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Welcome Section */}
          {!currentEvent && (
            <section className="relative bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-8 text-white overflow-hidden min-h-[280px] flex flex-col justify-center">
              <div className="relative z-10">
                <h2 className="text-4xl font-bold">Welcome to StudentSpace!</h2>
                <p className="text-lg mt-2 max-w-2xl">
                  Discover clubs, join events, and get involved on campus.
                </p>
                <div className="mt-6">
                </div>
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
                  const isJoined =
                    profile?.role === "student" &&
                    profile.joinedClubs?.includes(club.id);

                  return (
                    <div
                      key={club.id}
                      className="bg-white rounded-lg p-5 flex flex-col border border-gray-200 hover:shadow-lg transition-shadow"
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                          {club.name}
                          {club.abbreviation && <span className="ml-2 text-gray-500 text-sm">({club.abbreviation})</span>}
                        </h3>
                        {(club.type || club.category) && (
                          <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">
                            {club.type || club.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 flex-grow mb-5">{club.description}</p>

                      {profile?.role === "student" ? (
                        <button
                          onClick={() => joinClub(club.id, club)}
                          className={`w-full font-semibold py-2.5 rounded-lg transition text-center ${isJoined
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                          disabled={isJoined}
                        >
                          {isJoined ? "Joined" : "Join Club"}
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition text-center block"
                        >
                          Log In to Join
                        </Link>
                      )}
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