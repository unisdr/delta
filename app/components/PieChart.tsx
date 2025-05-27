import { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Tooltip, Legend, Cell, ResponsiveContainer } from "recharts";
import { formatCurrencyWithCode, useDefaultCurrency } from "~/frontend/utils/formatters";

// Note: The colors below are sourced from the UNDRR Visual Identity Guide (colors-typography) as a temporary palette, pending the designer's input for a more aligned and less confusing color set.
const COLORS = [
  "#205375", // A dark blue from UNDRR Blue (corporate blue)
  "#FAA635", // A vivid orange from Target C (loss)
  "#F45D01", // A deeper orange from Target C
  "#68B3C8", // A light blue from UNDRR Teal (secondary shades)
  "#F7B32B", // A bright yellow from Target C
  "#A04300", // Darkest orange
  "#999999", // Gray (UNDRR base) - using a medium gray for better contrast
  "#B36800", // Darkest yellow
  "#A0CED9", // Light teal
  "#FDC68A", // Light orange
  "#FFF8E1", // Lightest yellow
  "#EBF6F5", // Lightest teal
  "#FFF0E3", // Lightest orange
];

// Define the expected shape of each data item
interface PieChartData {
  name: string;
  value: number; // Percentage value for the pie slice
  rawValue: number; // Original value (count or monetary amount)
  index: number; // For color mapping
}

// Define the props for CustomTooltip, compatible with recharts
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PieChartData }>;
  data: PieChartData[]; // Full dataset for percentage calculation
}

// Helper function to determine if a color is light (for text contrast)
const isLightColor = (color: string): boolean => {
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


// Helper function to infer chart type from data
// const inferChartType = (rawValue: number | string | undefined): "number" | "monetary" => {
//   if (rawValue === undefined) {
//     return "number"; // Fallback to number if no rawValue
//   }
//   // If rawValue is a number or a string that can be parsed as a number, assume monetary
//   const numericValue = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue;
//   return isNaN(numericValue) ? "number" : "monetary";
// };


const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, data }) => {
  const defaultCurrency = useDefaultCurrency();

  if (!active || !payload || !payload.length) {
    return null;
  }

  const item = payload[0].payload;
  const { name, value, rawValue, index } = item;

  // Calculate total value for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const formattedPercentage = `${Math.round(percentage)}%`;

  const segmentColor = COLORS[index % COLORS.length];
  const textColor = isLightColor(segmentColor) ? "#000000" : "#FFFFFF";

  // Infer chart type based on rawValue
  // const chartType = inferChartType(rawValue);

  // Format rawValue as a monetary amount
  const numericValue = typeof rawValue === "string" ? parseFloat(rawValue) : rawValue;
  const formattedValue = formatCurrencyWithCode(
    numericValue,
    defaultCurrency,
    {},
    numericValue >= 1_000_000_000
      ? "billions"
      : numericValue >= 1_000_000
        ? "millions"
        : numericValue >= 1_000
          ? "thousands"
          : undefined
  );

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
      <p
        style={{
          margin: "0 0 4px 0",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        {`${name}: ${formattedPercentage}`}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          opacity: 0.9,
        }}
      >
        Value: {formattedValue}
      </p>
    </div>
  );
};

// Main PieChart component
export default function CustomPieChart({ data, title, chartHeight = 350, boolRenderLabel = true }: { data: any[]; title?: string; chartHeight?:number; boolRenderLabel?: boolean }) {
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

    if (!boolRenderLabel) return null; // Disable label rendering if boolRenderLabel is false

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
  const dataWithIndex = data
    .map((item) => ({
      ...item,
      value: Number(item.value) || 0,
      rawValue: item.rawValue || item.value,
    }))
    .sort((a, b) => b.value - a.value) // Sort descending by value
    .map((item, index) => ({ ...item, index })); // Reassign index after sorting


  return (
    <div style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      {title && <h3 style={{ marginBottom: "10px", fontSize: "16px", fontWeight: "bold" }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={dataWithIndex}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            startAngle={90}
            endAngle={-270}
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
          <Tooltip content={<CustomTooltip data={dataWithIndex} />} />
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