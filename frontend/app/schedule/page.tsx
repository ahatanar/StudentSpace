'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { api } from '../../lib/api';
import HeatmapDisplay from '@/components/HeatmapDisplay';
import Link from 'next/link';

type TabType = 'events' | 'heatmap';

export default function SchedulePage() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('events');
    const [isExecutive, setIsExecutive] = useState<boolean>(false);
    const [checkingAccess, setCheckingAccess] = useState<boolean>(true);

    // Check if user has executive access
    useEffect(() => {
        async function checkAccess() {
            if (!user) {
                setIsExecutive(false);
                setCheckingAccess(false);
                return;
            }

            try {
                const result = await api.checkIsExecutive();
                setIsExecutive(result.is_executive);
            } catch (error) {
                console.error('Error checking executive status:', error);
                setIsExecutive(false);
            } finally {
                setCheckingAccess(false);
            }
        }

        if (!authLoading) {
            checkAccess();
        }
    }, [user, authLoading]);

    // Loading state
    if (authLoading || checkingAccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-xl font-medium text-gray-700">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition">
                                StudentSpace
                            </Link>
                            <span className="text-gray-400">|</span>
                            <h1 className="text-lg font-semibold text-gray-700">Schedule</h1>
                        </div>

                        <Link
                            href="/dashboard"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tab Navigation */}
                <div className="mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-2 inline-flex gap-2">
                        <button
                            onClick={() => setActiveTab('events')}
                            className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'events'
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            📅 Events Calendar
                        </button>

                        {isExecutive && (
                            <button
                                onClick={() => setActiveTab('heatmap')}
                                className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'heatmap'
                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                🔥 Campus Heatmap
                            </button>
                        )}
                    </div>

                    {!isExecutive && user && (
                        <p className="mt-3 text-sm text-gray-500">
                            💡 Become a club executive or president to access the Campus Heatmap feature
                        </p>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'events' && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            📅 Events Calendar
                        </h2>
                        <p className="text-gray-600 mb-8">
                            View upcoming events from all clubs. Calendar feature coming soon!
                        </p>

                        {/* Placeholder for calendar - will be implemented later */}
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <div className="text-6xl mb-4">🗓️</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                Calendar Coming Soon
                            </h3>
                            <p className="text-gray-500">
                                Week, Month, and Semester views with all club events will be available here.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'heatmap' && isExecutive && (
                    <HeatmapDisplay />
                )}
            </div>
        </div>
    );
}
