"use client";

import { useAuth } from "../AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRouter() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/dashboard/public");
            return;
        }

        if (profile?.role === "student") {
            router.push("/dashboard/student");
            return;
        }

        if (profile?.role === "admin") {
            router.push("/dashboard/admin");
            return;
        }

        router.push("/dashboard/public");
    }, [user, profile, loading, router]);

    return null;
}
