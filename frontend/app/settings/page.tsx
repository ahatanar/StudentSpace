'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../AuthProvider';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

function SettingsContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [calendarStatus, setCalendarStatus] = useState<{
        connected: boolean;
        authUrl?: string;
        loading: boolean;
    }>({ connected: false, loading: true });

    // Check for OAuth callback result
    useEffect(() => {
        const calendarParam = searchParams.get('calendar');
        if (calendarParam === 'connected') {
            alert('✅ Google Calendar connected successfully!');
            router.replace('/settings');
        } else if (calendarParam === 'error') {
            const message = searchParams.get('message') || 'Unknown error';
            alert(`❌ Calendar connection failed: ${message}`);
            router.replace('/settings');
        }
    }, [searchParams, router]);

    // Load calendar status
    useEffect(() => {
        const loadStatus = async () => {
            if (!user) return;

            try {
                const status = await api.getCalendarStatus();
                setCalendarStatus({
                    connected: status.calendarConnected,
                    authUrl: status.authUrl,
                    loading: false,
                });
            } catch (error) {
                console.error('Failed to load calendar status:', error);
                setCalendarStatus({ connected: false, loading: false });
            }
        };

        loadStatus();
    }, [user]);

    const handleConnectCalendar = () => {
        if (calendarStatus.authUrl) {
            window.location.href = calendarStatus.authUrl;
        }
    };

    const handleDisconnectCalendar = async () => {
        if (!confirm('Disconnect Google Calendar? Events will no longer sync.')) return;

        try {
            await api.disconnectCalendar();
            setCalendarStatus({ connected: false, loading: false });
            alert('✅ Calendar disconnected');
        } catch (error) {
            console.error('Failed to disconnect:', error);
            alert('❌ Failed to disconnect calendar');
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Please log in to access settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
                    <p className="text-gray-600">Manage your account and integrations</p>
                </div>

                {/* Profile Section */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile</h2>
                    <div className="space-y-3">
                        <div>
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-2 font-medium">{user.displayName}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2 font-medium">{user.email}</span>
                        </div>
                    </div>
                </div>

                {/* Google Calendar Integration */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-900">Google Calendar</h2>
                    </div>

                    <p className="text-gray-600 mb-6">
                        Connect your Google Calendar to automatically sync club events to your personal calendar.
                    </p>

                    {calendarStatus.loading ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <span>Loading...</span>
                        </div>
                    ) : calendarStatus.connected ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Connected</span>
                            </div>
                            <p className="text-sm text-gray-600">
                                Club events will automatically appear in your Google Calendar.
                            </p>
                            <button
                                onClick={handleDisconnectCalendar}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                            >
                                Disconnect Calendar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-500">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>Not connected</span>
                            </div>
                            <p className="text-sm text-gray-600">
                                Connect your Google Calendar to receive automatic event updates.
                            </p>
                            <button
                                onClick={handleConnectCalendar}
                                disabled={calendarStatus.loading || !calendarStatus.authUrl}
                                className={`px-6 py-3 rounded-lg transition font-medium shadow-lg hover:shadow-xl flex items-center gap-2 ${calendarStatus.loading || !calendarStatus.authUrl
                                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {calendarStatus.loading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                        <span>Redirecting...</span>
                                    </>
                                ) : !calendarStatus.authUrl ? (
                                    <span>⚠️ Not Configured</span>
                                ) : (
                                    <span>Connect Google Calendar</span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}

