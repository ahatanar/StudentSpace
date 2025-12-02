"use client";

import { useAuth } from "../AuthProvider";
import { redirect } from "next/navigation";

export default function DashboardRouter() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return redirect("/dashboard/public");

  if (profile?.role === "student") return redirect("/dashboard/student");

  if (profile?.role === "admin") return redirect("/dashboard/admin");

  return redirect("/dashboard/public");
}
