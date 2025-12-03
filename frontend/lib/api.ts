import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "./firebase";

const API_BASE_URL = "http://localhost:8000";
import { Timestamp } from "firebase/firestore";


export interface FirestoreEvent {
  id: string;
  club_id: string;
  name: string;
  description: string;
  location: string;
  start_time: Timestamp;       // Firestore timestamp
  end_time: Timestamp | null;  // or Timestamp if you always set it
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by?: string | null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const api = {
  async getClubs(status = "active", search?: string) {
    const headers = await getAuthHeaders();
    let url = `${API_BASE_URL}/clubs?status=${status}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to fetch clubs");
    return res.json();
  },

  async getClub(id: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${id}`, { headers });
    if (!res.ok) throw new Error("Failed to fetch club");
    return res.json();
  },

  async createClub(data: any) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create club");
    return res.json();
  },

  async joinClub(clubId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}/join`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to join club");
    return res.json();
  },

  async getMyProfile() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/users/me`, { headers });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  async getMyMemberships() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/users/me/memberships`, {
      headers,
    });
    if (!res.ok) throw new Error("Failed to fetch memberships");
    return res.json();
  },

  async getMyMembershipForClub(clubId: string) {
    const memberships = await this.getMyMemberships();
    return memberships.find((m: any) => m.club_id === clubId) || null;
  },

  async getClubTypes() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/club-types`, { headers });
    if (!res.ok) throw new Error("Failed to fetch club types");
    return res.json();
  },

  async updateClubStatus(clubId: string, status: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE_URL}/clubs/${clubId}/status?status=${status}`,
      {
        method: "PUT",
        headers,
      }
    );
    if (!res.ok) throw new Error("Failed to update club status");
    return res.json();
  },

  async deleteClub(clubId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Failed to delete club");
    return res.json();
  },

  // --- CREATE EVENT ---
  async createEvent(eventData: any) {
    const docRef = await addDoc(collection(db, "events"), {
      ...eventData,
      created_by: auth.currentUser?.uid ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { id: docRef.id };
  },

  // --- READ EVENTS BY CLUB ---
  async getEventsByClub(clubId: string) {
    const q = query(collection(db, "events"), where("club_id", "==", clubId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  },

  // --- READ SINGLE EVENT ---
  async getEvent(eventId: string): Promise<FirestoreEvent | null> {
    const docRef = doc(db, "events", eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() as Omit<FirestoreEvent, "id">;
    return { id: snap.id, ...data };
  },


  // --- UPDATE EVENT ---
  async updateEvent(eventId: string, updates: any) {
    const docRef = doc(db, "events", eventId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date(),
    });
  },

  // --- DELETE EVENT ---
  async deleteEvent(eventId: string) {
    const docRef = doc(db, "events", eventId);
    await deleteDoc(docRef);
  },
};
