"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { api } from "../lib/api";

interface Profile {
    id: string;
    email: string;
    name: string;
    role: "student" | "admin";
    joinedClubs?: string[];
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
});


export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                try {
                    // Fetch user profile from backend (creates user if not exists)
                    const userProfileData = await api.getMyProfile();

                    // Fetch memberships
                    const memberships = await api.getMyMemberships();
                    const joinedClubIds = memberships.map((m: any) => m.club_id);

                    const userProfile: Profile = {
                        id: userProfileData.uid,
                        name: userProfileData.display_name,
                        email: userProfileData.email,
                        role: userProfileData.is_admin ? "admin" : "student",
                        joinedClubs: joinedClubIds,
                    };

                    setProfile(userProfile);
                } catch (error) {
                    console.error("Error fetching profile:", error);
                    setProfile(null);
                }

            } else {
                setUser(null);
                setProfile(null);
            }

            setLoading(false);
        });
    }, []);

    return (
        <AuthContext.Provider value={{ user, profile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);