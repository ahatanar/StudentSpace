'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { api } from '../lib/api';

interface CalendarEvent {
    id: string;
    name: string;
    description?: string;
    location?: string;
    start_time: string | number;
    end_time?: string | number;
    club_id: string;
    club_name: string;
    club_abbreviation?: string;
}

interface SelectedEventInfo {
    event: CalendarEvent;
}

// Color palette for clubs - vibrant and distinguishable
const CLUB_COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#8B5CF6', // Violet
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#6366F1', // Indigo
    '#EF4444', // Red
];

function getClubColor(clubId: string): string {
    let hash = 0;
    for (let i = 0; i < clubId.length; i++) {
        hash = clubId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return CLUB_COLORS[Math.abs(hash) % CLUB_COLORS.length];
}

export default function EventsCalendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEventInfo | null>(null);
    const calendarRef = useRef<FullCalendar>(null);

    // Fetch events for date range
    const fetchEvents = useCallback(async (startDate?: string, endDate?: string) => {
        setLoading(true);
        setError(null);
        try {
            console.log('Fetching events:', { startDate, endDate });
            const result = await api.getEvents(startDate, endDate);
            console.log('Fetched events:', result);
            setEvents(result.events || []);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError('Failed to load events');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Parse event time to Date
    const parseEventTime = (time: string | number): Date => {
        if (typeof time === 'number') {
            return new Date(time * 1000);
        }
        return new Date(time);
    };

    // Convert API events to FullCalendar format
    const fullCalendarEvents = events.map(event => {
        const start = parseEventTime(event.start_time);
        const end = event.end_time ? parseEventTime(event.end_time) : undefined;
        const color = getClubColor(event.club_id);

        return {
            id: event.id,
            title: event.name,
            start,
            end,
            backgroundColor: color,
            borderColor: color,
            textColor: '#ffffff',
            extendedProps: {
                description: event.description,
                location: event.location,
                club_name: event.club_name,
                club_id: event.club_id,
                originalEvent: event
            }
        };
    });

    // Handle date range change (for lazy loading - optional)
    const handleDatesSet = useCallback((arg: { start: Date; end: Date }) => {
        const startDate = arg.start.toISOString().split('T')[0];
        const endDate = arg.end.toISOString().split('T')[0];
        fetchEvents(startDate, endDate);
    }, [fetchEvents]);

    // Handle event click
    const handleEventClick = (arg: { event: any }) => {
        const originalEvent = arg.event.extendedProps.originalEvent as CalendarEvent;
        setSelectedEvent({ event: originalEvent });
    };

    // Close modal
    const handleModalClose = () => {
        setSelectedEvent(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden relative">
            {/* Loading indicator */}
            {loading && (
                <div className="absolute top-4 right-4 z-20">
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                    </div>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Calendar */}
            <div className="p-4">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    buttonText={{
                        today: 'Today',
                        month: 'Month',
                        week: 'Week',
                        day: 'Day'
                    }}
                    events={fullCalendarEvents}
                    datesSet={handleDatesSet}
                    eventClick={handleEventClick}
                    height="auto"
                    contentHeight={650}
                    slotMinTime="07:00:00"
                    slotMaxTime="23:00:00"
                    allDaySlot={false}
                    weekends={true}
                    nowIndicator={true}
                    slotDuration="00:30:00"
                    eventTimeFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        meridiem: 'short'
                    }}
                    slotLabelFormat={{
                        hour: 'numeric',
                        minute: '2-digit',
                        meridiem: 'short'
                    }}
                    dayHeaderFormat={{
                        weekday: 'short',
                        month: 'numeric',
                        day: 'numeric'
                    }}
                    eventDisplay="block"
                    eventOverlap={true}
                    slotEventOverlap={false}
                    eventMaxStack={3}
                />
            </div>

            {/* Event count indicator */}
            {events.length > 0 && !loading && (
                <div className="px-4 pb-4">
                    <p className="text-sm text-gray-500">
                        Showing {events.length} event{events.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={handleModalClose}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                    {selectedEvent.event.name}
                                </h3>
                                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                    <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getClubColor(selectedEvent.event.club_id) }}
                                    />
                                    {selectedEvent.event.club_name}
                                </p>
                            </div>
                            <button
                                onClick={handleModalClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition ml-2"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-gray-700">
                                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div className="font-medium">
                                        {parseEventTime(selectedEvent.event.start_time).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    <div className="text-gray-500">
                                        {parseEventTime(selectedEvent.event.start_time).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                        {selectedEvent.event.end_time && (
                                            <> - {parseEventTime(selectedEvent.event.end_time).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit'
                                            })}</>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedEvent.event.location && (
                                <div className="flex items-start gap-3 text-gray-700">
                                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span>{selectedEvent.event.location}</span>
                                </div>
                            )}

                            {selectedEvent.event.description && (
                                <div className="pt-4 border-t">
                                    <p className="text-gray-600">{selectedEvent.event.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FullCalendar Styles */}
            <style jsx global>{`
                .fc {
                    font-family: inherit;
                }
                .fc .fc-toolbar-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1f2937;
                }
                .fc .fc-button-primary {
                    background-color: #3B82F6;
                    border-color: #3B82F6;
                    font-weight: 500;
                }
                .fc .fc-button-primary:hover {
                    background-color: #2563EB;
                    border-color: #2563EB;
                }
                .fc .fc-button-primary:not(:disabled).fc-button-active {
                    background-color: #1D4ED8;
                    border-color: #1D4ED8;
                }
                .fc .fc-button-primary:disabled {
                    background-color: #9CA3AF;
                    border-color: #9CA3AF;
                }
                .fc .fc-today-button {
                    background-color: #6B7280;
                    border-color: #6B7280;
                }
                .fc .fc-today-button:hover:not(:disabled) {
                    background-color: #4B5563;
                    border-color: #4B5563;
                }
                .fc .fc-event {
                    cursor: pointer;
                    border-radius: 6px;
                    padding: 2px 6px;
                    font-size: 0.8rem;
                    font-weight: 500;
                    border-width: 0;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .fc .fc-event:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
                }
                .fc .fc-event-title {
                    font-weight: 600;
                }
                .fc .fc-daygrid-day.fc-day-today {
                    background-color: #EFF6FF !important;
                }
                .fc .fc-timegrid-col.fc-day-today {
                    background-color: #EFF6FF !important;
                }
                .fc .fc-timegrid-now-indicator-line {
                    border-color: #EF4444;
                    border-width: 2px;
                }
                .fc .fc-timegrid-now-indicator-arrow {
                    border-top-color: #EF4444;
                }
                .fc .fc-col-header-cell {
                    background-color: #F9FAFB;
                    padding: 8px 0;
                }
                .fc .fc-scrollgrid {
                    border-color: #E5E7EB;
                }
                .fc .fc-scrollgrid td,
                .fc .fc-scrollgrid th {
                    border-color: #E5E7EB;
                }
                .fc .fc-timegrid-slot {
                    height: 2.5rem;
                }
                .fc .fc-timegrid-slot-label {
                    font-size: 0.75rem;
                    color: #6B7280;
                }
                /* Overlapping events styling */
                .fc .fc-timegrid-event-harness {
                    margin-right: 2px;
                }
                .fc .fc-daygrid-event-harness {
                    margin-bottom: 2px;
                }
                .fc .fc-daygrid-more-link {
                    color: #3B82F6;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}
