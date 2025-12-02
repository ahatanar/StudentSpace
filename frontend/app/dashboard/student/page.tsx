"use client";

import { useAuth } from "../../AuthProvider";
import { redirect } from "next/navigation";
import PublicDashboard from "../public/page";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (loading) return null;

  if (isLoggingOut) return null;

  if (!user) return redirect("/dashboard/public");

  if (profile?.role !== "student") return redirect("/dashboard");

  async function handleLogout() {
    setIsLoggingOut(true); 
    await signOut(auth);
    router.push("/dashboard/public");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-slate-900/80 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">StudentSpace</h1>

        <div className="flex gap-4 items-center">
          <Link href="/dashboard/student/my-clubs" className="underline">My Clubs</Link>
          <Link href="/account" className="underline">My Account</Link>

          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>
      <PublicDashboard hideHeader={true} />
    </div>
  );
}
