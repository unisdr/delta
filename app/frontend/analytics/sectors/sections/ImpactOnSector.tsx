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
import { formatCurrencyWithCode, formatNumber, formatPercentage, useDefaultCurrency } from "~/frontend/utils/formatters";
import { useLoaderData } from "@remix-run/react";

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
        dataAvailability: {
            damage: string;
            loss: string;
        };
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
    filters: {
        disasterEventId: any;
        sectorId: string | null;
        hazardTypeId: string | null;
        hazardClusterId: string | null;
        specificHazardId: string | null;
        geographicLevelId: string | null;
        fromDate: string | null;
        toDate: string | null;
        subSectorId: string | null;
    };
    currency: string;
}

interface Sector {
    id: number;
    sectorname: string;
    subsectors?: Sector[];
}

interface Hazard {
    id: string | number;
    name: string;
}

interface HazardTypesResponse {
    hazardTypes: Hazard[];
}

interface HazardClustersResponse {
    clusters: Hazard[];
}

interface SpecificHazardsResponse {
    hazards: Hazard[];
}

// Utility functions
const calculateTotal = (data: { year: number; amount: number }[]) => {
    return data.reduce((acc, curr) => acc + curr.amount, 0);
};

// Transform time series data
const transformTimeSeriesData = (data: Record<string, string>) => {
    return Object.entries(data)
        .map(([year, value]) => ({
            year: parseInt(year),
            amount: parseFloat(value)
        }))
        .sort((a, b) => a.year - b.year);
};

// Custom tooltip for charts
interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
    title: string;
    formatter: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, title, formatter }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip" style={{
                backgroundColor: 'white',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '4px'
            }}>
                <p style={{ margin: 0 }}>{`Year: ${label}`}</p>
                <p style={{ margin: 0, color: payload[0].color }}>
                    {`${title}: ${formatter(payload[0].value)}`}
                </p>
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
    const prevGeographicLevelRef = useRef(filters.geographicLevelId);

    useEffect(() => {
        if (prevTargetSectorIdRef.current !== targetSectorId) {
            console.log('Target Sector ID Changed:', {
                from: prevTargetSectorIdRef.current,
                to: targetSectorId
            });
            prevTargetSectorIdRef.current = targetSectorId;
        }
        if (prevGeographicLevelRef.current !== filters.geographicLevelId) {
            console.log('Geographic Level Changed:', {
                from: prevGeographicLevelRef.current,
                to: filters.geographicLevelId
            });
            prevGeographicLevelRef.current = filters.geographicLevelId;
        }
    }, [targetSectorId, filters.geographicLevelId]);

    const { data: apiResponse, error, isLoading } = useQuery<ApiResponse>(
        ["sectorImpact", targetSectorId, filters],
        async () => {
            console.log('Fetching data for:', { targetSectorId, filters });

            if (!targetSectorId) throw new Error("Sector ID is required");

            const params = new URLSearchParams();

            // Add sector ID first
            params.append("sectorId", targetSectorId);

            // Add other filters, but exclude sectorId and subSectorId since we handle those separately
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== "" && key !== "sectorId" && key !== "subSectorId") {
                    params.append(key, value.toString());
                    console.log(`Adding filter: ${key}=${value}`);
                }
            });

            console.log('API Request URL:', `/api/analytics/ImpactonSectors?${params}`);

            const response = await fetch(`/api/analytics/ImpactonSectors?${params}`);
            if (!response.ok) {
                console.error('API Error:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('API Error Details:', errorText);
                throw new Error("Failed to fetch sector impact data");
            }
            const data = await response.json();
            console.log('API Response:', data);
            return data;
        },
        {
            enabled: !!targetSectorId,
            staleTime: 0,
            cacheTime: 0,
            refetchOnWindowFocus: false,
            retry: 1,
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

    // Fetch hazard types data
    const { data: hazardTypesData } = useQuery<HazardTypesResponse>(
        ["hazardTypes", filters.hazardTypeId],
        async () => {
            const response = await fetch(`/api/analytics/hazard-types`);
            if (!response.ok) throw new Error("Failed to fetch hazard types");
            return response.json();
        }
    );

    // Fetch hazard clusters data
    const { data: hazardClustersData } = useQuery<HazardClustersResponse>(
        ["hazardClusters", filters.hazardClusterId],
        async () => {
            if (!filters.hazardTypeId) return { clusters: [] };
            const response = await fetch(`/api/analytics/hazard-clusters?hazardTypeId=${filters.hazardTypeId}`);
            if (!response.ok) throw new Error("Failed to fetch hazard clusters");
            return response.json();
        },
        {
            enabled: !!filters.hazardTypeId
        }
    );

    // Fetch specific hazards data
    const { data: specificHazardsData } = useQuery<SpecificHazardsResponse>(
        ["specificHazards", filters.hazardClusterId],
        async () => {
            if (!filters.hazardClusterId) return { hazards: [] };
            const response = await fetch(`/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}`);
            if (!response.ok) throw new Error("Failed to fetch specific hazards");
            return response.json();
        },
        {
            enabled: !!filters.hazardClusterId
        }
    );

    // Get hazard type display text
    const getHazardTypeDisplay = () => {
        if (filters.specificHazardId && specificHazardsData?.hazards) {
            const hazard = specificHazardsData.hazards.find(h => h.id.toString() === filters.specificHazardId);
            return hazard?.name || 'Specific Hazards';
        }
        if (filters.hazardClusterId && hazardClustersData?.clusters) {
            const cluster = hazardClustersData.clusters.find(c => c.id.toString() === filters.hazardClusterId);
            return cluster?.name || 'Hazard Cluster';
        }
        if (filters.hazardTypeId && hazardTypesData?.hazardTypes) {
            const type = hazardTypesData.hazardTypes.find(t => t.id.toString() === filters.hazardTypeId);
            return type?.name || 'Hazard Type';
        }
        return 'All Hazards';
    };

    const currency = useDefaultCurrency();

    // Format money values with appropriate scale
    const formatMoneyValue = (value: number) => {
        return formatCurrencyWithCode(
            value,
            currency,
            {},
            value >= 1_000_000_000 ? 'billions' :
                value >= 1_000_000 ? 'millions' :
                    value >= 1_000 ? 'thousands' :
                        undefined
        );
    };

    console.log('Debug - Component State:', {
        sectorId,
        hasError: !!error,
        isLoading,
        hasData: !!apiResponse,
        apiResponseData: apiResponse?.data
    });

    if (isLoading) {
        console.log('Debug - Loading state');
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
        console.log('Debug - Error state:', error);
        return (
            <div className="dts-data-box">
                <h3 className="dts-body-label">
                    <span>Error</span>
                </h3>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500">An error occurred while fetching the data. Please try again.</p>
                </div>
            </div>
        );
    }

    // Empty state - no sector selected
    if (!targetSectorId) {
        console.log('Debug - No sector selected state');
        return (
            <div className="dts-data-box">
                <h3 className="dts-body-label">
                    <span>No Sector Selected</span>
                </h3>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500">Please select a sector to view impact data.</p>
                </div>
            </div>
        );
    }

    if (!apiResponse?.data) {
        console.log('Debug - No data state');
        return (
            <div className="dts-data-box">
                <h3 className="dts-body-label">
                    <span>No Data Available</span>
                </h3>
                <div className="flex items-center justify-center h-[300px]">
                    <p className="text-gray-500">No impact data available for the selected filters.</p>
                </div>
            </div>
        );
    }

    // Extract the data from the API response
    const data = apiResponse?.data || {};

    // Add debug logging for the data that will be used for display
    console.log('Data for display:', {
        apiResponseExists: !!apiResponse,
        dataExists: !!data,
        eventCount: data.eventCount,
        totalDamage: data.totalDamage,
        totalLoss: data.totalLoss,
        dataAvailability: data.dataAvailability
    });

    // Transform time series data with proper typing and logging
    const eventsData = Object.entries(data.eventsOverTime || {})
        .map(([year, count]) => ({
            year: parseInt(year),
            count: parseInt(count as string) || 0,
        }))
        .filter((entry) => {
            if (!filters.fromDate && !filters.toDate) return true;
            const yearNum = entry.year;
            const fromYear = filters.fromDate ? parseInt(filters.fromDate.split('-')[0]) : 0;
            const toYear = filters.toDate ? parseInt(filters.toDate.split('-')[0]) : 9999;
            return yearNum >= fromYear && yearNum <= toYear;
        })
        .sort((a, b) => a.year - b.year);

    // Get the reference year from events data or filters
    const referenceYear = eventsData.length > 0 ? eventsData[0].year :
        filters.fromDate ? parseInt(filters.fromDate.split('-')[0]) :
        new Date().getFullYear();

    // Fix damage data transformation to ensure it properly handles string values and zero impact
    const damageData = data?.dataAvailability?.damage === 'zero'
        ? [{ year: referenceYear, amount: 0 }]
        : Object.entries(data.damageOverTime || {})
            .map(([year, amount]) => {
                const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
                return {
                    year: parseInt(year),
                    amount: isNaN(parsedAmount) ? 0 : parsedAmount,
                };
            })
            .filter((entry) => {
                if (!filters.fromDate && !filters.toDate) return true;
                const yearNum = entry.year;
                const fromYear = filters.fromDate ? parseInt(filters.fromDate.split('-')[0]) : 0;
                const toYear = filters.toDate ? parseInt(filters.toDate.split('-')[0]) : 9999;
                return yearNum >= fromYear && yearNum <= toYear;
            })
            .sort((a, b) => a.year - b.year);

    // Fix loss data transformation to ensure it properly handles string values and zero impact
    const lossData = data?.dataAvailability?.loss === 'zero'
        ? [{ year: referenceYear, amount: 0 }]
        : Object.entries(data.lossOverTime || {})
            .map(([year, amount]) => {
                const parsedAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
                return {
                    year: parseInt(year),
                    amount: isNaN(parsedAmount) ? 0 : parsedAmount,
                };
            })
            .filter((entry) => {
                if (!filters.fromDate && !filters.toDate) return true;
                const yearNum = entry.year;
                const fromYear = filters.fromDate ? parseInt(filters.fromDate.split('-')[0]) : 0;
                const toYear = filters.toDate ? parseInt(filters.toDate.split('-')[0]) : 9999;
                return yearNum >= fromYear && yearNum <= toYear;
            })
            .sort((a, b) => a.year - b.year);

    console.log('Final transformed data:', {
        eventsData,
        damageData,
        lossData,
        rawDamage: data.totalDamage,
        rawLoss: data.totalLoss
    });

    const totalDamage = calculateTotal(damageData);
    const totalLoss = calculateTotal(lossData);

    const renderTitle = () => {
        if (!sectorsData?.sectors) return "Sector Impact Analysis";

        // First check if we're using a subsector ID from filters
        if (filters.subSectorId) {
            // Find the parent sector that contains this subsector
            for (const sector of sectorsData.sectors) {
                const subsector = sector.subsectors?.find(
                    (sub: Sector) => sub.id.toString() === filters.subSectorId
                );
                if (subsector) {
                    return `Impact in ${subsector.sectorname} (${sector.sectorname} Sector)`;
                }
            }
        }

        // If we're using the main sectorId
        if (sectorId) {
            const selectedSector = sectorsData.sectors.find((s: Sector) => s.id.toString() === sectorId);
            if (selectedSector) {
                return `Impact in ${selectedSector.sectorname} Sector`;
            }
        }

        return "Sector Impact Analysis";
    };

    return (
        <section className="dts-page-section" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <div className="mg-container" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <h2 className="dts-heading-2">{renderTitle()}</h2>
                <p className="text-sm text-gray-600 mb-4">
                    This dashboard shows the aggregated impact data for the selected sector, including all its subsectors.
                </p>
                {/* Events impacting sectors */}
                <div className="mg-grid mg-grid--gap-default">
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
                            {/* <span>{data?.eventCount ? formatNumber(data.eventCount) : "No data available"}</span> */}
                            <span>
                                {eventsData.length > 0
                                    ? formatNumber(eventsData.reduce((sum, event) => sum + event.count, 0))
                                    : "No data available"}
                            </span>
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
                            {eventsData && eventsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={eventsData}>
                                        <defs>
                                            <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="year" />
                                        <YAxis
                                            tickFormatter={(value) => Math.round(value).toString()}
                                            allowDecimals={false}
                                            domain={[0, 'auto']}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => (
                                                <CustomTooltip
                                                    active={active}
                                                    payload={payload}
                                                    label={label}
                                                    title="Events"
                                                    formatter={formatNumber}
                                                />
                                            )}
                                        />
                                        <Area type="linear" dataKey="count" stroke="#8884d8" fill="url(#eventGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Damage and Loss Section */}
                <div className="mg-grid mg-grid--gap-default">
                    {/* Damage Box */}
                    <div className="dts-data-box">
                        <h3 className="dts-body-label">
                            <span id="elementId03">Damages in {currency} due to {getHazardTypeDisplay()}</span>
                            <button
                                ref={damageTooltipRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(damageTooltipRef, `Total monetary damage in ${currency} caused by events in this sector`)}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div className="dts-indicator dts-indicator--target-box-d">
                            <span>
                                {data?.dataAvailability?.damage === 'zero' ? (
                                    "Zero Impact (Confirmed)"
                                ) : data?.dataAvailability?.damage === 'no_data' ? (
                                    "No data available"
                                ) : data?.totalDamage !== undefined && data?.totalDamage !== null && data?.totalDamage !== "" ? (
                                    formatCurrencyWithCode(Number(data.totalDamage), currency)
                                ) : (
                                    "No data available"
                                )}
                            </span>
                        </div>
                        <div style={{ height: "300px" }}>
                            {damageData && damageData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={damageData}>
                                        <defs>
                                            <linearGradient id="damageGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="year" />
                                        <YAxis
                                            tickFormatter={(value) => formatMoneyValue(value)}
                                            domain={[0, 'auto']}
                                            width={100}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => (
                                                <CustomTooltip
                                                    active={active}
                                                    payload={payload}
                                                    label={label}
                                                    title="Damage"
                                                    formatter={formatMoneyValue}
                                                />
                                            )}
                                        />
                                        <Area type="linear" dataKey="amount" stroke="#82ca9d" fill="url(#damageGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No data available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loss Box */}
                    <div className="dts-data-box">
                        <h3 className="dts-body-label">
                            <span id="elementId04">Losses in {currency}</span>
                            <button
                                ref={lossTooltipRef}
                                className="dts-tooltip__button"
                                onPointerEnter={() => createTooltip(lossTooltipRef, `Total financial losses in ${currency} incurred in this sector`)}
                            >
                                <IoInformationCircleOutline aria-hidden="true" />
                            </button>
                        </h3>
                        <div className="dts-indicator dts-indicator--target-box-c">
                            <span>
                                {data?.dataAvailability?.loss === 'zero' ? (
                                    "Zero Impact (Confirmed)"
                                ) : data?.dataAvailability?.loss === 'no_data' ? (
                                    "No data available"
                                ) : data?.totalLoss !== undefined && data?.totalLoss !== null && data?.totalLoss !== "" ? (
                                    formatCurrencyWithCode(Number(data.totalLoss), currency)
                                ) : (
                                    "No data available"
                                )}
                            </span>
                        </div>
                        <div style={{ height: "300px" }}>
                            {lossData && lossData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={lossData}>
                                        <defs>
                                            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ffc658" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="year" />
                                        <YAxis
                                            tickFormatter={(value) => formatMoneyValue(value)}
                                            domain={[0, 'auto']}
                                            width={100}
                                        />
                                        <RechartsTooltip
                                            content={({ active, payload, label }) => (
                                                <CustomTooltip
                                                    active={active}
                                                    payload={payload}
                                                    label={label}
                                                    title="Loss"
                                                    formatter={formatMoneyValue}
                                                />
                                            )}
                                        />
                                        <Area type="linear" dataKey="amount" stroke="#ffc658" fill="url(#lossGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">No data available</p>
                                </div>
                            )}
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

export default ImpactOnSector;