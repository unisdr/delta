interface EventCounterProps {
    filteredEvents?: number;
    totalEvents: number;
}

export function EventCounter({ filteredEvents, totalEvents }: EventCounterProps) {
    // If filteredEvents is not provided, use totalEvents for both
    const filtered = filteredEvents !== undefined ? filteredEvents : totalEvents;

    return (
        <div className="">
            <p>
                Showing <strong>{filtered}</strong> of <strong>{totalEvents}</strong> hazardous events
            </p>
        </div>
    );
}