"use client";

import { useAuth } from "../AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import { useState } from "react";

// Type definitions for backend data
interface Club {
    id: string;
    name: string;
    category: "Academic" | "Sports" | "Arts" | "Social";
    description: string;
}

interface Event {
    id: string;
    title: string;
    clubId: string;
    date: string;
    description: string;
    featured: boolean;
}

export default function Dashboard() {
    const { user, loading } = useAuth();

    // State for data (to be populated from backend)
    const [clubs, setClubs] = useState<Club[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All Clubs");
    const [selectedTimeFilter, setSelectedTimeFilter] = useState<string>("This Week");
    const [searchQuery, setSearchQuery] = useState<string>("");

    if (loading) return null;

    async function handleLogout() {
        await signOut(auth);
    }

    // TODO: Add function to fetch clubs from backend
    // async function fetchClubs() {
    //   const response = await fetch('/api/clubs');
    //   const data = await response.json();
    //   setClubs(data);
    // }

    // TODO: Add function to fetch events from backend
    // async function fetchEvents() {
    //   const response = await fetch('/api/events');
    //   const data = await response.json();
    //   setEvents(data);
    // }

    // Function to handle category filter selection
    function handleCategorySelect(category: string) {
        setSelectedCategory(category);
        // TODO: Filter clubs based on category
    }

    // Function to handle time filter selection
    function handleTimeFilterSelect(filter: string) {
        setSelectedTimeFilter(filter);
        // TODO: Filter events based on time range
    }

    // Function to handle search
    function handleSearch(query: string) {
        setSearchQuery(query);
        // TODO: Search clubs and events
    }

    // Get featured events
    const featuredEvents = events.filter(event => event.featured);

    // Get upcoming events (filtered by time)
    const upcomingEvents = events; // TODO: Add time-based filtering

    const categories = ["All Clubs", "Academic", "Sports", "Arts", "Social"];
    const timeFilters = ["This Week", "This Month", "All"];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 flex items-center justify-between bg-white dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 px-6 py-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-blue-600" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">StudentSpace</h2>
                </div>

                {/* Search Bar */}
                <div className="hidden sm:flex flex-1 px-8 max-w-xl">
                    <input
                        type="text"
                        placeholder="Search clubs or events..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full h-10 rounded-lg px-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>

                {/* User Area - My Clubs Button */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <>
                            <Link
                                href="/my-clubs"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                            >
                                My Clubs
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition font-semibold"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Log In
                        </Link>
                    )}
                </div>
            </header>

            {/* Main Grid Layout */}
            <main className="grid grid-cols-12 gap-6 p-6 flex-1">
                {/* LEFT SIDEBAR - Category Filters */}
                <aside className="col-span-12 md:col-span-3">
                    <div className="sticky top-24 p-4 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
                        <h3 className="font-medium text-slate-900 dark:text-white">Filter & Sort</h3>
                        <p className="text-sm text-slate-500 mb-3">Find your community</p>

                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => handleCategorySelect(category)}
                                className={
                                    selectedCategory === category
                                        ? "w-full text-left px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        : "w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                                }
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* MAIN CONTENT - Welcome & Featured Events */}
                <section className="col-span-12 md:col-span-6 space-y-6">
                    {/* Welcome Section */}
                    <div className="p-4">
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3">
                            Welcome to StudentSpace!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Discover clubs, join events, and get involved on campus.
                        </p>
                    </div>

                    {/* Featured Events Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 px-4">
                            Featured Events
                        </h2>

                        <div className="px-4">
                            {featuredEvents.length > 0 ? (
                                <div className="grid gap-4">
                                    {featuredEvents.map((event) => (
                                        <div
                                            key={event.id}
                                            className="p-4 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
                                        >
                                            <h3 className="font-bold text-slate-900 dark:text-white">{event.title}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{event.description}</p>
                                            <p className="text-xs text-slate-500 mt-2">{event.date}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                                    <div className="w-14 h-14 rounded-md bg-slate-200 dark:bg-slate-700 mb-3" />
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">No featured events</p>
                                    <p className="text-slate-500 dark:text-slate-600 text-sm">Check back soon</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* RIGHT SIDEBAR - Upcoming Events */}
                <aside className="col-span-12 md:col-span-3">
                    <div className="sticky top-24 p-4 rounded-lg bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                        <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                            Upcoming Events
                        </h3>

                        {/* Time Filter Buttons */}
                        <div className="flex gap-2 mb-6">
                            {timeFilters.map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => handleTimeFilterSelect(filter)}
                                    className={
                                        selectedTimeFilter === filter
                                            ? "flex-1 text-sm font-semibold py-2 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                            : "flex-1 text-sm font-semibold py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
                                    }
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        {/* Upcoming Events List */}
                        {upcomingEvents.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                                    >
                                        <h4 className="font-medium text-sm text-slate-900 dark:text-white">{event.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{event.date}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-12 h-12 rounded-md bg-slate-200 dark:bg-slate-700 mb-3" />
                                <p className="text-sm text-slate-600 dark:text-slate-400">No upcoming events</p>
                            </div>
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}