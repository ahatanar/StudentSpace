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

export default function ManageClubsPage() {
  const { profile, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [clubs, setClubs] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null); // TRACK EDIT CLUB

  async function fetchClubs() {
    const snap = await getDocs(collection(db, "clubs"));
    setClubs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }

  useEffect(() => {
    fetchClubs();
  }, []);

  
  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!profile) return;

    if (editId) {
  
      await updateDoc(doc(db, "clubs", editId), {
        name,
        description,
        category,
        updatedAt: serverTimestamp(),
      });
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
      const clubRef = await addDoc(collection(db, "clubs"), {
        name,
        description,
        category,
        createdBy: profile.id,
        createdAt: serverTimestamp(),
      });

      await setDoc(
        doc(db, "users", profile.id, "createdClubs", clubRef.id),
        {
          name,
          description,
          category,
          createdAt: serverTimestamp(),
        }
      );
    }

    resetForm();
    fetchClubs();
  }
  async function startEdit(id: string) {
    setEditId(id);

    const ref = doc(db, "clubs", id);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data: any = snap.data();
      setName(data.name);
      setDescription(data.description);
      setCategory(data.category);
    }
  }
  async function deleteClub(id: string) {
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
