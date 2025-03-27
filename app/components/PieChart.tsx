import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PieChart, Pie, Sector, Cell } from 'recharts';
import { formatCurrency } from "~/frontend/utils/formatters";

const COLORS = [
	"#205375", // A dark blue from UNDRR Blue (corporate blue)
	"#FAA635", // A vivid orange from Target C (loss)
	"#F45D01", // A deeper orange from Target C
	"#68B3C8", // A light blue from UNDRR Teal (secondary shades)
	"#F7B32B", // A bright yellow from Target C
];

type ChartProps = {
    data: any[];
    title: string;
};

const CustomPieChart = ({ data, title }: { data: any[]; title: string }) => {
    const [activeIndex, setActiveIndex] = useState(-1);

    const onPieEnter = useCallback(
        (_: any, index: number) => {
            setActiveIndex(index);
        },
        [setActiveIndex]
    );

    const onPieLeave = useCallback(() => {
        setActiveIndex(-1);
    }, [setActiveIndex]);

    

    if (!data || data.length === 0) {
        return (
            <div className="dts-data-box">
                <h3 className="dts-body-label">
                    <span>{title}</span>
                </h3>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500">No data available</p>
                </div>
            </div>
        );
    }

    // Add index to the data
    const dataWithIndex = data.map((item, index) => ({
        ...item,
        index,
    }));

    return (
        <PieChart width={300} height={400}>
            <Pie
                data={data}
                cx={120}
                cy={200}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={0}
                dataKey="value"
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
            >
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
            </Pie>
            <Legend />
            <Tooltip />
        </PieChart>
    );
};


export default CustomPieChart;