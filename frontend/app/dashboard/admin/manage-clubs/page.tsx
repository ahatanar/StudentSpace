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
      fetchClubs(); // Refresh list
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
    } catch (e) {
      console.error(e);
      alert("Failed to delete club");
    }
  };

  if (authLoading) return null;
  if (!user || profile?.role !== "admin") return redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/dashboard/admin" className="text-indigo-600 hover:underline">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Manage Clubs</h1>
            <p className="text-gray-600 dark:text-gray-400">Approve new requests and manage existing clubs</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-1 rounded-xl shadow-sm inline-flex">
          {(["pending", "active", "suspended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${filter === s
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : clubs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No {filter} clubs</h3>
            <p className="text-gray-500 dark:text-gray-400">
              There are currently no clubs with {filter} status.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {clubs.map((club) => (
              <div key={club.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {club.name}
                      {club.abbreviation && <span className="ml-2 text-gray-500 text-lg">({club.abbreviation})</span>}
                    </h3>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                      {club.type}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {club.description}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Created: {new Date(club.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>ID: {club.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {filter === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(club.id, "active")}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(club.id, "suspended")} // Using suspended as reject for now
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {filter === "active" && (
                    <button
                      onClick={() => handleStatusUpdate(club.id, "suspended")}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors shadow-sm"
                    >
                      Suspend
                    </button>
                  )}

                  {filter === "suspended" && (
                    <button
                      onClick={() => handleStatusUpdate(club.id, "active")}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm"
                    >
                      Reactivate
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(club.id)}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors shadow-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
