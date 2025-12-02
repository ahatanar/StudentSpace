"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../AuthProvider";
import { redirect } from "next/navigation";
import { db } from "../../../../lib/firebase";
import {
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import Link from "next/link";
import { api } from "../../../../lib/api";

export default function MyClubsPage() {
  const { user, profile, loading } = useAuth();
  const [clubDetails, setClubDetails] = useState<any[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  if (loading) return null;
  if (!user) return redirect("/login");
  if (profile?.role !== "student") return redirect("/dashboard");

  async function loadClubs() {
    if (!profile?.joinedClubs) {
      setLoadingClubs(false);
      return;
    }

    try {
      const promises = profile.joinedClubs.map(id => api.getClub(id).catch(e => null));
      const results = await Promise.all(promises);

      const validClubs = results.filter(c => c !== null).map((c: any) => ({
        ...c,
        category: c.type // Map type to category
      }));

      setClubDetails(validClubs);
    } catch (e) {
      console.error("Failed to load clubs", e);
    }

    setLoadingClubs(false);
  }

  async function leaveClub(clubId: string) {
    // Leave club not supported by API yet
    alert("Leaving clubs is not supported in this version yet.");
  }

  useEffect(() => {
    loadClubs();
  }, [profile?.joinedClubs]);

  return (
    <div className="min-h-screen p-6 bg-slate-50 dark:bg-slate-950">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">My Clubs</h1>

        <Link
          href="/dashboard/student"
          className="underline text-slate-600 dark:text-slate-300"
        >
          Back to Dashboard
        </Link>
      </header>

      {loadingClubs && <p>Loading your clubs...</p>}

      {!loadingClubs && clubDetails.length === 0 && (
        <p className="text-slate-500">You haven't joined any clubs yet.</p>
      )}

      <div className="grid gap-4">
        {clubDetails.map((club) => (
          <div
            key={club.id}
            className="p-4 bg-white dark:bg-slate-900 border rounded-lg flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-lg">{club.name}</h3>
              <p className="text-sm text-slate-600">{club.description}</p>
              <p className="text-xs text-slate-500">{club.category}</p>
            </div>

            <button
              onClick={() => leaveClub(club.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
            >
              Leave Club
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
