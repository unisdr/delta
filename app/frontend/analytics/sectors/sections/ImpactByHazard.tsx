import React, { useState } from "react";
import { useQuery, QueryClient, QueryClientProvider, UseQueryOptions } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { LoadingSpinner } from "~/frontend/components/LoadingSpinner";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 0,
            gcTime: 0,
            refetchOnWindowFocus: false
        }
    }
});

// Colors for the pie chart slices
const COLORS = ["#4F81BD", "#C0504D", "#9BBB59", "#8064A2", "#4BACC6"];

interface ImpactByHazardProps {
    filters: {
        sectorId: string | null;
        hazardTypeId: string | null;
        hazardClusterId: string | null;
        specificHazardId: string | null;
        geographicLevelId: string | null;
        fromDate: string | null;
        toDate: string | null;
        subSectorId: string | null;
    };
}

interface HazardImpactResponse {
    success: boolean;
    data: {
        eventsCount: Array<{
            hazardId: number;
            hazardName: string;
            value: number;
            percentage: number;
        }>;
        damages: Array<{
            hazardId: number;
            hazardName: string;
            value: string;
            percentage: number;
        }>;
        losses: Array<{
            hazardId: number;
            hazardName: string;
            value: string;
            percentage: number;
        }>;
    };
}

interface Sector {
    id: number;
    sectorname: string;
    subsectors?: Sector[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-tooltip" style={{
                backgroundColor: 'white',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px'
            }}>
                <p style={{ margin: 0 }}>{`${data.name} - ${data.value}%`}</p>
                {data.rawValue && (
                    <p style={{ margin: 0, color: '#666' }}>
                        {typeof data.rawValue === 'string'
                            ? `Value: ${Number(data.rawValue).toLocaleString()}`
                            : `Count: ${data.rawValue}`}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const CustomPieChart = ({ data, title }: { data: any[], title: string }) => {
    const [activeIndex, setActiveIndex] = useState(-1);

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

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    const renderLegendText = (value: string, entry: any) => {
        const { payload } = entry;
        return (
            <span style={{
                color: activeIndex === entry.index ? '#000' : '#666',
                fontWeight: activeIndex === entry.index ? 'bold' : 'normal'
            }}>
                {`${value} - ${payload.value}%`}
            </span>
        );
    };

    return (
        <div className="dts-data-box">
            <h3 className="dts-body-label">
                <span>{title}</span>
            </h3>
            <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
                            startAngle={90}
                            endAngle={-270}
                            onMouseEnter={onPieEnter}
                            onMouseLeave={() => setActiveIndex(-1)}
                            animationBegin={0}
                            animationDuration={1000}
                            animationEasing="ease-out"
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index % COLORS.length]}
                                    opacity={activeIndex === index ? 1 : 0.8}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                    stroke={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            layout="horizontal"
                            formatter={renderLegendText}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(-1)}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

function ImpactByHazardComponent({ filters }: ImpactByHazardProps) {
    const enabled = !!filters.sectorId;
    const targetSectorId = filters.subSectorId || filters.sectorId;

    const queryParams = new URLSearchParams();
    if (targetSectorId) queryParams.set("sectorId", targetSectorId);
    if (filters.fromDate) queryParams.set("fromDate", filters.fromDate);
    if (filters.toDate) queryParams.set("toDate", filters.toDate);
    if (filters.geographicLevelId) queryParams.set("geographicLevelId", filters.geographicLevelId);

    // Add sectors query
    const { data: sectorsData } = useQuery({
        queryKey: ["sectors"],
        queryFn: async () => {
            const response = await fetch("/api/analytics/sectors");
            if (!response.ok) throw new Error("Failed to fetch sectors");
            return response.json() as Promise<{ sectors: Sector[] }>;
        }
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ["hazardImpact", targetSectorId, filters],
        queryFn: async () => {
            console.log('Fetching hazard impact data for:', { targetSectorId, filters });
            const response = await fetch(`/api/analytics/hazardImpact?${queryParams}`);
            if (!response.ok) {
                throw new Error("Failed to fetch hazard impact data");
            }
            const result = await response.json();
            console.log('API Response:', result);
            return result as HazardImpactResponse;
        },
        enabled
    });

    if (!enabled) {
        return <div className="text-gray-500">Please select a sector to view hazard impact data.</div>;
    }

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (error || !data?.success) {
        return <ErrorMessage message="Failed to load hazard impact data" />;
    }

    // Find the current sector and its parent
    const findSectorWithParent = (sectors: Sector[], targetId: string): { sector: Sector | undefined; parent: Sector | undefined } => {
        for (const sector of sectors) {
            // Check if this is the main sector
            if (sector.id.toString() === targetId) {
                return { sector, parent: undefined };
            }
            // Check subsectors
            if (sector.subsectors) {
                const subsector = sector.subsectors.find(sub => sub.id.toString() === targetId);
                if (subsector) {
                    return { sector: subsector, parent: sector };
                }
            }
        }
        return { sector: undefined, parent: undefined };
    };

    // Construct title based on sector/subsector selection
    const sectionTitle = () => {
        if (!sectorsData?.sectors) return "Impact by Hazard Type";

        if (filters.sectorId) {
            const { sector, parent } = findSectorWithParent(sectorsData.sectors, filters.sectorId);
            
            if (filters.subSectorId && sector) {
                // Case: Subsector is selected
                const { sector: subsector, parent: mainSector } = findSectorWithParent(sectorsData.sectors, filters.subSectorId);
                if (subsector && mainSector) {
                    return `Impact in ${subsector.sectorname} (${mainSector.sectorname} Sector) by Hazard Type`;
                }
            }

            // Case: Only sector is selected
            if (sector) {
                return `Impact in ${sector.sectorname} Sector by Hazard Type`;
            }
        }

        return "Impact by Hazard Type";
    };

    const formatChartData = (rawData: any[]) => {
        return rawData.map(item => ({
            name: item.hazardName,
            value: item.percentage,
            rawValue: item.value
        }));
    };

    const eventsData = formatChartData(data.data.eventsCount);
    const damagesData = formatChartData(data.data.damages);
    const lossesData = formatChartData(data.data.losses);

    return (
        <section className="dts-page-section" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <div className="mg-container" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <h2 className="dts-heading-2">{sectionTitle()}</h2>
                <p className="dts-body-text mb-6">Analysis of how different hazards affect this sector</p>

                <div className="mg-grid mg-grid__col-3">
                    <CustomPieChart data={eventsData} title="Number of Disaster Events" />
                    <CustomPieChart data={damagesData} title="Damages by Hazard Type" />
                    <CustomPieChart data={lossesData} title="Losses by Hazard Type" />
                </div>
            </div>
        </section>
    );
}

export default function ImpactByHazard(props: ImpactByHazardProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <ImpactByHazardComponent {...props} />
        </QueryClientProvider>
    );
}