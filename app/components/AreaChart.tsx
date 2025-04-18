import React from "react";
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

// Type for chart variant
export type AreaChartVariant = "events" | "damage" | "loss";

interface EventsData {
  year: number;
  count: number;
}

interface ValueData {
  year: number;
  amount: number;
}

interface AreaChartProps {
  data: EventsData[] | ValueData[];
  variant: AreaChartVariant;
  formatter: (value: number) => string;
  CustomTooltip: React.FC<any>;
  title?: string;
  yAxisWidth?: number;
}

const variantConfig = {
  events: {
    gradientId: "eventGradient",
    stroke: "#8884d8",
    fill: "url(#eventGradient)",
    dataKey: "count",
    tooltipLabel: "Events",
  },
  damage: {
    gradientId: "damageGradient",
    stroke: "#82ca9d",
    fill: "url(#damageGradient)",
    dataKey: "amount",
    tooltipLabel: "Damage",
  },
  loss: {
    gradientId: "lossGradient",
    stroke: "#ffc658",
    fill: "url(#lossGradient)",
    dataKey: "amount",
    tooltipLabel: "Loss",
  },
};

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  variant,
  formatter,
  CustomTooltip,
  title,
  yAxisWidth = 60,
}) => {
  const config = variantConfig[variant];
  return (
    <div className="dts-data-box">
      {title && <h3 className="dts-body-label">{title}</h3>}
      <div style={{ height: "300px" }}>
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.stroke} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={config.stroke} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={formatter}
                allowDecimals={false}
                domain={[0, "auto"]}
                width={yAxisWidth || 60}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    title={config.tooltipLabel}
                    formatter={formatter}
                  />
                )}
              />
              <Area
                type="linear"
                dataKey={config.dataKey}
                stroke={config.stroke}
                fill={config.fill}
                strokeWidth={2}
              />
            </RechartsAreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">No data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AreaChart;
