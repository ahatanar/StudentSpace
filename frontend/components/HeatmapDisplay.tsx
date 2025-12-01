'use client';

import { useEffect, useState } from 'react';
import HeatmapGrid from './HeatmapGrid';

interface Section {
    id: number;
    term: string;
    courseReferenceNumber: string;
    subject: string;
    courseNumber: string;
    courseTitle: string;
    scheduleTypeDescription: string;
    campusDescription: string;
    instructionalMethodDescription: string;
    enrollment: number;
    maximumEnrollment: number;
    seatsAvailable: number;
    meetingsFaculty?: Array<{
        meetingTime?: {
            beginTime?: string;
            endTime?: string;
            monday?: boolean;
            tuesday?: boolean;
            wednesday?: boolean;
            thursday?: boolean;
            friday?: boolean;
            building?: string;
            room?: string;
        };
    }>;
}

interface HeatmapData {
    term: string;
    campus: string;
    totalSections: number;
    heatmapData: {
        [key: string]: { [timeSlot: string]: number };
        );
    }

    if(error) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-red-600 text-xl">Error: {error}</div>
        </div>
    );
}

if (!data) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-xl">No data available</div>
        </div>
    );
}

return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    Campus Heatmap
                </h1>
                <p className="text-gray-600 text-lg">
                    Visualizing course sections for {data.campus} campus
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Term
                    </div>
                    <div className="mt-2 text-3xl font-bold text-indigo-600">
                        {data.term}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                        Campus
                    </div>
                    <div className="mt-2 text-3xl font-bold text-indigo-600">
                        {data.campus}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                >
                        Grid View
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'table'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Table View
                    </button>
                </div>

                {/* Grid View */}
                {viewMode === 'grid' && (
                    <HeatmapGrid
                        heatmapData={data.heatmapData}
                        timeSlots={data.timeSlots}
                    />
                )}

                {/* Table View */}
                {viewMode === 'table' && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Section Details
                        </h2>
                        <div className="text-gray-600 mb-4">
                            Showing {data.rawSections.length} sections filtered for in-person classes at {data.campus}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            CRN
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Course
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Enrollment
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.rawSections.slice(0, 50).map((section) => (
                                        <tr key={section.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                {section.courseReferenceNumber}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                {section.subject} {section.courseNumber}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {section.courseTitle}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                {section.scheduleTypeDescription}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                {section.enrollment} / {section.maximumEnrollment}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {data.rawSections.length > 50 && (
                                <div className="mt-4 text-center text-sm text-gray-500">
                                    Showing first 50 of {data.rawSections.length} sections
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        );
}
