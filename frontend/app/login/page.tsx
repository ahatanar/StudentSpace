"use client";

import { useAuth } from "../AuthProvider";
import { redirect } from "next/navigation";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import styles from "./login.module.css";

export default function LoginPage() {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (user) return redirect("/dashboard");

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>StudentSpace</h1>
                <p className={styles.subtitle}>Campus Heatmap & Visualization</p>

                <p className={styles.info}>
                    Please sign in with your school Google account to continue.
                </p>

                <GoogleLoginButton />
            </div>
        </div>
    );
}
