"use client";

import { useAuth } from "../AuthProvider";
<<<<<<< HEAD
import { redirect } from "next/navigation";
=======
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import Link from "next/link";
import { useState } from "react";
>>>>>>> ab7a59b2166292ab2c021622acdfc04e398383b0

export default function DashboardRouter() {
  const { user, profile, loading } = useAuth();

  if (loading) return null;

  if (!user) return redirect("/dashboard/public");

  if (profile?.role === "student") return redirect("/dashboard/student");

  if (profile?.role === "admin") return redirect("/dashboard/admin");

  return redirect("/dashboard/public");
}
