"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";

interface RequestClubFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequestClubForm({ onClose, onSuccess }: RequestClubFormProps) {
    const [types, setTypes] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        abbreviation: "",
        description: "",
        type: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.getClubTypes().then(setTypes).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await api.createClub(formData);
            onSuccess();
            onClose();
        } catch (err) {
            setError("Failed to create club. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

            {/* FORCE WHITE CARD ALWAYS */}
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-gray-200">

                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                    Request a New Club
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Club Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Club Name
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white 
                                       border-gray-300 focus:ring-2 focus:ring-indigo-500"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {/* Abbreviation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Abbreviation (Optional)
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white 
                                       border-gray-300 focus:ring-2 focus:ring-indigo-500"
                            value={formData.abbreviation}
                            onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <select
                            required
                            className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white 
                                       border-gray-300 focus:ring-2 focus:ring-indigo-500"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="">Select a category</option>
                            {types.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg text-gray-900 bg-white 
                                       border-gray-300 focus:ring-2 focus:ring-indigo-500 resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                                       text-gray-700 hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold
                                       hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}