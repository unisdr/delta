import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DisasterSummaryData {
    events: number;
    eventsOverTime: { year: number; count: number }[]; // For Events over time
    damage: number;
    damageOverTime: { year: number; value: number }[]; // Year-wise Damage
    losses: number;
    lossesOverTime: { year: number; value: number }[]; // Year-wise Losses
    recovery: number;
    recoveryOverTime: { year: number; value: number }[]; // Year-wise Recovery
}

const DisasterSummary: React.FC = () => {
  const [data, setData] = useState<DisasterSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => console.log("Connected to WebSocket");
    ws.onmessage = (event) => {
      try {
        const parsedData: DisasterSummaryData = JSON.parse(event.data);
        setData(parsedData);
        setError(null); // Clear any previous errors if data is successfully received
      } catch (err) {
        console.error("Error parsing WebSocket data:", err);
        setError("Failed to parse data. Check WebSocket message format.");
      }
    };

    ws.onerror = (event) => {
      console.error("WebSocket error:", event);
      setError("WebSocket encountered an error. Checking connection.");
    };

    return () => {
      ws.close();
    };
  }, []);

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
    {/* Display the icon */}
    <img
      src="/assets/icons/inbox_Empty_icon.svg"
      alt="No data available"
      style={{
        width: "96px", // Increased size for better visibility
        height: "96px",
        marginBottom: "1rem", // Space between icon and text
      }}
    />
    {/* Display the "No data available" text */}
    <span
      style={{
        fontSize: "1.4rem", // Slightly larger font for readability
        color: "#888", // Softer color for a user-friendly design
      }}
    >
      No data available
    </span>
  </div>
  );

  if (error) {
    return (
      <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">Disaster Impacts Across Sectors</h2>
          <p className="dts-alert dts-alert--error">{error}</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">Disaster Impacts Across Sectors</h2>
          <p className="dts-alert dts-alert--info">Waiting for data...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dts-page-section">
      <div className="mg-container">
        <h2 className="dts-heading-2">Disaster Impacts Across Sectors</h2>
        <p>These summaries represent disaster impact on all sectors combined.</p>

        {/* Events Impacting Sectors & Events Over Time */}
        <div className="mg-grid mg-grid__col-3">
          {/* Events Card */}
          <div className="dts-data-box">
          <h3 className="dts-body-label">
    <span id="elementId01">Events impacting sectors</span>
    {/* Tooltip button */}
    <button
      type="button"
      className="dts-tooltip__button"
      aria-labelledby="elementId01"
      aria-describedby="tooltip01"
      style={{ marginLeft: "8px" }} // Space between title and button
    >
      <img
        src="/assets/icons/information_outline.svg"
        alt="Info icon"
        style={{ width: "16px", height: "16px" }}
      />
    </button>
    {/* Tooltip content */}
    <div id="tooltip01" role="tooltip" className="dts-tooltip-content">
      <span>
        Lorem ipsum is placeholder text commonly used in the graphic, print, and
        publishing industries for previewing layouts and visual mockups.
      </span>
    </div>
  </h3>

            <div className="dts-indicator dts-indicator--target-box-g">
              <span>{data.events.toLocaleString()}</span>
            </div>
          </div>

          {/* Events Over Time Line Chart */}
          <div className="dts-data-box mg-grid__col--span-2">
            <h3 className="dts-body-label">Events over time</h3>
            {data.eventsOverTime && data.eventsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.eventsOverTime}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  <CartesianGrid stroke="#ccc" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>
        </div>

        {/* Damage, Losses, and Recovery */}
        <div className="mg-grid mg-grid__col-3">
          {/* Damage */}
          <div className="dts-data-box">
            <h3 className="dts-body-label">Damage [currency] (in thousands)</h3>
            <div className="dts-indicator dts-indicator--target-box-d">
              <span>${(data.damage / 1000).toLocaleString()}k</span>
            </div>
            {data.damageOverTime && data.damageOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.damageOverTime}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#ff7300" />
                  <CartesianGrid stroke="#ccc" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Losses */}
          <div className="dts-data-box">
            <h3 className="dts-body-label">Losses [currency]</h3>
            <div className="dts-indicator dts-indicator--target-box-c">
              <span>${data.losses.toLocaleString()}</span>
            </div>
            {data.lossesOverTime && data.lossesOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.lossesOverTime}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#387908" />
                  <CartesianGrid stroke="#ccc" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Recovery */}
          <div className="dts-data-box">
            <h3 className="dts-body-label">
              Recovery [currency] (in thousands)
            </h3>
            <div className="dts-indicator dts-indicator--target-box-f">
              <span>${(data.recovery / 1000).toLocaleString()}k</span>
            </div>
            {data.recoveryOverTime && data.recoveryOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.recoveryOverTime}>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#84d88a" />
                  <CartesianGrid stroke="#ccc" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DisasterSummary;
