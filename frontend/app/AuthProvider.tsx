"use client";

<<<<<<< HEAD
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, collection, getDocs, } from "firebase/firestore";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: "student" | "admin";
  joinedClubs?: string[];
}
=======
import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
>>>>>>> ab7a59b2166292ab2c021622acdfc04e398383b0

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

        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        let userProfile: Profile;

        // Create user doc if missing
        if (!snap.exists()) {
          await setDoc(userRef, {
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            role: "student",
          });

          userProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            role: "student",
            joinedClubs: [],
          };
        } else {
          userProfile = {
            id: snap.id,
            ...(snap.data() as any),
            joinedClubs: [],
          };
        }

        // Load joined clubs from subcollection
        const joinedSnap = await getDocs(
          collection(db, "users", firebaseUser.uid, "joinedClubs")
        );

        const joinedIds = joinedSnap.docs.map((d) => d.id);
        userProfile.joinedClubs = joinedIds;

        setProfile(userProfile);

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