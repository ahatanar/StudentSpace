"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../AuthProvider";
import { api } from "../../../../lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function ManageClubsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "active" | "suspended">("pending");

  useEffect(() => {
    if (user && profile?.role === "admin") {
      fetchClubs();
    }
  }, [user, profile, filter]);

  const fetchClubs = async () => {
    setLoading(true);
    try {
      const data = await api.getClubs(filter);
      setClubs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (clubId: string, status: string) => {
    if (!confirm(`Are you sure you want to mark this club as ${status}?`)) return;

    try {
      await api.updateClubStatus(clubId, status);
      fetchClubs();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update club status");
    }
  };

  const handleDelete = async (clubId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this club? This cannot be undone.")) return;

    try {
      await api.deleteClub(clubId);
      fetchClubs();
    } catch (error) {
      console.error(error);
      alert("Failed to delete club");
    }
  };

  if (authLoading) return null;
  if (!user || profile?.role !== "admin") return redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* Main content */}
      <main className="flex-1">

        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-white/80 border-b backdrop-blur-sm">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <h1 className="text-3xl font-bold text-gray-900">Manage Clubs</h1>

              <Link
                href="/dashboard/admin"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Page container */}
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          <p className="text-gray-600">
            Approve new clubs, review activity, and manage suspended organizations.
          </p>

          {/* Filter Tabs */}
          <div className="bg-white p-2 rounded-xl shadow-sm border flex gap-2 w-fit">
            {(["pending", "active", "suspended"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-6 py-2 rounded-lg font-medium transition
                ${filter === s
                    ? "bg-indigo-600 text-white shadow"
                    : "text-gray-700 hover:bg-gray-100"
                  }`}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-indigo-600"></div>
            </div>
          ) : clubs.length === 0 ? (
            /* Empty state */
            <div className="bg-white border rounded-xl shadow-sm py-20 text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No {filter} clubs</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are currently no clubs with {filter} status.
              </p>
            </div>
          ) : (
            /* Clubs list */
            <div className="grid gap-4">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row justify-between gap-6"
                >
                  {/* Left side */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        {club.name}
                        {club.abbreviation && (
                          <span className="ml-2 text-gray-500">({club.abbreviation})</span>
                        )}
                      </h3>
                      {club.type && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                          {club.type}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 mb-4">{club.description}</p>

                    <div className="text-sm text-gray-500 flex gap-4">
                      <span>Created: {new Date(club.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>ID: {club.id}</span>
                    </div>
                  </div>

                  {/* Right side buttons */}
                  <div className="flex flex-wrap items-center gap-3">

                    {filter === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(club.id, "active")}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => handleStatusUpdate(club.id, "suspended")}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {filter === "active" && (
                      <button
                        onClick={() => handleStatusUpdate(club.id, "suspended")}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition shadow-sm"
                      >
                        Suspend
                      </button>
                    )}

                    {filter === "suspended" && (
                      <button
                        onClick={() => handleStatusUpdate(club.id, "active")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
                      >
                        Reactivate
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(club.id)}
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-sm"
                    >
                      Delete
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}