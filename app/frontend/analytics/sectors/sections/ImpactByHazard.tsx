import { useState, useCallback, useEffect } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { LoadingSpinner } from "~/frontend/components/LoadingSpinner";
import { ErrorMessage } from "~/frontend/components/ErrorMessage";
import { formatCurrencyWithCode } from "~/frontend/utils/formatters";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import createClientLogger from "~/utils/clientLogger";

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

// Initialize component loggers with appropriate context
const logger = createClientLogger('ImpactByHazard', {
    feature: 'analytics',
    section: 'sectors',
    chartType: 'pie-charts'
});

// Create specialized loggers for different categories
const apiLogger = logger.withTags({
    category: 'api-call',
    operation: 'data-fetch',
    businessCritical: true
});

const dataLogger = logger.withTags({
    category: 'data-processing',
    operation: 'chart-preparation'
});

const chartLogger = logger.withTags({
    category: 'ui-rendering',
    component: 'pie-chart'
});

const errorLogger = logger.withTags({
    category: 'error-handling',
    priority: 'high'
});

// Colors for the pie chart slices
// const COLORS = [
//     "#003561", // Corporate Blue (Dark)
//     "#004F91", // Corporate Blue (Brand)
//     "#106C8B", // Corporate Blue
//     "#6093BD", // Corporate Blue (Lighter)
//     "#9ABDD6", // Corporate Blue (Lightest)
// ];

const COLORS = [
    "#205375", // A dark blue from UNDRR Blue (corporate blue)
    "#FAA635", // A vivid orange from Target C (loss)
    "#F45D01", // A deeper orange from Target C
    "#68B3C8", // A light blue from UNDRR Teal (secondary shades)
    "#F7B32B", // A bright yellow from Target C
];

interface ImpactByHazardProps {
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

const CustomTooltip = ({ active, payload, title, currency }: any) => {
    const defaultCurrency = currency;

    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const formattedPercentage = `${Math.round(data.value)}%`;

        // Get color using the payload's index
        const segmentIndex = data.index || 0;
        const segmentColor = COLORS[segmentIndex % COLORS.length];

        const isLightColor = (color: string) => {
            try {
                const hex = color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                return brightness > 128;
            } catch (error) {
                return false;
            }
        };
        const textColor = isLightColor(segmentColor) ? '#000000' : '#FFFFFF';

        // Check if formatting as currency or count is needed
        let formattedValue = data.rawValue;
        if (title === "Number of Disaster Events") {
            formattedValue = `${data.rawValue}`;
        } else {
            // Use formatCurrencyWithCode for damages and losses
            const numericValue = typeof data.rawValue === 'string' ? parseFloat(data.rawValue) : Number(data.rawValue);
            formattedValue = formatCurrencyWithCode(
                numericValue,
                defaultCurrency,
                {},
                numericValue >= 1_000_000_000 ? 'billions' :
                    numericValue >= 1_000_000 ? 'millions' :
                        numericValue >= 1_000 ? 'thousands' :
                            undefined
            );
        }

        return (
            <div className="custom-tooltip" style={{
                backgroundColor: segmentColor,
                padding: '10px',
                border: `2px solid ${segmentColor}`,
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                color: textColor,
                transition: 'all 0.2s ease',
                minWidth: '150px'
            }}>
                <p style={{
                    margin: '0 0 4px 0',
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>{`${data.name}: ${formattedPercentage}`}</p>
                {formattedValue && (
                    <p style={{
                        margin: 0,
                        fontSize: '13px',
                        opacity: 0.9
                    }}>
                        {title === "Number of Disaster Events"
                            ? `Count: ${formattedValue}`
                            : `Value: ${formattedValue}`}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const CustomPieChart = ({ data, title, currency }: { data: any[], title: string, currency: string }) => {
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

    const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value, index }: any) => {
        const RADIAN = Math.PI / 180;
        // Increase radius to push labels further out consistently
        const radius = outerRadius * 1.4; // Increased from 1.1 to 1.4 for more spacing
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Only show if percentage is significant enough
        if (percent < 0.03) return null;

        // Format the percentage - round to whole number
        const formattedPercentage = `${Math.round(value)}%`;

        // Get the segment color
        const segmentColor = COLORS[index % COLORS.length];

        // Handle long names by splitting into multiple lines
        const words = name.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            if (currentLine && (currentLine.length + word.length + 1) > 15) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = currentLine ? `${currentLine} ${word}` : word;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Calculate vertical offset based on number of lines
        const lineHeight = 1.2;
        const totalHeight = lines.length * lineHeight;
        const initialDY = -(totalHeight / 2) + (lineHeight / 2);

        return (
            <text
                x={x}
                y={y}
                fill={segmentColor}
                textAnchor={x > cx ? 'start' : 'end'}
                style={{
                    fontSize: '12px',
                    fontWeight: 'normal',
                }}
            >
                {lines.map((line, i) => (
                    <tspan
                        key={i}
                        x={x}
                        dy={i === 0 ? `${initialDY}em` : `${lineHeight}em`}
                    >
                        {line}
                    </tspan>
                ))}
                <tspan
                    x={x}
                    dy={`${lineHeight}em`}
                >
                    ({formattedPercentage})
                </tspan>
            </text>
        );
    };

    const renderLegendText = (value: string, entry: any) => {
        return (
            <span style={{
                color: activeIndex === entry.index ? '#000' : '#666',
                fontWeight: activeIndex === entry.index ? 'bold' : 'normal'
            }}>
                {`${value}`}
            </span>
        );
    };

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
        index
    }));

    // Add structured logging for chart data preparation
    chartLogger.debug('Chart data prepared for rendering', {
        chartTitle: title,
        dataPointCount: dataWithIndex.length,
        hasValidData: dataWithIndex.length > 0,
        totalValue: dataWithIndex.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0)
    });

    return (
        <div className="dts-data-box">
            <h3 className="dts-body-label">
                <span>{title}</span>
            </h3>
            <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dataWithIndex}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={50}
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
                            {dataWithIndex.map((_item, index) => (
                                <Cell
                                    key={index}
                                    fill={COLORS[index % COLORS.length]}
                                    opacity={activeIndex === index ? 1 : 0.8}
                                    strokeWidth={activeIndex === index ? 2 : 0}
                                    stroke={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip title={title} currency={currency}/>} />
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

function ImpactByHazardComponent({ filters, currency }: ImpactByHazardProps) {
    const enabled = !!filters.sectorId;
    const targetSectorId = filters.subSectorId || filters.sectorId;
    // const defaultCurrency = useDefaultCurrency();

    const queryParams = new URLSearchParams();
    if (targetSectorId) queryParams.set("sectorId", targetSectorId);
    if (filters.hazardTypeId) queryParams.set("hazardTypeId", filters.hazardTypeId);
    if (filters.hazardClusterId) queryParams.set("hazardClusterId", filters.hazardClusterId);
    if (filters.specificHazardId) queryParams.set("specificHazardId", filters.specificHazardId);
    if (filters.fromDate) queryParams.set("fromDate", filters.fromDate);
    if (filters.toDate) queryParams.set("toDate", filters.toDate);
    if (filters.geographicLevelId) queryParams.set("geographicLevelId", filters.geographicLevelId);
    if (filters.disasterEventId) queryParams.set("disasterEventId", filters.disasterEventId);

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
            const fetchStartTime = performance.now();
            apiLogger.info('Fetching hazard impact data', {
                targetSectorId,
                hasFilters: Object.values(filters).some(value => value !== null),
                filterCount: queryParams.toString().split('&').length,
                queryParamsCount: queryParams.toString().split('&').length
            });

            const response = await fetch(`/api/analytics/hazardImpact?${queryParams}`);
            if (!response.ok) {
                throw new Error("Failed to fetch hazard impact data");
            }

            const result = await response.json();
            const fetchEndTime = performance.now();

            apiLogger.info('Hazard impact data received', {
                success: result.success,
                hasEventsData: !!(result.data?.eventsCount?.length),
                hasDamagesData: !!(result.data?.damages?.length),
                hasLossesData: !!(result.data?.losses?.length),
                responseSize: JSON.stringify(result).length,
                fetchTimeMs: fetchEndTime - fetchStartTime,
                isSlowRequest: (fetchEndTime - fetchStartTime) > 2000
            });
            return result as HazardImpactResponse;
        },
        enabled
    });

    // Add component lifecycle logging
    useEffect(() => {
        logger.info('ImpactByHazard component mounted', {
            hasTargetSector: !!targetSectorId,
            isEnabled: enabled,
            filterCount: Object.values(filters).filter(Boolean).length
        });

        return () => {
            logger.debug('ImpactByHazard component unmounting');
        };
    }, []);

    if (!enabled) {
        logger.warn('Component disabled - no sector selected', {
            reason: 'no_sector_selected'
        });
        return <div className="text-gray-500">Please select a sector to view hazard impact data.</div>;
    }

    if (isLoading) {
        logger.debug('Component in loading state', {
            targetSectorId,
            hasFilters: Object.values(filters).some(value => value !== null)
        });
        return <LoadingSpinner />;
    }

    if (error || !data?.success) {
        errorLogger.error('Failed to load hazard impact data', {
            errorMessage: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            targetSectorId,
            hasFilters: Object.values(filters).some(value => value !== null),
            apiEndpoint: `/api/analytics/hazardImpact?${queryParams}`
        });
        return <ErrorMessage message="Failed to load hazard impact data" />;
    }

    if (!data?.data?.eventsCount || !data?.data?.damages || !data?.data?.losses) {
        errorLogger.error('Invalid data structure received from API', {
            hasData: !!data,
            hasSuccess: data?.success,
            hasDataProperty: !!(data?.data),
            expectedProperties: ['eventsCount', 'damages', 'losses'],
            receivedProperties: data?.data ? Object.keys(data.data) : [],
            dataStructure: typeof data
        });
        return <ErrorMessage message="Invalid data structure received from server" />;
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

                // Recursively check deeper subsectors
                for (const sub of sector.subsectors) {
                    if (sub.subsectors && sub.subsectors.length > 0) {
                        const result = findSectorWithParent(sub.subsectors, targetId);
                        if (result.sector) {
                            return { sector: result.sector, parent: sub };
                        }
                    }
                }
            }
        }
        return { sector: undefined, parent: undefined };
    };

    // Construct title based on sector/subsector selection
    const sectionTitle = () => {
        if (!sectorsData?.sectors) return "Impact by Hazard Type";

        if (filters.sectorId) {
            const { sector } = findSectorWithParent(sectorsData.sectors, filters.sectorId);

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

    const formatChartData = (rawData: any[] | null) => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return { data: [], dataAvailability: 'no_data' };
        }

        // Check if all values are zero
        const allZero = rawData.every(item => {
            // Ensure proper parsing of string values
            const value = typeof item.value === 'string' ? parseFloat(item.value) : Number(item.value);
            return !isNaN(value) && value === 0;
        });

        if (allZero) {
            return { data: [], dataAvailability: 'zero' };
        }

        // Filter out null values and undefined names, but keep non-zero values
        const filteredData = rawData
            .filter(item => {
                // Ensure proper parsing of string values
                const value = typeof item.value === 'string' ? parseFloat(item.value) : Number(item.value);
                return !isNaN(value) && value > 0 && item.hazardName != null;
            })
            .map((item, index) => ({
                name: item.hazardName || 'Unknown',
                value: item.percentage || 0,
                rawValue: item.value || '0',
                // Add index to help with color assignment in the chart
                index
            }));

        dataLogger.info('Chart data filtering completed', {
            originalCount: rawData?.length || 0,
            filteredCount: filteredData.length,
            dataAvailability: filteredData.length > 0 ? 'available' : 'no_data',
            hasZeroValues: allZero
        });

        return {
            data: filteredData.length > 0 ? filteredData : [],
            dataAvailability: filteredData.length > 0 ? 'available' : 'no_data'
        };
    };

    // Process the data with performance tracking
    const processingStartTime = performance.now();
    const eventsResult = formatChartData(data?.data?.eventsCount ?? []);
    const damagesResult = formatChartData(data?.data?.damages ?? []);
    const lossesResult = formatChartData(data?.data?.losses ?? []);
    const processingEndTime = performance.now();

    // Add structured logging for data processing
    dataLogger.info('Data processing completed', {
        eventsAvailability: eventsResult.dataAvailability,
        damagesAvailability: damagesResult.dataAvailability,
        lossesAvailability: lossesResult.dataAvailability,
        totalChartsWithData: [eventsResult, damagesResult, lossesResult]
            .filter(result => result.dataAvailability === 'available').length,
        processingTimeMs: processingEndTime - processingStartTime,
        dataSize: data ? JSON.stringify(data).length : 0,
        isSlowProcessing: (processingEndTime - processingStartTime) > 500
    });

    if (!data?.success || !data?.data) {
        errorLogger.error('Invalid data structure after processing', {
            hasData: !!data,
            hasSuccess: !!data?.success,
            hasDataProperty: !!(data?.data),
            processingResults: {
                events: eventsResult.dataAvailability,
                damages: damagesResult.dataAvailability,
                losses: lossesResult.dataAvailability
            }
        });
        return <ErrorMessage message="Invalid data structure received from server" />;
    }

    return (
        <section className="dts-page-section" style={{ maxWidth: "100%", overflow: "hidden" }}>
            <div className="mg-container" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <h2 className="dts-heading-2">{sectionTitle()}</h2>
                <p className="dts-body-text mb-6">Analysis of how different hazards affect this sector</p>

                <div className="mg-grid mg-grid__col-3">
                    {/* Number of Disaster Events */}
                    <div className="dts-data-box">
                        {eventsResult.dataAvailability === 'available' ? (
                            <CustomPieChart data={eventsResult.data} title="Number of Disaster Events" currency={currency} />
                        ) : eventsResult.dataAvailability === 'zero' ? (
                            <>
                                <h3 className="dts-body-label mb-2">Number of Disaster Events</h3>
                                <p className="text-gray-500 text-center mt-4">Zero Impact (Confirmed)</p>
                            </>
                        ) : (
                            <>
                                <h3 className="dts-body-label mb-2">Number of Disaster Events</h3>
                                <EmptyChartPlaceholder height={300} />
                            </>
                        )}
                    </div>

                    {/* Damages by Hazard Type */}
                    <div className="dts-data-box">
                        {damagesResult.dataAvailability === 'available' ? (
                            <CustomPieChart data={damagesResult.data} title="Damages by Hazard Type" currency={currency}/>
                        ) : damagesResult.dataAvailability === 'zero' ? (
                            <>
                                <h3 className="dts-body-label mb-2">Damages by Hazard Type</h3>
                                <p className="text-gray-500 text-center mt-4">Zero Impact (Confirmed)</p>
                            </>
                        ) : (
                            <>
                                <h3 className="dts-body-label mb-2">Damages by Hazard Type</h3>
                                <EmptyChartPlaceholder height={300} />
                            </>
                        )}
                    </div>

                    {/* Losses by Hazard Type */}
                    <div className="dts-data-box">
                        {lossesResult.dataAvailability === 'available' ? (
                            <CustomPieChart data={lossesResult.data} title="Losses by Hazard Type" currency={currency} />
                        ) : lossesResult.dataAvailability === 'zero' ? (
                            <>
                                <h3 className="dts-body-label mb-2">Losses by Hazard Type</h3>
                                <p className="text-gray-500 text-center mt-4">Zero Impact (Confirmed)</p>
                            </>
                        ) : (
                            <>
                                <h3 className="dts-body-label mb-2">Losses by Hazard Type</h3>
                                <EmptyChartPlaceholder height={300} />
                            </>
                        )}
                    </div>
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