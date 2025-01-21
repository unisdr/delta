import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SectorImpactData {
  category: string; // Sector name
  value: number;    // Impact value
  color: string;    // Color for the pie slice
}

interface ImpactBySectorData {
  damage: SectorImpactData[];   // Data for damage chart
  loss: SectorImpactData[];     // Data for loss chart
  recovery: SectorImpactData[]; // Data for recovery chart
}

// Define categorical color palette
const PALETTE = [
  "#274c77", "#6096ba", "#a3cef1", "#6a994e", "#e9c46a", "#ff6b6b"
];

// Combine smaller categories into "Other"
const combineSmallCategories = (data: SectorImpactData[], maxSegments: number) => {
  const sortedData = [...data].sort((a, b) => b.value - a.value); // Sort by value descending
  const displayedData = sortedData.slice(0, maxSegments - 1); // Keep top categories
  const otherData = sortedData.slice(maxSegments - 1); // Combine the rest into "Other"

  const otherValue = otherData.reduce((sum, item) => sum + item.value, 0);
  if (otherValue > 0) {
    displayedData.push({
      category: "Other",
      value: otherValue,
      color: "#d3d3d3", // Grey for "Other"
    });
  }
  return displayedData;
};

const ImpactBySector: React.FC = () => {
  const [data, setData] = useState<ImpactBySectorData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/analytics/ImpactBySector");
        if (!response.ok) {
          throw new Error(`Error fetching data: ${response.status} ${response.statusText}`);
        }

        const rawData: any = await response.json();

        // Parse `value` fields to numbers and assign colors
        const parseData = (data: any[]): SectorImpactData[] =>
          data.map((item, index) => ({
            ...item,
            value: Number(item.value), // Ensure value is a number
            color: PALETTE[index % PALETTE.length], // Assign categorical colors
          }));

        // Combine smaller categories and ensure sorting
        const parsedData: ImpactBySectorData = {
          damage: combineSmallCategories(parseData(rawData.damage), 5),
          loss: combineSmallCategories(parseData(rawData.loss), 5),
          recovery: combineSmallCategories(parseData(rawData.recovery), 5),
        };

        setData(parsedData);
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
      return (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p>No data available for {title}.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: "1rem", textAlign: "left" }}>
        <h3 style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>{title}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="category"
              innerRadius={70} // Donut style
              outerRadius={100} // Outer size
              startAngle={90} // Start at the 12 o'clock position
              endAngle={-270} // Full clockwise rotation
              paddingAngle={1} // Space between slices
              label={({ category, percent }) =>
                `${category}: ${(percent * 100).toFixed(1)}%`
              }
              labelLine={true} // Hide lines connecting labels
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value.toLocaleString()}`} />
            {/*<Legend
              layout="horizontal"
              align="left"
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8} // Smaller dots

              wrapperStyle={{
                marginTop: "8px",
                fontSize: "10px", // Smaller font size for legend
                textAlign: "center",
                lineHeight: "1.5",
              }}
            />*/}
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p>Loading data, please wait...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p style={{ color: "red" }}>Error: {error}</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <p>No data available.</p>
        </div>
      );
    }

    return (
      <div className="mg-grid mg-grid__col-3">
        {/* Damage Chart */}
        <div className="dts-data-box">
          {renderChart("Damage", data.damage)}
        </div>

        {/* Loss Chart */}
        <div className="dts-data-box">
          {renderChart("Loss", data.loss)}
        </div>

        {/* Recovery Chart */}
        <div className="dts-data-box">
          {renderChart("Recovery need", data.recovery)}
        </div>
      </div>
    );
  };

  return (
    <section style={{ padding: "2rem" }}>
      <div style={{ textAlign: "left", marginBottom: "1rem" }}>
        <h2 style={{ fontWeight: "bold" }}>Impact by Sector</h2>
        <p>Here’s an explanation.</p>
      </div>
      {renderContent()}
    </section>
  );
};

export default ImpactBySector;
