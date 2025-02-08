import React, { useRef, useEffect, useState } from "react";
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
import { createFloatingTooltip, FloatingTooltipProps } from "~/util/tooltip";
import { IoInformationCircleOutline } from "react-icons/io5";

// Types
interface ApiResponse {
    success: boolean;
    data: {
        eventCount: number;
        totalDamage: string;
        totalLoss: string;
        eventsOverTime: Record<string, string>;
        damageOverTime: Record<string, string>;
        lossOverTime: Record<string, string>;
    };
}

interface ImpactData {
    eventCount: number;
    totalDamage: string;
    totalLoss: string;
    eventsOverTime: { year: number; count: number }[];
    damageOverTime: { year: number; amount: number }[];
    lossOverTime: { year: number; amount: number }[];
}

interface Props {
    sectorId: string | null;
    filters: Record<string, string | null>;
}

interface Sector {
    id: number;
    sectorname: string;
    subsectors?: Sector[];
}

// Utility functions
const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(numValue);
};

const formatNumber = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US").format(numValue);
};

const calculateTotal = (data: { year: number; amount: number }[]) => {
    return data.reduce((sum, item) => sum + (item.amount || 0), 0);
};

// Transform time series data
const transformTimeSeriesData = (data: Record<string, string>) => {
    return Object.entries(data)
        .map(([year, value]) => ({
            year: parseInt(year),
            value: parseFloat(value)
        }))
        .sort((a, b) => a.year - b.year);
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label, title, formatter }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                        <span className="font-medium">{title}: </span>
                        {formatter ? formatter(entry.value) : entry.name === "amount"
                            ? formatCurrency(entry.value)
                            : formatNumber(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ImpactOnSector: React.FC<Props> = ({ sectorId, filters }) => {
    const eventsImpactingRef = useRef<HTMLButtonElement>(null);
    const eventsOverTimeRef = useRef<HTMLButtonElement>(null);
    const damageTooltipRef = useRef<HTMLButtonElement>(null);
    const lossTooltipRef = useRef<HTMLButtonElement>(null);

    const createTooltip = (ref: React.RefObject<HTMLButtonElement>, content: string) => {
        if (ref.current) {
            createFloatingTooltip({
                content,
                target: ref.current,
                placement: "top",
                offsetValue: 8
            });
        }
    };

    const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>, content: string) => {
        console.log('Pointer Enter Event:', {
            target: e.currentTarget,
            content: content
        });

        if (e.currentTarget === eventsImpactingRef.current) {
            createTooltip(eventsImpactingRef, content);
        } else if (e.currentTarget === eventsOverTimeRef.current) {
            createTooltip(eventsOverTimeRef, content);
        } else if (e.currentTarget === damageTooltipRef.current) {
            createTooltip(damageTooltipRef, content);
        } else if (e.currentTarget === lossTooltipRef.current) {
            createTooltip(lossTooltipRef, content);
        }
    };

    // Debug logging for tooltip state changes
    useEffect(() => {
        console.log('Tooltip Props Changed:');
    }, []);

    // Handle the creation of the floating tooltip
    useEffect(() => {
        return () => {
            console.log('Cleaning up tooltip');
        };
    }, []);

    console.log('Component Render - Props:', { sectorId, filters });

    // Determine which ID to use for the API call
    const targetSectorId = filters.subSectorId || sectorId;
    console.log('Target Sector ID:', targetSectorId);

    // Track previous values for debugging
    const prevTargetSectorIdRef = useRef(targetSectorId);
    useEffect(() => {
        if (prevTargetSectorIdRef.current !== targetSectorId) {
            console.log('Target Sector ID Changed:', {
                from: prevTargetSectorIdRef.current,
                to: targetSectorId
            });
            prevTargetSectorIdRef.current = targetSectorId;
        }
    }, [targetSectorId]);

    const { data: apiResponse, isLoading, error } = useQuery<ApiResponse>(
        ["sectorImpact", targetSectorId, filters],
        async () => {
            console.log('Fetching data for:', { targetSectorId, filters });

            if (!targetSectorId) throw new Error("Sector ID is required");

            const params = new URLSearchParams({ sectorId: targetSectorId });

            // Add all filter values that are not null or empty
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== "") {
                    // Convert dates to proper format if needed
                    if (key === 'fromDate' || key === 'toDate') {
                        params.append(key, value);
                    } else {
                        params.append(key, value);
                    }
                }
            });

            console.log('API Request URL:', `/api/analytics/ImpactonSectors?${params}`);

            const response = await fetch(`/api/analytics/ImpactonSectors?${params}`);
            if (!response.ok) {
                console.error('API Error:', response.status, response.statusText);
                throw new Error("Failed to fetch sector impact data");
            }
            const data = await response.json();
            console.log('API Response:', data);
            return data;
        },
        {
            enabled: !!targetSectorId,
            staleTime: 0, // Disable stale time to always fetch fresh data
            cacheTime: 0, // Disable cache to force refetch
            refetchOnWindowFocus: false,
            onSuccess: (data) => {
                console.log('Query Success - New Data:', data);
            },
            onError: (error) => {
                console.error('Query Error:', error);
            }
        }
    );

    const { data: sectorsData } = useQuery<{ sectors: Sector[] }>("sectors", async () => {
        const response = await fetch("/api/analytics/sectors");
        if (!response.ok) throw new Error("Failed to fetch sectors");
        return response.json();
    });

    // Log state changes
    useEffect(() => {
        console.log('State Update:', {
            isLoading,
            hasError: !!error,
            hasData: !!apiResponse,
            data: apiResponse?.data
        });
    }, [isLoading, error, apiResponse]);

    // Loading state
    if (isLoading) {
        return (
            <section className="dts-page-section">
                <div className="mg-container">
                    <div className="animate-pulse">
                        <div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>
            </section>
        );
    }

    // Error state
    if (error) {
        console.log('Rendering error state:', error);
        return renderEmptyState("An error occurred while fetching the data. Please try again.");
    }

    // Empty state - no sector selected
    if (!targetSectorId) {
        console.log('Rendering empty state');
        return renderEmptyState("Please select a sector to view impact data.");
    }

    // Empty state - no data available
    if (!apiResponse?.data ||
        (apiResponse.data.eventCount === 0 &&
            Object.keys(apiResponse.data.eventsOverTime).length === 0)) {
        console.log('Rendering empty state');
        return renderEmptyState();
    }

    const { data } = apiResponse;
    console.log('Processing data for render:', data);

    // Transform time series data with proper typing and logging
    const eventsData = Object.entries(data.eventsOverTime)
        .map(([year, count]) => {
            const transformedData = {
                year: parseInt(year),
                count: parseInt(count)
            };
            console.log('Transformed event data:', transformedData);
            return transformedData;
        })
        .sort((a, b) => a.year - b.year);

    const damageData = Object.entries(data.damageOverTime)
        .map(([year, amount]) => {
            const transformedData = {
                year: parseInt(year),
                amount: parseFloat(amount)
            };
            console.log('Transformed damage data:', transformedData);
            return transformedData;
        })
        .sort((a, b) => a.year - b.year);

    const lossData = Object.entries(data.lossOverTime)
        .map(([year, amount]) => {
            const transformedData = {
                year: parseInt(year),
                amount: parseFloat(amount)
            };
            console.log('Transformed loss data:', transformedData);
            return transformedData;
        })
        .sort((a, b) => a.year - b.year);

    console.log('Final transformed data:', {
        eventsData,
        damageData,
        lossData
    });

    const totalDamage = calculateTotal(damageData);
    const totalLoss = calculateTotal(lossData);

    const renderTitle = () => {
        if (!sectorsData?.sectors) return "Sector Impact Analysis";

        const selectedSector = sectorsData.sectors.find((s: Sector) => s.id.toString() === sectorId);
        if (!selectedSector) return "Sector Impact Analysis";

        if (filters.subSectorId) {
            const selectedSubSector = selectedSector.subsectors?.find(
                (sub: Sector) => sub.id.toString() === filters.subSectorId
            );
            if (selectedSubSector) {
                return `Impact in ${selectedSubSector.sectorname} (${selectedSector.sectorname} Sector)`;
            }
        }

        return `Impact in ${selectedSector.sectorname} Sector`;
    };

    return (
        <section className="dts-page-section" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <div className="mg-container" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <h2 className="dts-heading-2">{renderTitle()}</h2>
                <p>These summaries represent disaster impact on all sectors combined. More explanation needed here.</p>

                {/* First Grid: Events Count and Timeline */}
                <div className="mg-grid mg-grid__col-3">
                    {/* Events Count */}
                    <div className="dts-data-box">
                        <h3 className="dts-body-label">
                            <span id="elementId01">Events impacting sectors</span>
                            <button
                                ref={eventsImpactingRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(eventsImpactingRef, "Total number of events that have impacted this sector")}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div className="dts-indicator dts-indicator--target-box-g">
                            <span>{data.eventCount}</span>
                        </div>
                    </div>

                    {/* Events Timeline */}
                    <div className="dts-data-box mg-grid__col--span-2">
                        <h3 className="dts-body-label">
                            <span id="elementId02">Events over time</span>
                            <button
                                ref={eventsOverTimeRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(eventsOverTimeRef, "Distribution of events over time showing frequency and patterns")}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div style={{ height: "300px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={eventsData}>
                                    <defs>
                                        <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis
                                        tickFormatter={(value) => Math.round(value).toString()}
                                        allowDecimals={false}
                                        domain={[0, 'auto']}
                                    />
                                    <RechartsTooltip content={<CustomTooltip title="Events" />} />
                                    <Area type="monotone" dataKey="count" stroke="#8884d8" fill="url(#eventGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Second Grid: Damage and Loss - Now 2 columns */}
                <div className="mg-grid mg-grid__col-2">
                    {/* Damage Box */}
                    <div className="dts-data-box">
                        <h3 className="dts-body-label">
                            <span id="elementId03">Damage in USD</span>
                            <button
                                ref={damageTooltipRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(damageTooltipRef, "Total monetary damage caused by events in this sector")}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div className="dts-indicator dts-indicator--target-box-d">
                            <span>{formatCurrency(totalDamage)}</span>
                        </div>
                        <div style={{ height: "200px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={damageData}>
                                    <defs>
                                        <linearGradient id="damageGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis
                                        tickFormatter={(value) => `$${formatNumber(value)}`}
                                        domain={[0, 'auto']}
                                        width={100}
                                    />
                                    <RechartsTooltip content={<CustomTooltip title="Damage" formatter={(value: number) => formatCurrency(value)} />} />
                                    <Area type="monotone" dataKey="amount" stroke="#82ca9d" fill="url(#damageGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Loss Box */}
                    <div className="dts-data-box">
                        <h3 className="dts-body-label">
                            <span id="elementId04">Losses in USD</span>
                            <button
                                ref={lossTooltipRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(lossTooltipRef, "Total financial losses incurred in this sector")}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div className="dts-indicator dts-indicator--target-box-c">
                            <span>{formatCurrency(totalLoss)}</span>
                        </div>
                        <div style={{ height: "200px" }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={lossData}>
                                    <defs>
                                        <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" />
                                    <YAxis
                                        tickFormatter={(value) => `$${formatNumber(value)}`}
                                        domain={[0, 'auto']}
                                        width={100}
                                    />
                                    <RechartsTooltip content={<CustomTooltip title="Loss" formatter={(value: number) => formatCurrency(value)} />} />
                                    <Area type="monotone" dataKey="amount" stroke="#ffc658" fill="url(#lossGradient)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// Helper Components
const StatCard = ({ title, value, tooltipContent }: { title: string; value: string; tooltipContent?: string }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (tooltipContent && cardRef.current) {
            createFloatingTooltip({
                content: tooltipContent,
                target: cardRef.current,
                placement: 'top',
                offsetValue: 8
            });
        }
    }, [tooltipContent]);

    return (
        <div
            ref={cardRef}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-3xl font-semibold text-indigo-600">{value}</p>
        </div>
    );
};

const ChartCard: React.FC<{
    title: string;
    children: React.ReactNode;
}> = ({ title, children }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        {children}
    </div>
);

// Empty state renderer
const renderEmptyState = (message: string = "No data available for the selected filters.") => (
    <div className="dts-placeholder" style={{ textAlign: "center", padding: "1rem" }}>
        <p>{message}</p>
    </div>
);

export default ImpactOnSector;
