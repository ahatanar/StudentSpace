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
      // Fetch club details for each membership to get names
      const membershipsWithDetails = await Promise.all(
        data.map(async (m: any) => {
          try {
            const club = await api.getClub(m.club_id);
            return { ...m, club };
          } catch (e) {
            return m;
          }
        })
      );
      setMemberships(membershipsWithDetails);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;
  if (!user) return redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/dashboard/student" className="text-indigo-600 hover:underline">
                ← Back to Dashboard
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My Clubs</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your memberships and club requests</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
          >
            <span className="text-xl">+</span> Request New Club
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : memberships.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Clubs Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              You haven't joined any clubs yet. Browse available clubs or request to start your own!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map((m) => (
              <div key={m.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.role === 'president' ? 'bg-purple-100 text-purple-700' :
                      m.role === 'executive' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                    }`}>
                    {m.role.toUpperCase()}
                  </span>
                  {m.club?.status === 'pending' && (
                    <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded ml-2">
                      Pending Approval
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {m.club?.name || 'Unknown Club'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">
                  {m.club?.description}
                </p>
                <div className="text-xs text-gray-500">
                  Joined {new Date(m.joined_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && (
          <RequestClubForm
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              fetchMemberships();
            }}
          />
        )}
      </div>
    </div>
  );
}
