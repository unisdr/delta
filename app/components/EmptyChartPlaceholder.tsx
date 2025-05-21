import React from "react";

const EmptyChartPlaceholder: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="dts-chart-empty-state" style={{ height }}>
      <img
        src="/assets/images/empty.png"
        alt="No data"
        style={{ width: "48px", marginBottom: "0.5rem" }}
      />
      <span className="dts-body-text text-gray-600">No data available</span>
    </div>
  );
};

export default EmptyChartPlaceholder;
