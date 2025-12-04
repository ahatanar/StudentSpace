"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { api } from "../../../../../../lib/api";

type Member = {
    user_id: string;
    display_name: string;
    email: string;
    role: string;
};

type Club = {
    id: string;
    name?: string;
    abbreviation?: string;
    type?: string;
    description?: string;
};

const CLUB_TYPES = ["Cultural", "Religious", "Sports", "Technology", "Academic", "Arts", "Social", "Other"];

export default function ClubSettingsPage() {
    const { clubId } = useParams();
    const router = useRouter();

    const [club, setClub] = useState<Club | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [savingDetails, setSavingDetails] = useState(false);

    // Form state for club details
    const [clubName, setClubName] = useState("");
    const [clubAbbreviation, setClubAbbreviation] = useState("");
    const [clubType, setClubType] = useState("");
    const [clubDescription, setClubDescription] = useState("");

    async function load() {
        if (!clubId) return;
        setLoading(true);
        try {
            const [clubData, clubMembers] = await Promise.all([
                api.getClub(clubId as string).catch(() => null),
                api.getClubMembers(clubId as string).catch(() => []),
            ]);
            setClub(clubData);
            setMembers(Array.isArray(clubMembers) ? clubMembers : []);

            // Initialize form with existing data
            if (clubData) {
                setClubName(clubData.name || "");
                setClubAbbreviation(clubData.abbreviation || "");
                setClubType(clubData.type || "");
                setClubDescription(clubData.description || "");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [clubId]);

    async function handleSaveDetails() {
        setSavingDetails(true);
        try {
            await api.updateClub(clubId as string, {
                name: clubName,
                abbreviation: clubAbbreviation,
                type: clubType,
                description: clubDescription,
            });
            alert("Club details updated successfully!");
            // Update local club state
            setClub((prev) => prev ? { ...prev, name: clubName, abbreviation: clubAbbreviation, type: clubType, description: clubDescription } : null);
        } catch (e) {
            console.error("Failed to update club", e);
            alert("Failed to update club details. Please try again.");
        } finally {
            setSavingDetails(false);
        }
    }

    async function handleRoleChange(userId: string, newRole: string) {
        setUpdating(userId);
        try {
            await api.updateMemberRole(clubId as string, userId, newRole);
            const clubMembers = await api.getClubMembers(clubId as string);
            setMembers(Array.isArray(clubMembers) ? clubMembers : []);
        } catch (e) {
            console.error("Failed to update role", e);
            alert("Failed to update role. Please try again.");
        } finally {
            setUpdating(null);
        }
    }

    async function handleDeleteClub() {
        if (!confirm("Are you sure you want to delete this club? This action cannot be undone.")) return;
        if (!confirm("This will permanently delete all events and memberships. Are you absolutely sure?")) return;

        setDeleting(true);
        try {
            await api.deleteClubAsPresident(clubId as string);
            alert("Club deleted successfully.");
            router.push("/dashboard/student/my-clubs");
        } catch (e) {
            console.error("Failed to delete club", e);
            alert("Failed to delete club. Please try again.");
        } finally {
            setDeleting(false);
        }
    }

    const manageableMembers = members.filter((m) => m.role !== "president");
    const president = members.find((m) => m.role === "president");

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen text-lg text-gray-600">
                Loading settings...
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <main className="flex-1">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
                    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-20">
                            <div className="flex flex-col">
                                <h1 className="text-3xl font-bold text-gray-900">Club Settings</h1>
                                <p className="text-sm text-gray-500">{club?.name}</p>
                            </div>

                            <Link
                                href={`/dashboard/student/my-clubs/${clubId}`}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                            >
                                ← Back to Club
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="p-4 sm:p-6 lg:p-8 max-w-screen-lg mx-auto space-y-8">

                    {/* Club Details Section */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Club Details</h2>
                        <p className="text-gray-600 mb-6">
                            Update your club&apos;s name, abbreviation, category, and description.
                        </p>

                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Club Name *</label>
                                <input
                                    type="text"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                                    placeholder="Enter club name"
                                />
                            </div>

                            {/* Abbreviation */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation</label>
                                <input
                                    type="text"
                                    value={clubAbbreviation}
                                    onChange={(e) => setClubAbbreviation(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                                    placeholder="e.g., CSC, MSA, QCETS"
                                />
                            </div>

                            {/* Type/Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={clubType}
                                    onChange={(e) => setClubType(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white text-gray-900"
                                >
                                    <option value="">Select a category</option>
                                    {CLUB_TYPES.map((type) => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={clubDescription}
                                    onChange={(e) => setClubDescription(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none text-gray-900"
                                    placeholder="Describe what your club is about..."
                                />
                            </div>

                            {/* Save Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleSaveDetails}
                                    disabled={savingDetails || !clubName.trim()}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {savingDetails ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* President Info */}
                    {president && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-blue-500 to-indigo-600" />
                            <div className="pl-4">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Club President</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                                        {president.display_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{president.display_name}</p>
                                        <p className="text-sm text-gray-500">{president.email}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Manage Members */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Manage Members</h2>
                        <p className="text-gray-600 mb-6">
                            Promote members to executives or demote executives to regular members.
                            Executives can create, edit, and delete events.
                        </p>

                        {manageableMembers.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                                <p className="text-gray-500">No other members to manage yet.</p>
                            </div>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className={`divide-y divide-gray-100 ${manageableMembers.length > 5 ? "max-h-[400px] overflow-y-auto" : ""}`}>
                                    {manageableMembers.map((member) => (
                                        <div
                                            key={member.user_id}
                                            className="flex items-center justify-between p-5 hover:bg-gray-50 transition"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                                                    {member.display_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.display_name}</p>
                                                    <p className="text-sm text-gray-500">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${member.role === "executive"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-gray-100 text-gray-600"
                                                        }`}
                                                >
                                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                </span>

                                                {member.role === "member" ? (
                                                    <button
                                                        onClick={() => handleRoleChange(member.user_id, "executive")}
                                                        disabled={updating === member.user_id}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                                                    >
                                                        {updating === member.user_id ? "..." : "Promote"}
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRoleChange(member.user_id, "member")}
                                                        disabled={updating === member.user_id}
                                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                                                    >
                                                        {updating === member.user_id ? "..." : "Demote"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Danger Zone */}
                    <section>
                        <h2 className="text-2xl font-bold text-red-600 mb-4">Danger Zone</h2>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Club</h3>
                            <p className="text-gray-600 mb-4">
                                Permanently delete this club and all its events and memberships.
                                This action cannot be undone.
                            </p>
                            <button
                                onClick={handleDeleteClub}
                                disabled={deleting}
                                className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {deleting ? "Deleting..." : "Delete Club"}
                            </button>
                        </div>
                    </section>

                </div>
            </main>
        </div>
    );
}
