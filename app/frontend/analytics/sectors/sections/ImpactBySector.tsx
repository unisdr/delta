import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface SectorImpactData {
  category: string; // Sector name
  value: number;    // Percentage value
  color: string;    // Color for the pie slice
}

interface ImpactBySectorData {
  damage: SectorImpactData[];  // Data for damage chart
  loss: SectorImpactData[];    // Data for loss chart
  recovery: SectorImpactData[]; // Data for recovery chart
}

const COLORS = ["#8884d8", "#8dd1e1", "#a4de6c", "#ffc658", "#ff8042", "#d0ed57"]; // Default color palette

const renderEmptyState = () => (
  <div
    className="dts-placeholder"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      textAlign: "center",
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

const ImpactBySector: React.FC = () => {
  const [data, setData] = useState<ImpactBySectorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/analytics/impact-by-sector");
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "The requested table or column does not exist in the database."
            );
          } else {
            throw new Error(`Error fetching data: ${response.statusText}`);
          }
        }

        const result: ImpactBySectorData = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderChart = (title: string, chartData: SectorImpactData[]) => {
    if (!chartData || chartData.length === 0) {
      return renderEmptyState();
    }

    return (
      <ResponsiveContainer width="100%" height={270}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="category"
            outerRadius={100}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(1)}%`
            }
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="dts-alert dts-alert--info">
          Loading data, please wait...
        </div>
      );
    }

    if (error) {
      return (
        <div className="dts-alert dts-alert--error">
          <strong>Error:</strong> {error}
        </div>
      );
    }

    if (!data) {
      return renderEmptyState();
    }

    return (
      <div className="mg-grid mg-grid__col-3">
        {/* Damage Chart */}
        <div className="dts-data-box">
          <h3 className="dts-body-label">Damage</h3>
          {renderChart("Damage", data.damage)}
        </div>

        {/* Loss Chart */}
        <div className="dts-data-box">
          <h3 className="dts-body-label">Loss</h3>
          {renderChart("Loss", data.loss)}
        </div>

        {/* Recovery Need Chart */}
        <div className="dts-data-box">
          <h3 className="dts-body-label">Recovery need</h3>
          {renderChart("Recovery need", data.recovery)}
        </div>
      </div>
    );
  };

  return (
    <section className="dts-page-section">
      <div className="mg-container">
        <h2 className="dts-heading-2">Impact by sector</h2>
        <p>Here’s an explanation.</p>
        {renderContent()}
      </div>
    </section>
  );
};

export default ImpactBySector;
