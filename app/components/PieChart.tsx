import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";

// Curated color palette
const COLORS = [
  "#205375", // Dark blue
  "#FAA635", // Vivid orange
  "#F45D01", // Deeper orange
  "#68B3C8", // Light blue
  "#F7B32B", // Bright yellow
];

// Custom Tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const formattedPercentage = `${Math.round(data.value)}%`;
    const segmentColor = COLORS[data.index % COLORS.length];

    // Simple brightness check for text color
    const isLightColor = (color: string) => {
      try {
        const hex = color.replace("#", "");
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128;
      } catch {
        return false;
      }
    };
    const textColor = isLightColor(segmentColor) ? "#000000" : "#FFFFFF";

    return (
      <div
        style={{
          backgroundColor: segmentColor,
          padding: "10px",
          border: `2px solid ${segmentColor}`,
          borderRadius: "6px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          color: textColor,
          minWidth: "150px",
        }}
      >
        <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "14px" }}>
          {`${data.name}: ${formattedPercentage}`}
        </p>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
          Value: {data.rawValue || data.value}
        </p>
      </div>
    );
  }
  return null;
};

// Main PieChart component
export default function CustomPieChart({ data, title }: { data: any[]; title?: string }) {
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  // Custom label rendering
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
    value,
    index,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.4; // Push labels further out
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Hide labels for small percentages
    if (percent < 0.03) return null;

    const formattedPercentage = `${Math.round(value)}%`;
    const segmentColor = COLORS[index % COLORS.length];

    // Handle long names by splitting into lines
    const words = name.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
      if (currentLine && currentLine.length + word.length + 1 > 15) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 1.2;
    const totalHeight = lines.length * lineHeight;
    const initialDY = -(totalHeight / 2) + lineHeight / 2;

    return (
      <text
        x={x}
        y={y}
        fill={segmentColor}
        textAnchor={x > cx ? "start" : "end"}
        style={{ fontSize: "12px", fontWeight: "normal" }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x={x} dy={i === 0 ? `${initialDY}em` : `${lineHeight}em`}>
            {line}
          </tspan>
        ))}
        <tspan x={x} dy={`${lineHeight}em`}>
          ({formattedPercentage})
        </tspan>
      </text>
    );
  };

  // Custom legend formatter
  const renderLegendText = (value: string, entry: any) => {
    const { index } = entry.payload;
    return (
      <span
        style={{
          color: activeIndex === index ? "#000" : "#666",
          fontWeight: activeIndex === index ? "bold" : "normal",
        }}
      >
        {value}
      </span>
    );
  };

  if (!mounted) return null; // Prevents SSR hydration error

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        {title && <h3 style={{ marginBottom: "10px" }}>{title}</h3>}
        <p style={{ color: "#666" }}>No data available</p>
      </div>
    );
  }

  // Add index to data for consistent color mapping
  const dataWithIndex = data.map((item, index) => ({
    ...item,
    index,
    value: Number(item.value) || 0, // Ensure value is a number
    rawValue: item.rawValue || item.value, // Preserve original value for tooltip
  }));

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      {title && <h3 style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={dataWithIndex}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            label={renderCustomizedLabel}
            labelLine={true}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {dataWithIndex.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                opacity={activeIndex === index ? 1 : 0.8}
                strokeWidth={activeIndex === index ? 2 : 0}
                stroke={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            align="left"
            verticalAlign="bottom"
            formatter={renderLegendText}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(-1)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}