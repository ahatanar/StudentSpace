import { auth } from "./firebase";

const API_BASE_URL = "http://localhost:8000";

async function getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser;
    if (!user) return {};
    const token = await user.getIdToken();
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

export const api = {
    async getClubs(status = "active") {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_BASE_URL}/clubs?status=${status}`, { headers });
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
        const res = await fetch(`${API_BASE_URL}/users/me/memberships`, { headers });
        if (!res.ok) throw new Error("Failed to fetch memberships");
        return res.json();
    },
};
