"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../backend/lib/firebase";

export default function GoogleLoginButton() {
    async function login() {
        await signInWithPopup(auth, googleProvider);
    }

    return (
        <button
            onClick={login}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
            Sign in with Google
        </button>
    );
}