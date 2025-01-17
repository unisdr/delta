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

const DisasterSummary: React.FC = () => {
  const [data, setData] = useState<DisasterSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.dts-tooltip__button');
  
    buttons.forEach((button) => {
      const tooltip = button.nextElementSibling as HTMLElement | null;
      const arrowElement = tooltip?.querySelector<HTMLElement>(".dts-tooltip__arrow");
  
      if (!tooltip || !arrowElement) {
        console.error('Tooltip or arrow element not found for button', button);
        return; // Gracefully handle missing tooltip or arrow elements
      }
  
      const updateTooltipPosition = async () => {
        try {
          const result = await computePosition(button, tooltip, {
            placement: "top",
            middleware: [
              offset(6),
              flip(),
              shift({ padding: 5 }),
              arrow({ element: arrowElement }),
            ],
          });
  
          Object.assign(tooltip.style, {
            left: `${result.x}px`,
            top: `${result.y}px`,
            display: "block",
          });
  
          const { x: arrowX, y: arrowY } = result.middlewareData.arrow!;
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
        } catch (error) {
          console.error("Tooltip position update failed:", error);
        }
      };
  
      const showTooltip = () => {
        console.log('Showing tooltip', tooltip.id);
        tooltip.style.display = "block";
        updateTooltipPosition();
      };
  
      const hideTooltip = () => {
        console.log('Hiding tooltip', tooltip.id);
        tooltip.style.display = "none";
      };
  
      const eventListeners: [string, EventListenerOrEventListenerObject][] = [
        ["pointerenter", showTooltip],
        ["pointerleave", hideTooltip],
        ["focus", showTooltip],
        ["blur", hideTooltip],
      ];
  
      eventListeners.forEach(([event, listener]) => {
        button.addEventListener(event, listener);
      });
  
      return () => {
        eventListeners.forEach(([event, listener]) => {
          button.removeEventListener(event, listener);
        });
      };
    });
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
