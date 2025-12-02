"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../AuthProvider";
import { db } from "../../../../lib/firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { api } from "../../../../lib/api";

export default function ManageClubsPage() {
  const { profile, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [clubs, setClubs] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null); // TRACK EDIT CLUB

  async function fetchClubs() {
    try {
      const clubsData = await api.getClubs("active"); // or "all" if backend supports it? Backend default is active.
      // Backend returns "type", frontend uses "category". Map it.
      setClubs(clubsData.map((c: any) => ({ ...c, category: c.type })));
    } catch (e) {
      console.error("Failed to fetch clubs", e);
    }
  }

  useEffect(() => {
    fetchClubs();
  }, []);


  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!profile) return;

    try {
      if (editId) {
        // Update not supported by API yet, falling back to Firestore
        await updateDoc(doc(db, "clubs", editId), {
          name,
          description,
          type: category, // Update type as well
          category, // Keep category for legacy if needed
          updatedAt: serverTimestamp(),
        });
        // Legacy user record update
        await setDoc(
          doc(db, "users", profile.id, "createdClubs", editId),
          {
            name,
            description,
            category,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

      } else {
        // Create using API
        await api.createClub({
          name,
          description,
          type: category,
        });
        // No need to update user record manually, backend handles membership
      }

      resetForm();
      fetchClubs();
    } catch (e) {
      console.error("Operation failed", e);
      alert("Operation failed");
    }
  }
  async function startEdit(id: string) {
    setEditId(id);

    // We can use api.getClub(id) here
    try {
      const data = await api.getClub(id);
      setName(data.name);
      setDescription(data.description);
      setCategory(data.type || "Academic");
    } catch (e) {
      console.error("Failed to fetch club details", e);
    }
  }
  async function deleteClub(id: string) {
    // Delete not supported by API yet
    await deleteDoc(doc(db, "clubs", id));
    await deleteDoc(doc(db, "users", profile?.id || "", "createdClubs", id));
    fetchClubs();
  }

  function resetForm() {
    setEditId(null);
    setName("");
    setDescription("");
    setCategory("Academic");
  }

  if (loading) return null;

  if (profile?.role !== "admin") {
    return <div className="p-10 text-red-500">Access denied.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Clubs</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-700 max-w-md"
      >
        <h2 className="text-xl font-semibold mb-4">
          {editId ? "Update Club" : "Add New Club"}
        </h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Club Name"
          required
          className="w-full p-2 mb-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Club Description"
          required
          className="w-full p-2 mb-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 mb-3 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
        >
          <option>Academic</option>
          <option>Sports</option>
          <option>Arts</option>
          <option>Social</option>
        </select>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
          >
            {editId ? "Save Changes" : "Create Club"}
          </button>

          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-gray-400 text-white font-semibold py-2 rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="text-2xl font-bold mt-10 mb-4">Existing Clubs</h2>

      <div className="space-y-3">
        {clubs.length === 0 && (
          <p className="text-slate-500">No clubs added yet.</p>
        )}

        {clubs.map((club) => (
          <div
            key={club.id}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between"
          >
            <div>
              <h3 className="font-bold">{club.name}</h3>
              <p className="text-sm text-slate-600">{club.description}</p>
              <p className="text-xs text-slate-400">{club.category}</p>
            </div>

            <div className="flex gap-3 items-center">
              <button
                onClick={() => startEdit(club.id)}
                className="text-blue-600 hover:underline"
              >
                Edit
              </button>

              <button
                onClick={() => deleteClub(club.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
