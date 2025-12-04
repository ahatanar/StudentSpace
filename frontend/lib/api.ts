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

  async leaveClub(clubId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}/leave`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to leave club");
    return res.json();
  },

  async getClubMembers(clubId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}/members`, {
      headers,
    });
    if (!res.ok) throw new Error("Failed to fetch club members");
    return res.json();
  },

  async updateMemberRole(clubId: string, userId: string, role: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}/members/${userId}/role?role=${role}`, {
      method: "PUT",
      headers,
    });
    if (!res.ok) throw new Error("Failed to update member role");
    return res.json();
  },

  async deleteClubAsPresident(clubId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}/president`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Failed to delete club");
    return res.json();
  },

  async updateClub(clubId: string, updates: { name?: string; abbreviation?: string; type?: string; description?: string }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (updates.name) params.append("name", updates.name);
    if (updates.abbreviation !== undefined) params.append("abbreviation", updates.abbreviation);
    if (updates.type) params.append("club_type", updates.type);
    if (updates.description !== undefined) params.append("description", updates.description);

    const res = await fetch(`${API_BASE_URL}/clubs/${clubId}?${params.toString()}`, {
      method: "PUT",
      headers,
    });
    if (!res.ok) throw new Error("Failed to update club");
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

  async checkIsExecutive(): Promise<{ is_executive: boolean }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/users/me/is-executive`, { headers });
    if (!res.ok) {
      // If not authenticated or error, return false
      return { is_executive: false };
    }
    return res.json();
  },

  async getEvents(startDate?: string, endDate?: string, clubId?: string) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (clubId) params.append('club_id', clubId);

    const url = `${API_BASE_URL}/events${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },

  // Calendar Integration
  async getCalendarStatus() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/calendar/status`, { headers });
    if (!res.ok) throw new Error("Failed to get calendar status");
    return res.json();
  },

  async disconnectCalendar() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/api/calendar/disconnect`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to disconnect calendar");
    return res.json();
  },

  // Event CRUD
  async createEvent(event: {
    club_id: string;
    name: string;
    start_time: string;
    end_time?: string;
    description?: string;
    location?: string;
  }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    params.append("club_id", event.club_id);
    params.append("name", event.name);
    params.append("start_time", event.start_time);
    if (event.end_time) params.append("end_time", event.end_time);
    if (event.description) params.append("description", event.description);
    if (event.location) params.append("location", event.location);

    const res = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to create event");
    return res.json();
  },

  async updateEvent(eventId: string, updates: {
    name?: string;
    start_time?: string;
    end_time?: string;
    description?: string;
    location?: string;
  }) {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (updates.name) params.append("name", updates.name);
    if (updates.start_time) params.append("start_time", updates.start_time);
    if (updates.end_time) params.append("end_time", updates.end_time);
    if (updates.description !== undefined) params.append("description", updates.description);
    if (updates.location !== undefined) params.append("location", updates.location);

    const res = await fetch(`${API_BASE_URL}/events/${eventId}?${params.toString()}`, {
      method: "PUT",
      headers,
    });
    if (!res.ok) throw new Error("Failed to update event");
    return res.json();
  },

  async deleteEvent(eventId: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) throw new Error("Failed to delete event");
    return res.json();
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
};
