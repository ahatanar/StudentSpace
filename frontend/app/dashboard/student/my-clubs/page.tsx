"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../AuthProvider";
import { api } from "../../../../lib/api";
import RequestClubForm from "../../../../components/RequestClubForm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function MyClubsPage() {
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMemberships();
    }
  }, [user]);

  const fetchMemberships = async () => {
    try {
      const data = await api.getMyMemberships();

      const membershipsWithDetails = await Promise.all(
        data.map(async (m: any) => {
          try {
            const club = await api.getClub(m.club_id);
            return { ...m, club };
          } catch (error) {
            return m;
          }
        })
      );

      setMemberships(membershipsWithDetails);
    } catch (error) {
      console.error("Error loading memberships:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;
  if (!user) return redirect("/login");

  return (
    <div className="flex min-h-screen bg-gray-50">
      <main className="flex-1">

        {/* Header (sidebar removed, buttons added here) */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">My Clubs</h1>

              {/* Buttons */}
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard/student"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                >
                  ← Back to Dashboard
                </Link>

                <button
                  onClick={() => setShowForm(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                >
                  Request New Club
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main page container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">

          {/* Loading */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : memberships.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                No Clubs Yet
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                You haven’t joined any clubs yet. Browse clubs or start your own.
              </p>

              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Request New Club
              </button>
            </div>
          ) : (
            <>
              {/* Section header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Clubs</h2>
                <p className="text-sm text-gray-600">{memberships.length} memberships</p>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {memberships.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/student/my-clubs/${m.club_id}`}
                    className="block"
                  >
                    <div className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-shadow">

                      <div className="flex justify-between mb-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${m.role === "president"
                            ? "bg-purple-100 text-purple-700"
                            : m.role === "executive"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {m.role.toUpperCase()}
                        </span>

                        {m.club?.status === "pending" && (
                          <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-50 text-yellow-700">
                            Pending Approval
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {m.club?.name || "Unknown Club"}
                      </h3>

                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {m.club?.description}
                      </p>

                      <div className="text-xs text-gray-500">
                        Joined {new Date(m.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Club Request Modal */}
        {showForm && (
          <RequestClubForm
            onClose={() => setShowForm(false)}
            onSuccess={() => fetchMemberships()}
          />
        )}

      </main>
    </div>
  );
}