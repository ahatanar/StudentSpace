"use client";

import { useAuth } from "../../AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PublicDashboard from "../public/page";

export default function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/dashboard/public");
      return;
    }

    if (profile?.role !== "student") {
      router.push("/dashboard");
      return;
    }
  }, [user, profile, loading, router]);

  if (loading || !user || profile?.role !== "student") {
    return null;
  }

  return (
    <PublicDashboard
      hideSidebarUserLinks={true}
      hideHeaderMyAccount={true}
    />
  );
}
