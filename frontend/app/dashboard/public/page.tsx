"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "firebase/firestore";
import { useAuth } from "../../AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";

interface PublicDashboardProps {
  hideHeader?: boolean;
}

export default function PublicDashboard({ hideHeader }: PublicDashboardProps) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const { user, profile } = useAuth();
  const router = useRouter();

  async function load() {
    try {
      const clubsData = await api.getClubs();
      setClubs(clubsData);
    } catch (e) {
      console.error("Failed to load clubs", e);
    }

    // Events not implemented in API yet
    setEvents([]);
  }

  useEffect(() => {
    load();
  }, []);

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
        // Force re-render if needed, but profile is from context so we might need to reload or just alert
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
    <div className="min-h-screen p-6 bg-slate-50 dark:bg-slate-950">
      {!hideHeader && (
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">Campus Activities</h1>

          {!user && (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Log In
            </Link>
          )}

          {user && profile?.role === "student" && (
            <div className="flex gap-4 items-center">
              <Link href="/my-clubs" className="underline text-sm">
                My Clubs
              </Link>
              <Link href="/account" className="underline text-sm">
                My Account
              </Link>

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
        </header>
      )}



      <section>
        <h2 className="text-2xl font-bold mb-4">Clubs</h2>

        <div className="grid gap-4">
          {clubs.map((club) => {
            const isJoined =
              profile?.role === "student" &&
              profile.joinedClubs?.includes(club.id);

            return (
              <div
                key={club.id}
                className="p-4 bg-white dark:bg-slate-900 border rounded-lg flex justify-between"
              >
                <div>
                  <h3 className="font-semibold">
                    {club.name}
                    {club.abbreviation && <span className="ml-2 text-slate-500 text-sm">({club.abbreviation})</span>}
                  </h3>
                  <p className="text-sm text-slate-600">{club.description}</p>
                  <p className="text-xs text-slate-500">{club.category}</p>
                </div>
                {profile?.role === "student" && (
                  <button
                    onClick={() => joinClub(club.id, club)}
                    className={`px-3 py-1 rounded-md text-sm font-semibold ${profile.joinedClubs?.includes(club.id)
                      ? "bg-gray-400 text-white cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    disabled={profile.joinedClubs?.includes(club.id)}
                  >
                    {profile.joinedClubs?.includes(club.id) ? "Joined" : "Join"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
