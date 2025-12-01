'use client';

import { useMemo } from 'react';

interface HeatmapGridProps {
    heatmapData: {
        [key: string]: { [timeSlot: string]: number };
    };
    timeSlots: string[];
}

export default function HeatmapGrid({ heatmapData, timeSlots }: HeatmapGridProps) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Convert 24-hour time to 12-hour AM/PM format
    const formatTime = (time24: string): string => {
        const [hourStr, minute] = time24.split(':');
        let hour = parseInt(hourStr);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minute} ${ampm}`;
    };

    // Calculate max value for smooth gradient scaling
    const maxCount = useMemo(() => {
        let max = 0;
        days.forEach(day => {
            if (heatmapData[day]) {
                Object.values(heatmapData[day]).forEach(count => {
                    if (count > max) max = count;
                });
            }
        });
        return max;
    }, [heatmapData, days]);

    // Smooth gradient: Cyan/Light Blue (200°) → Blue (220°) → Purple (270°)
    const getStyleForCount = (count: number): React.CSSProperties => {
        if (count === 0) return { backgroundColor: '#f0f9ff', borderColor: '#e0f2fe' };

        const percentage = Math.min(count / maxCount, 1);
        const hue = 200 + (percentage * 70);
        const saturation = 50 + (percentage * 35);
        const lightness = 80 - (percentage * 35);

        return {
            backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            borderColor: `hsl(${hue}, ${saturation}%, ${lightness - 12}%)`
        };
    };

    const getTextColor = (count: number): string => {
        if (count === 0) return 'text-blue-400';
        const percentage = Math.min(count / maxCount, 1);
        const lightness = 80 - (percentage * 35);
        return lightness > 58 ? 'text-gray-900 font-medium' : 'text-white font-semibold';
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    📅 Weekly Campus Scheduling Heatmap
                </h2>
                <p className="text-gray-600 text-lg">
                    <span className="font-semibold text-cyan-600">Light Blue</span> = Low occupancy (easy to schedule) •
                    <span className="font-semibold text-purple-600 ml-2">Purple</span> = High occupancy (busy)
                </p>
            </div>

            {/* Smooth Gradient Legend */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-gray-800">Occupancy Scale:</span>
                    <div className="flex items-center flex-1 h-8 rounded-lg overflow-hidden border border-blue-300 max-w-xl shadow-inner">
                        <div className="flex-1 h-full" style={{ background: 'linear-gradient(to right, hsl(200, 50%, 80%), hsl(220, 70%, 65%), hsl(270, 85%, 55%))' }}>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-700">
                        <span>0</span>
                        <span>→</span>
                        <span className="font-bold">{maxCount.toLocaleString()} students</span>
                    </div>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    {/* Header Row - Days */}
                    <div className="grid grid-cols-[120px_repeat(5,_minmax(110px,_1fr))] gap-1.5 mb-2">
                        <div className="font-bold text-gray-700 text-sm flex items-center justify-center">
                            Time
                        </div>
                        {days.map(day => (
                            <div
                                key={day}
                                className="font-bold text-gray-800 text-sm text-center py-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-sm"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Time Slot Rows */}
                    <div className="space-y-1.5">
                        {timeSlots.map(slot => (
                            <div
                                key={slot}
                                className="grid grid-cols-[120px_repeat(5,_minmax(110px,_1fr))] gap-1.5"
                            >
                                {/* Time label with AM/PM */}
                                <div className="font-semibold text-gray-700 text-sm flex items-center justify-end pr-4">
                                    {formatTime(slot)}
                                </div>

                                {/* Day cells */}
                                {days.map(day => {
                                    const count = heatmapData[day]?.[slot] || 0;
                                    const cellStyle = getStyleForCount(count);
                                    const textColorClass = getTextColor(count);

                                    return (
                                        <div
                                            key={`${day}-${slot}`}
                                            className={`${textColorClass} border rounded-lg p-3 text-center text-sm transition-all hover:scale-110 hover:shadow-2xl hover:z-10 cursor-pointer relative group`}
                                            style={cellStyle}
                                            title={`${day} ${formatTime(slot)}: ${count} students`}
                                        >
                                            {count > 0 ? count.toLocaleString() : '—'}

                                            {/* Enhanced Tooltip on hover */}
                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                                <div className="font-bold text-sm">{day} at {formatTime(slot)}</div>
                                                <div className="mt-1">
                                                    <span className="font-semibold">{count.toLocaleString()}</span> students
                                                </div>
                                                <div className="text-gray-300 text-xs mt-0.5">
                                                    {count === 0
                                                        ? '✓ Free slot'
                                                        : count < maxCount * 0.4
                                                            ? '✓ Good for scheduling'
                                                            : count < maxCount * 0.7
                                                                ? '⚠ Moderate traffic'
                                                                : '✗ Peak traffic'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Enhanced Stats Summary */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                    <div className="text-sm text-purple-900">
                        <span className="font-bold">🔥 Peak Occupancy:</span> {maxCount.toLocaleString()} students
                    </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                    <div className="text-sm text-cyan-900">
                        <span className="font-bold">💡 Pro Tip:</span> Schedule during <span className="font-semibold">light blue zones</span> for best availability
                    </div>
                </div>
            </div>
        </div>
    );
}
