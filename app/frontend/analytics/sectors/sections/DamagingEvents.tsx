import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { createFloatingTooltip, FloatingTooltipProps } from "~/util/tooltip";




interface DamagingEvent {
  disasterEventId: string;
  disasterName: string;
  startDate: string;
  lastUpdated: string;
  sectorName: string;
  totalDamage: number;
  totalLoss: number;
  totalRecoveryNeed: number;
}

// Helper to render the empty state UI
const renderEmptyState = () => (
  <div
    className="dts-placeholder"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    }}
  >
    <img
      src="/assets/icons/empty-inbox.svg"
      alt="No data available"
      style={{
        width: "96px",
        height: "96px",
        marginBottom: "1rem",
      }}
    />
    <span
      style={{
        fontSize: "1.4rem",
        color: "#888",
      }}
    >
      No data available
    </span>
  </div>
);

const DamagingEvents: React.FC = () => {
  const [events, setEvents] = useState<DamagingEvent[]>([]); // State for events data
  const [loading, setLoading] = useState(true); // Loading indicator
  const [tooltipProps, setTooltipProps] = useState<FloatingTooltipProps | null>(
    null
  ); // State for tooltip content

  // Fetch damaging events data from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/analytics/damagingEvents");
        if (!response.ok) throw new Error("Failed to fetch data");
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching damaging events data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle the creation of the floating tooltip
  useEffect(() => {
    if (tooltipProps) {
      createFloatingTooltip(tooltipProps);
    }
  }, [tooltipProps]);

  // If the component is loading, show a loading message
  if (loading) {
    return <p>Loading...</p>;
  }

  // If there are no events, render the empty state UI
  if (events.length === 0) {
    return renderEmptyState();
  }

  return (
    <div className="damaging-events-section">
      <h2>The most damaging events across sectors</h2>
      <p>
        Here's an explanation.{" "}
      </p>

      <div className="events-grid">
        {events.map((event) => (
          <div key={event.disasterEventId} className="event-card">
            <h3>{`${event.disasterName}, ${new Date(
              event.startDate
            ).toLocaleDateString()}`}</h3>
            <p style={{ display: "flex", alignItems: "center", lineHeight: "2.2" }}>
              <strong>Sector:</strong> {event.sectorName || "N/A"}
              <button
                className="dts-tooltip__button"
                onMouseEnter={(e) => {
                  setTooltipProps({
                    content: "Details about the most damaging events are displayed here.",
                    target: e.currentTarget,
                  });
                }}
                onMouseLeave={() => setTooltipProps(null)}
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px", marginLeft: "4px" }}
                />
              </button>
            </p>
            <p>
              <strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Last updated:</strong>{" "}
              {new Date(event.lastUpdated).toLocaleString()}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[event]} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="category" dataKey="sectorName" />
                <YAxis type="number" />
                <Tooltip formatter={(value: any) => `${value}`}  />
                <Legend verticalAlign="bottom" align="left" layout="horizontal" />
                <Bar
                  dataKey="totalDamage"
                  fill="#8884d8"
                  name="Total Damage"
                />
                <Bar
                  dataKey="totalRecoveryNeed"
                  fill="#82ca9d"
                  name="Total Recovery Need"
                />
                <Bar dataKey="totalLoss" fill="#ffc658" name="Total Loss" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DamagingEvents;
