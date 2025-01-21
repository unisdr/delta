import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import {
  computePosition,
  flip,
  shift,
  offset,
  arrow,
} from "@floating-ui/dom";


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

const useTooltip = () => {
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.dts-tooltip__button');

    // Function to set up tooltip behavior for each button
    const setupTooltip = (button: HTMLButtonElement) => {
      const tooltip = button.nextElementSibling as HTMLElement | null;
      const arrowElement = tooltip?.querySelector<HTMLElement>(".dts-tooltip__arrow");

      if (!tooltip || !arrowElement) {
        console.error('Tooltip or arrow element not found for button', button);
        return;
      }

      // Updates tooltip's position using Floating UI
      const updateTooltipPosition = async () => {
        try {
          const result = await computePosition(button, tooltip, {
            placement: "top",
            middleware: [offset(6), flip(), shift({ padding: 5 }), arrow({ element: arrowElement })],
          });

          // Applying computed styles to the tooltip
          Object.assign(tooltip.style, {
            left: `${result.x}px`,
            top: `${result.y}px`,
            display: "block", // Ensure tooltip is visible when position is updated
          });

          // Adjusting the arrow based on computed data
          if (result.middlewareData.arrow) {
            const { x: arrowX, y: arrowY } = result.middlewareData.arrow;
            const staticSide = {
              top: "bottom",
              right: "left",
              bottom: "top",
              left: "right",
            }[result.placement.split("-")[0]] as keyof CSSStyleDeclaration;

            Object.assign(arrowElement.style, {
              left: arrowX !== null ? `${arrowX}px` : "",
              top: arrowY !== null ? `${arrowY}px` : "",
              [staticSide]: "-4px",
            });
          }
        } catch (error) {
          console.error("Tooltip position update failed:", error);
        }
      };

      // Show and hide tooltip functions
      const showTooltip = () => {
        tooltip.style.display = "block";
        updateTooltipPosition();
      };

      const hideTooltip = () => {
        tooltip.style.display = "none";
      };

      // Attaching event listeners for tooltip visibility
      button.addEventListener("pointerenter", showTooltip);
      button.addEventListener("pointerleave", hideTooltip);
      button.addEventListener("focus", showTooltip);
      button.addEventListener("blur", hideTooltip);

      // Returning a cleanup function
      return () => {
        button.removeEventListener("pointerenter", showTooltip);
        button.removeEventListener("pointerleave", hideTooltip);
        button.removeEventListener("focus", showTooltip);
        button.removeEventListener("blur", hideTooltip);
      };
    };

    // Initialize tooltips for all buttons
    const cleanups = Array.from(buttons).map(setupTooltip);

    // Returning a cleanup function
    return () => {
      cleanups.forEach((cleanup) => {
        if (cleanup) {
          cleanup();
        }
      });
    };
  }, []);
};



const DisasterSummary: React.FC = () => {
  const [data, setData] = useState<DisasterSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useTooltip(); // Invoke the tooltip hook inside the component

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); // Start loading indicator
      try {
        // Fetch data from the REST API
        const response = await fetch("/api/analytics/disaster-summary");
        if (!response.ok) {
          throw new Error("Failed to fetch disaster summary data");
        }

        const result = await response.json();
        setData(result); // Set the fetched data
        setError(null);  // Clear any existing error
      } catch (error) {
        console.error("Error fetching disaster summary data:", error);
        setError("Unable to load data. Please try again.");
      } finally {
        setLoading(false); // Stop loading indicator
      }
    };

    fetchData(); // Invoke the function on component mount
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
        src="/assets/icons/empty-inbox.svg"
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

  if (loading || !data) {
    return (
      <section className="dts-page-section">
        <div className="mg-container">
          <h2 className="dts-heading-2">Disaster Impacts Across Sectors</h2>
          <p className="dts-alert dts-alert--info">{loading ? "Loading data..." : "Waiting for data..."}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dts-page-section">

      {/* Ensure full width */}
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
              //style={{ marginLeft: "8px" }} // Space between title and button
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </button>
              {/* Tooltip content */}
              <div id="tooltip01" role="tooltip">
                <span>
                  Lorem ipsum is placeholder text commonly used in the graphic, print, and
                  publishing industries for previewing layouts and visual mockups.
                </span>
                <div className="dts-tooltip__arrow"></div>
              </div>
            </h3>

            <div className="dts-indicator dts-indicator--target-box-g">
              <span>{data.events.toLocaleString()}</span>
            </div>
          </div>

          {/* Events Over Time Line Chart */}
          <div className="dts-data-box mg-grid__col--span-2">
            <h3 className="dts-body-label">
              <span id="elementId02">Events over time</span>
              <button
                type="button"
                className="dts-tooltip__button"
                aria-labelledby="elementId02"
                aria-describedby="tooltip02"
              //style={{ marginLeft: "8px" }} // Space between title and button
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </button>
              <div id="tooltip02" role="tooltip">
                <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                <div className="dts-tooltip__arrow"></div>
              </div>
            </h3>
            {data.eventsOverTime && data.eventsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.eventsOverTime}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
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
            <h3 className="dts-body-label">
              <span id="elementId03">Damage [currency] (in thousands)</span>
              <button
                type="button"
                className="dts-tooltip__button"
                aria-labelledby="elementId03"
                aria-describedby="tooltip03"
              //style={{ marginLeft: "8px" }} // Space between title and button
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </button>
              <div id="tooltip03" role="tooltip">
                <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                <div className="dts-tooltip__arrow"></div>
              </div>
            </h3>
            <div className="dts-indicator dts-indicator--target-box-d">
              <span>${(data.damage / 1000).toLocaleString()}k</span>
            </div>
            {data.damageOverTime && data.damageOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.damageOverTime}>
                  <defs>
                    <linearGradient id="colorDamage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#17a2b8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#17a2b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={tick => `${(tick / 1000).toLocaleString()}k`} />
                  <Tooltip formatter={(value) => (typeof value === 'number' ? `${(value / 1000).toLocaleString()}k` : value)} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke="#17a2b8" fillOpacity={1} fill="url(#colorDamage)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Losses */}
          <div className="dts-data-box">
            <h3 className="dts-body-label">
              <span id="elementId04">Losses in [currency]</span>
              <button
                type="button"
                className="dts-tooltip__button"
                aria-labelledby="elementId04"
                aria-describedby="tooltip04"
              //style={{ marginLeft: "8px" }} // Space between title and button
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </button>
              <div id="tooltip04" role="tooltip">
                <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                <div className="dts-tooltip__arrow"></div>
              </div>
            </h3>
            <div className="dts-indicator dts-indicator--target-box-c">
              <span>${data.losses.toLocaleString()}</span>
            </div>
            {data.lossesOverTime && data.lossesOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.lossesOverTime}>
                  <defs>
                    <linearGradient id="colorLosses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff7300" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff7300" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" />
                  <YAxis
                    tickFormatter={(tick) => (typeof tick === 'number' ? `${(tick / 1000).toLocaleString()}k` : tick)}
                    domain={[0, 'dataMax + 80000']} // Adds a buffer above the max data value for better visualization
                  />
                  <Tooltip formatter={(value) => (typeof value === 'number' ? `${(value / 1000).toLocaleString()}k` : value)} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke="#ff7300" fillOpacity={1} fill="url(#colorLosses)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Recovery */}
          <div className="dts-data-box">
            <h3 className="dts-body-label">
              <span id="elementId05">Recovery [currency] (in thousands)</span>
              <button
                type="button"
                className="dts-tooltip__button"
                aria-labelledby="elementId05"
                aria-describedby="tooltip05"
              //style={{ marginLeft: "8px" }} // Space between title and button
              >
                <img
                  src="/assets/icons/information_outline.svg"
                  alt="Info icon"
                  style={{ width: "16px", height: "16px" }}
                />
              </button>
              <div id="tooltip05" role="tooltip">
                <span>Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.Lorem ipsum is placeholder text commonly used in the graphic, print, and publishing industries for previewing layouts and visual mockups.</span>
                <div className="dts-tooltip__arrow"></div>
              </div>
            </h3>
            <div className="dts-indicator dts-indicator--target-box-f">
              <span>${(data.recovery / 1000).toLocaleString()}k</span>
            </div>
            {data.recoveryOverTime && data.recoveryOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.recoveryOverTime}>
                  <defs>
                    <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007bff" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#007bff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={tick => `${(tick / 1000).toLocaleString()}k`} />
                  <Tooltip formatter={(value) => (typeof value === 'number' ? `${(value / 1000).toLocaleString()}k` : value)} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke="#007bff" fillOpacity={1} fill="url(#colorRecovery)" />
                </AreaChart>
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
