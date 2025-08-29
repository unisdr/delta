interface MetricConfig {
  type: "monetary" | "count" | "percentage";
  unit?: string;
  label: string;
  currency?: string;
}

interface LegendProps {
  ranges: Array<{
    color: string;
    range: string;
  }>;
  selectedMetric: string;
  metricConfig?: MetricConfig;
  currency?: string;
}

export default function ExtendedLegend({
  ranges,
  selectedMetric,
  metricConfig,
  currency
}: LegendProps) {
  // Get display title based on metric config or fallback logic
  const getDisplayTitle = () => {
    if (metricConfig?.label) {
      if (metricConfig.type === "monetary") {
        const currencyCode = metricConfig.currency || currency || "USD";
        return `${metricConfig.label} (${currencyCode})`;
      } else if (metricConfig.unit) {
        return `${metricConfig.label} (${metricConfig.unit})`;
      } else {
        return metricConfig.label;
      }
    }

    // Fallback for legacy usage
    const fallbackTitles: Record<string, string> = {
      totalDamage: `Total Damages (${currency || "USD"})`,
      totalLoss: `Total Losses (${currency || "USD"})`,
      deaths: "Fatalities (people)",
      injured: "Injuries (people)",
      affectedPeople: "Affected Population (people)",
      displaced: "Displaced People (people)",
      homeless: "Homeless People (people)",
      numberOfEvents: "Number of Events"
    };

    return fallbackTitles[selectedMetric] ||
      selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);
  };

  // Determine if we should use special styling for certain metric types
  const getContainerClass = () => {
    const baseClass = "legend";

    if (metricConfig?.type === "count" && selectedMetric.includes("death")) {
      return `${baseClass} legend-mortality`;
    }
    if (metricConfig?.type === "count" && selectedMetric.includes("affected")) {
      return `${baseClass} legend-population`;
    }
    if (metricConfig?.type === "count" && selectedMetric.includes("events")) {
      return `${baseClass} legend-events`;
    }

    return baseClass;
  };

  return (
    <div className={getContainerClass()}>
      <h4>{getDisplayTitle()}</h4>
      <div className="legend-items">
        {ranges.map((range, index) => (
          <div key={index} className="legend-item">
            <div
              className={`legend-color ${range.color === 'rgba(255, 255, 255, 0.9)' ? 'empty' : ''}`}
              style={{
                backgroundColor: range.color,
                border: range.color === 'rgba(255, 255, 255, 0.9)' ? '1px solid #ccc' : 'none'
              }}
            />
            <span className="legend-label">{range.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}