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

interface HazardEventHeaderProps {
    totalCount: number;
    instanceName: string;
}

/**
 * Header component for the hazardous event list page
 * Displays the total count of hazardous events and the instance name
 * Based on GitHub ticket #296 (point 1)
 */
export function HazardEventHeader({ totalCount, instanceName }: HazardEventHeaderProps) {
    return (
        <div className="dts-header-summary mg-u-margin-bottom--md">
            <h2 className="mg-u-margin-bottom--sm">
                <span className="mg-u-color--primary">{totalCount}</span> hazardous events in{' '}
                <span className="mg-u-color--primary">{instanceName}</span>
            </h2>
        </div>
    );
}
