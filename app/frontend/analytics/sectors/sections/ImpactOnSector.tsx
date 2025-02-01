import React, { useEffect } from "react";
import {
    AreaChart,
    Area,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import { useQuery } from "react-query";

// Custom tooltip positioning utility
import {
    computePosition,
    flip,
    shift,
    offset,
    arrow,
} from "@floating-ui/dom";

// Utility function for formatting currency
const formatCurrency = (value: number) => {
    return Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
};

// Define data structure
interface ImpactData {
    eventCount: number;
    totalDamage: number;
    totalLoss: number;
    eventsOverTime: { year: number; count: number }[];
    damageOverTime: { year: number; amount: number }[];
    lossOverTime: { year: number; amount: number }[];
}

// Component props
interface Props {
    sectorId: string | null;
    filters: Record<string, string | null>;
}

// Custom tooltip renderer for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div
                style={{
                    background: "#fff",
                    padding: "1rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                }}
            >
                <p style={{ margin: 0, fontWeight: "bold" }}>Year: {label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`tooltip-${index}`} style={{ margin: 0 }}>
                        {entry.name}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Tooltip behavior using Floating UI
const useTooltipBehavior = () => {
    useEffect(() => {
        const buttons = document.querySelectorAll<HTMLButtonElement>('.dts-tooltip__button');

        buttons.forEach((button) => {
            const tooltip = button.nextElementSibling as HTMLElement | null;
            const arrowElement = tooltip?.querySelector<HTMLElement>(".dts-tooltip__arrow");

            if (!tooltip || !arrowElement) return;

            const updateTooltipPosition = async () => {
                const result = await computePosition(button, tooltip, {
                    placement: "top",
                    middleware: [offset(6), flip(), shift({ padding: 5 }), arrow({ element: arrowElement })],
                });

                Object.assign(tooltip.style, {
                    left: `${result.x}px`,
                    top: `${result.y}px`,
                    display: "block",
                });

                if (result.middlewareData.arrow) {
                    const { x: arrowX, y: arrowY } = result.middlewareData.arrow;
                    Object.assign(arrowElement.style, {
                        left: arrowX !== null ? `${arrowX}px` : "",
                        top: arrowY !== null ? `${arrowY}px` : "",
                        bottom: "-4px",
                    });
                }
            };

            const showTooltip = () => {
                tooltip.style.display = "block";
                updateTooltipPosition();
            };

            const hideTooltip = () => {
                tooltip.style.display = "none";
            };

            button.addEventListener("pointerenter", showTooltip);
            button.addEventListener("pointerleave", hideTooltip);

            return () => {
                button.removeEventListener("pointerenter", showTooltip);
                button.removeEventListener("pointerleave", hideTooltip);
            };
        });
    }, []);
};

// Main Component
const ImpactOnSector: React.FC<Props> = ({ sectorId, filters }) => {
    const { data, isLoading, error } = useQuery<ImpactData>(
        ["impactOnSector", filters],
        async () => {
            const queryParams = new URLSearchParams(filters as Record<string, string>);
            const response = await fetch(`/api/analytics/ImpactonSectors?${queryParams}`);
            if (!response.ok) throw new Error("Failed to fetch sector impact data");
            return response.json();
        },
        { enabled: !!sectorId }
    );

    useTooltipBehavior(); // Activate custom tooltips

    // Empty state renderer
    const renderEmptyState = (message: string) => (
        <div style={{ textAlign: "center", padding: "2rem", backgroundColor: "#f9f9f9" }}>
            <h3>No Data Available</h3>
            <p>{message}</p>
        </div>
    );

    // Handle loading, errors, and empty data
    if (isLoading) return <p>Loading impact data...</p>;
    if (error) return <p>Error loading data: {error instanceof Error ? error.message : "Unknown error"}</p>;
    if (!data) return renderEmptyState("No data available for the selected filters.");

    return (
        <section className="dts-page-section">
            <div className="mg-container">
                <h2 className="dts-heading-2">Impact on {filters.sectorId || "[sector selected]"}</h2>

                <div className="mg-grid mg-grid__col-2">
                    <div>
                        <h2>Events Impacting Sector</h2>
                        <p>{data.eventCount}</p>
                    </div>

                    <div>
                        <h2>Events Over Time</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={data.eventsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="mg-grid mg-grid__col-2">
                    <div>
                        <h2>Damage in [currency]</h2>
                        <p>{formatCurrency(data.totalDamage)}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={data.damageOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="amount" stroke="#82ca9d" fill="#82ca9d" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div>
                        <h2>Losses in [currency]</h2>
                        <p>{formatCurrency(data.totalLoss)}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={data.lossOverTime}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="amount" stroke="#ffc658" fill="#ffc658" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ImpactOnSector;
