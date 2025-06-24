import React, { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFloatingTooltip } from "~/util/tooltip";
import { IoInformationCircleOutline } from "react-icons/io5";
import {
	formatCurrencyWithCode,
	formatNumber,
	useDefaultCurrency,
} from "~/frontend/utils/formatters";
import AreaChart from "~/components/AreaChart";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";


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

// interface ImpactData {
// 	eventCount: number;
// 	totalDamage: string;
// 	totalLoss: string;
// 	eventsOverTime: { year: number; count: number }[];
// 	damageOverTime: { year: number; amount: number }[];
// 	lossOverTime: { year: number; amount: number }[];
// }

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

// Transform time series data
// const transformTimeSeriesData = (data: Record<string, string>) => {
// 	return Object.entries(data)
// 		.map(([year, value]) => ({
// 			year: parseInt(year),
// 			amount: parseFloat(value),
// 		}))
// 		.sort((a, b) => a.year - b.year);
// };

// Custom tooltip for charts
interface CustomTooltipProps {
	active?: boolean;
	payload?: any[];
	label?: string;
	title: string;
	formatter: (value: number) => string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
	active,
	payload,
	label,
	title,
	formatter,
}) => {
	if (active && payload && payload.length) {
		return (
			<div
				className="custom-tooltip"
				style={{
					backgroundColor: "white",
					padding: "10px",
					border: "1px solid #ccc",
					borderRadius: "4px",
				}}
			>
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

	const createTooltip = (
		ref: React.RefObject<HTMLButtonElement>,
		content: string
	) => {
		if (ref.current) {
			createFloatingTooltip({
				content,
				target: ref.current,
				placement: "top",
				offsetValue: 8,
			});
		}
	};

	// const handlePointerEnter = (
	// 	e: React.PointerEvent<HTMLButtonElement>,
	// 	content: string
	// ) => {
	// 	console.log("Pointer Enter Event:", {
	// 		target: e.currentTarget,
	// 		content: content,
	// 	});

	// 	if (e.currentTarget === eventsImpactingRef.current) {
	// 		createTooltip(eventsImpactingRef, content);
	// 	} else if (e.currentTarget === eventsOverTimeRef.current) {
	// 		createTooltip(eventsOverTimeRef, content);
	// 	} else if (e.currentTarget === damageTooltipRef.current) {
	// 		createTooltip(damageTooltipRef, content);
	// 	} else if (e.currentTarget === lossTooltipRef.current) {
	// 		createTooltip(lossTooltipRef, content);
	// 	}
	// };

	// Debug logging for tooltip state changes
	useEffect(() => {
		if (process.env.NODE_ENV === 'development') {
			console.log("Cleaning up tooltip");
		}
	}, []);

	// Handle the creation of the floating tooltip
	useEffect(() => {
		return () => {
			if (process.env.NODE_ENV === 'development') {
				console.log("Cleaning up tooltip");
			}
		};
	}, []);

	if (process.env.NODE_ENV === 'development') {
		console.log("Component Render", { sectorId, filters });
	}

	// Determine which ID to use for the API call
	const targetSectorId = filters.subSectorId || sectorId;
	if (process.env.NODE_ENV === 'development') {
		console.log("Target Sector ID", { targetSectorId });
	}

	// Track previous values for debugging
	const prevTargetSectorIdRef = useRef(targetSectorId);
	const prevGeographicLevelRef = useRef(filters.geographicLevelId);

	useEffect(() => {
		if (prevTargetSectorIdRef.current !== targetSectorId) {
			if (process.env.NODE_ENV === 'development') {
				console.log("Target Sector ID Changed", {
					from: prevTargetSectorIdRef.current,
					to: targetSectorId,
				});
			}
			prevTargetSectorIdRef.current = targetSectorId;
		}
		if (prevGeographicLevelRef.current !== filters.geographicLevelId) {
			if (process.env.NODE_ENV === 'development') {
				console.log("Geographic Level Changed", {
					from: prevGeographicLevelRef.current,
					to: filters.geographicLevelId,
				});
			}
			prevGeographicLevelRef.current = filters.geographicLevelId;
		}
	}, [targetSectorId, filters.geographicLevelId]);

	// const { data: apiResponse, error, isLoading } = useQuery<ApiResponse>(
	//     ["sectorImpact", targetSectorId, filters],
	//     async () => {
	//         console.log('Fetching data for:', { targetSectorId, filters });

	//         if (!targetSectorId) throw new Error("Sector ID is required");

	//         const params = new URLSearchParams();

	//         // Add sector ID first
	//         params.append("sectorId", targetSectorId);

	//         // Add other filters, but exclude sectorId and subSectorId since we handle those separately
	//         Object.entries(filters).forEach(([key, value]) => {
	//             if (value !== null && value !== undefined && value !== "" && key !== "sectorId" && key !== "subSectorId") {
	//                 params.append(key, value.toString());
	//                 console.log(`Adding filter: ${key}=${value}`);
	//             }
	//         });

	//         console.log('API Request URL:', `/api/analytics/ImpactonSectors?${params}`);

	//         const response = await fetch(`/api/analytics/ImpactonSectors?${params}`);
	//         if (!response.ok) {
	//             console.error('API Error:', response.status, response.statusText);
	//             const errorText = await response.text();
	//             console.error('API Error Details:', errorText);
	//             throw new Error("Failed to fetch sector impact data");
	//         }
	//         const data = await response.json();
	//         console.log('API Response:', data);
	//         return data;
	//     },
	//     {
	//         enabled: !!targetSectorId,
	//         staleTime: 0,
	//         cacheTime: 0,
	//         refetchOnWindowFocus: false,
	//         retry: 1,
	//         onSuccess: (data) => {
	//             console.log('Query Success - New Data:', data);
	//         },
	//         onError: (error) => {
	//             console.error('Query Error:', error);
	//         }
	//     }
	// );

	const {
		data: apiResponse,
		error,
		isLoading,
		isSuccess,
		isError,
	} = useQuery<ApiResponse>({
		queryKey: ["sectorImpact", targetSectorId, filters],
		queryFn: async () => {
			if (process.env.NODE_ENV === 'development') {
				console.log("Fetching data for:", { targetSectorId, filters });
			}

			if (!targetSectorId) throw new Error("Sector ID is required");

			const params = new URLSearchParams();

			params.append("sectorId", targetSectorId);

			Object.entries(filters).forEach(([key, value]) => {
				if (
					value !== null &&
					value !== undefined &&
					value !== "" &&
					key !== "sectorId" &&
					key !== "subSectorId"
				) {
					params.append(key, value.toString());
					if (process.env.NODE_ENV === 'development') {
						console.log(`Adding filter parameter`, { key, value });
					}
				}
			});

			if (process.env.NODE_ENV === 'development') {
				console.log("Making API request", {
					url: `/api/analytics/ImpactonSectors?${params}`,
					targetSectorId
				});
			}

			const response = await fetch(`/api/analytics/ImpactonSectors?${params}`);
			if (!response.ok) {
				console.error("API Error", {
					status: response.status,
					statusText: response.statusText
				});
				const errorText = await response.text();
				console.error("API Error Details", { errorText });
				throw new Error("Failed to fetch sector impact data");
			}
			const data = await response.json();
			if (process.env.NODE_ENV === 'development') {
				console.log("API Response:", data);
			}
			return data;
		},
		enabled: !!targetSectorId,
		staleTime: 0,
		gcTime: 0,
		refetchOnWindowFocus: false,
		retry: 1,
	});

	useEffect(() => {
		if (isSuccess && apiResponse) {
			if (process.env.NODE_ENV === 'development') {
				console.log("Query Success - New Data:", apiResponse);
			}
		}
	}, [isSuccess, apiResponse]);

	useEffect(() => {
		if (isError && error) {
			console.error("Query Error", {
				error: error instanceof Error ? error.message : String(error),
				targetSectorId
			});
		}
	}, [isError, error, targetSectorId]);

	// const { data: sectorsData } = useQuery<{ sectors: Sector[] }>("sectors", async () => {
	//     const response = await fetch("/api/analytics/sectors");
	//     if (!response.ok) throw new Error("Failed to fetch sectors");
	//     return response.json();
	// });

	const { data: sectorsData } = useQuery<{ sectors: Sector[] }>({
		queryKey: ["sectors"],
		queryFn: async () => {
			const response = await fetch("/api/analytics/sectors");
			if (!response.ok) throw new Error("Failed to fetch sectors");
			return response.json();
		},
	});

	// Fetch hazard types data
	const { data: hazardTypesData } = useQuery<HazardTypesResponse>({
		queryKey: ["hazardTypes", filters.hazardTypeId],
		queryFn: async () => {
			const response = await fetch(`/api/analytics/hazard-types`);
			if (!response.ok) throw new Error("Failed to fetch hazard types");
			return response.json();
		},
	});

	// Fetch hazard clusters data
	const { data: hazardClustersData } = useQuery<HazardClustersResponse>({
		queryKey: ["hazardClusters", filters.hazardClusterId],
		queryFn: async () => {
			if (!filters.hazardTypeId) return { clusters: [] };
			const response = await fetch(
				`/api/analytics/hazard-clusters?hazardTypeId=${filters.hazardTypeId}`
			);
			if (!response.ok) throw new Error("Failed to fetch hazard clusters");
			return response.json();
		},
		enabled: !!filters.hazardTypeId,
	});

	// Fetch specific hazards data
	const { data: specificHazardsData } = useQuery<SpecificHazardsResponse>({
		queryKey: ["specificHazards", filters.hazardClusterId],
		queryFn: async () => {
			if (!filters.hazardClusterId) return { hazards: [] };
			const response = await fetch(
				`/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}`
			);
			if (!response.ok) throw new Error("Failed to fetch specific hazards");
			return response.json();
		},
		enabled: !!filters.hazardClusterId,
	});

	// Get hazard type display text
	const getHazardTypeDisplay = () => {
		if (filters.specificHazardId && specificHazardsData?.hazards) {
			const hazard = specificHazardsData.hazards.find(
				(h) => h.id.toString() === filters.specificHazardId
			);
			return hazard?.name || "Specific Hazards";
		}
		if (filters.hazardClusterId && hazardClustersData?.clusters) {
			const cluster = hazardClustersData.clusters.find(
				(c) => c.id.toString() === filters.hazardClusterId
			);
			return cluster?.name || "Hazard Cluster";
		}
		if (filters.hazardTypeId && hazardTypesData?.hazardTypes) {
			const type = hazardTypesData.hazardTypes.find(
				(t) => t.id.toString() === filters.hazardTypeId
			);
			return type?.name || "Hazard Type";
		}
		return "All Hazards";
	};

	const currency = useDefaultCurrency();

	// Format money values with appropriate scale
	const formatMoneyValue = (value: number) => {
		return formatCurrencyWithCode(
			value,
			currency,
			{},
			value >= 1_000_000_000
				? "billions"
				: value >= 1_000_000
					? "millions"
					: value >= 1_000
						? "thousands"
						: undefined
		);
	};

	if (process.env.NODE_ENV === 'development') {
		console.log("Debug - Component State:", {
			apiResponseData: apiResponse?.data,
		});
	}

	if (isLoading) {
		if (process.env.NODE_ENV === 'development') {
			console.log("Debug - Loading state");
		}
		return (
			<section className="dts-page-section">
				<div className="mg-container">
					<div className="dts-data-box">
						<div className="dts-error-content">
							<div className="animate-pulse">
								<div className="h-64 bg-gray-200 rounded-lg mb-4"></div>
								<div className="h-64 bg-gray-200 rounded-lg"></div>
							</div>
						</div>
					</div>
				</div>
			</section>
		);
	}

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
			const selectedSector = sectorsData.sectors.find(
				(s: Sector) => s.id.toString() === sectorId
			);
			if (selectedSector) {
				return `Impact in ${selectedSector.sectorname} Sector`;
			}
		}

		return "Sector Impact Analysis";
	};

	// Error state
	if (error) {
		if (process.env.NODE_ENV === 'development') {
			console.log("Debug - Error state:", error);
		}

		// Extract the actual error message from the error object
		let errorMessage = "An error occurred while fetching the data.";
		if (error instanceof Error) {
			errorMessage = error.message;
		}

		// Try to extract specific API errors if available
		if (typeof (error as any).json === "function") {
			(error as any)
				.json()
				.then((json: any) => {
					if (json.error) {
						errorMessage = json.error;
						if (process.env.NODE_ENV === 'development') {
							console.log("Extracted API error:", errorMessage);
						}
					}
				})
				.catch(() => { });
		}

		return (
			<section
				className="dts-page-section"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				<div
					className="mg-container"
					style={{ maxWidth: "100%", overflow: "hidden" }}
				>
					<h2 className="dts-heading-2">{renderTitle()}</h2>
					<p className="text-sm text-gray-600 mb-4">
						This dashboard shows the aggregated impact data for the selected
						sector, including all its subsectors.
					</p>

					<div className="mg-grid mg-grid--gap-default">
						{/* Error message box */}
						<div className="dts-data-box dts-data-box--error mg-grid__col--span-3">
							<div className="dts-error-content">
								<div className="dts-error-text">
									{errorMessage?.includes("date")
										? "Invalid date format in the database"
										: errorMessage || "Failed to load sector impact data"}
								</div>
								<div className="dts-error-hint">
									The system encountered an issue with the date format. Please
									contact your administrator to resolve this database issue.
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		);
	}

	// Empty state - no sector selected
	if (!targetSectorId) {
		if (process.env.NODE_ENV === 'development') {
			console.log("Debug - No sector selected state");
		}
		return (
			<div className="dts-data-box dts-data-box--error">
				<h3 className="dts-body-label">
					<span>No Sector Selected</span>
				</h3>
				<div className="flex items-center justify-center h-[300px]">
					<p className="text-gray-500">
						Please select a sector to view impact data.
					</p>
				</div>
			</div>
		);
	}

	if (!apiResponse?.data) {
		if (process.env.NODE_ENV === 'development') {
			console.log("Debug - No data state");
		}
		return (
			<div className="dts-data-box dts-data-box--error">
				<div className="dts-error-content">
					<div className="dts-error-text">No Data Available</div>
					<div className="dts-error-hint">
						No impact data available for the selected filters.
					</div>
				</div>
			</div>
		);
	}

	// Extract the data from the API response
	const data = apiResponse?.data || {};

	// Add debug logging for the data that will be used for display
	if (process.env.NODE_ENV === 'development') {
		console.log("Data for display:", {
			apiResponseExists: !!apiResponse,
			dataExists: !!data,
			eventCount: data.eventCount,
			totalDamage: data.totalDamage ? true : false,
			totalLoss: data.totalLoss ? true : false,
			dataAvailability: data.dataAvailability,
		});
	}

	// Transform time series data with proper typing and logging
	const eventsData = Object.entries(data.eventsOverTime || {})
		.map(([year, count]) => ({
			year: parseInt(year),
			count: parseInt(count as string) || 0,
		}))
		.filter((entry) => {
			if (!filters.fromDate && !filters.toDate) return true;
			const yearNum = entry.year;
			const fromYear = filters.fromDate
				? parseInt(filters.fromDate.split("-")[0])
				: 0;
			const toYear = filters.toDate
				? parseInt(filters.toDate.split("-")[0])
				: 9999;
			return yearNum >= fromYear && yearNum <= toYear;
		})
		.sort((a, b) => a.year - b.year);

	// Get the reference year from events data or filters
	const referenceYear =
		eventsData.length > 0
			? eventsData[0].year
			: filters.fromDate
				? parseInt(filters.fromDate.split("-")[0])
				: new Date().getFullYear();

	// Fix damage data transformation to ensure it properly handles string values and zero impact
	const damageData =
		data?.dataAvailability?.damage === "zero"
			? [{ year: referenceYear, amount: 0 }]
			: Object.entries(data.damageOverTime || {})
				.map(([year, amount]) => {
					const parsedAmount =
						typeof amount === "string" ? parseFloat(amount) : Number(amount);
					return {
						year: parseInt(year),
						amount: isNaN(parsedAmount) ? 0 : parsedAmount,
					};
				})
				.filter((entry) => {
					if (!filters.fromDate && !filters.toDate) return true;
					const yearNum = entry.year;
					const fromYear = filters.fromDate
						? parseInt(filters.fromDate.split("-")[0])
						: 0;
					const toYear = filters.toDate
						? parseInt(filters.toDate.split("-")[0])
						: 9999;
					return yearNum >= fromYear && yearNum <= toYear;
				})
				.sort((a, b) => a.year - b.year);

	// Fix loss data transformation to ensure it properly handles string values and zero impact
	const lossData =
		data?.dataAvailability?.loss === "zero"
			? [{ year: referenceYear, amount: 0 }]
			: Object.entries(data.lossOverTime || {})
				.map(([year, amount]) => {
					const parsedAmount =
						typeof amount === "string" ? parseFloat(amount) : Number(amount);
					return {
						year: parseInt(year),
						amount: isNaN(parsedAmount) ? 0 : parsedAmount,
					};
				})
				.filter((entry) => {
					if (!filters.fromDate && !filters.toDate) return true;
					const yearNum = entry.year;
					const fromYear = filters.fromDate
						? parseInt(filters.fromDate.split("-")[0])
						: 0;
					const toYear = filters.toDate
						? parseInt(filters.toDate.split("-")[0])
						: 9999;
					return yearNum >= fromYear && yearNum <= toYear;
				})
				.sort((a, b) => a.year - b.year);



	if (process.env.NODE_ENV === 'development') {
		console.log("Final transformed data:", {
			eventsData,
			damageData,
			lossData
		});
	}

	return (
		<section
			className="dts-page-section"
			style={{ maxWidth: "100%", overflow: "hidden" }}
		>
			<div
				className="mg-container"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				<h2 className="dts-heading-2">{renderTitle()}</h2>
				<p className="text-sm text-gray-600 mb-4">
					This dashboard shows the aggregated impact data for the selected
					sector, including all its subsectors.
				</p>

				{/* Events impacting sectors */}
				<div className="mg-grid mg-grid--gap-default">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">Disaster events impacting sectors</span>
							<button
								ref={eventsImpactingRef}
								className="dts-tooltip__button"
								onPointerEnter={() =>
									createTooltip(
										eventsImpactingRef,
										"Total number of disaster events that have impacted this sector"
									)
								}
							>
								<IoInformationCircleOutline aria-hidden="true" />
							</button>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							{/* <span>{data?.eventCount ? formatNumber(data.eventCount) : "No data available"}</span> */}
							{eventsData.length > 0 ? (
								<span>
									{formatNumber(
										eventsData.reduce((sum, event) => sum + event.count, 0)
									)}
								</span>
							) : (
								<>
									<div className="dts-indicator dts-indicator--target-box-g">
										<img src="/assets/images/empty.png" alt="No data" />
										<span className="dts-body-text">No data available</span>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Events Timeline */}
					<div className="dts-data-box mg-grid__col--span-2">
						<h3 className="dts-body-label">
							<span id="elementId02">Events over time</span>
							<button
								ref={eventsOverTimeRef}
								className="dts-tooltip__button"
								onPointerEnter={() =>
									createTooltip(
										eventsOverTimeRef,
										"Distribution of events over time showing frequency and patterns"
									)
								}
							>
								<IoInformationCircleOutline aria-hidden="true" />
							</button>
						</h3>
						<div style={{ height: "300px" }}>
							{eventsData.length > 0 ? (
								<AreaChart
									data={eventsData}
									variant="events"
									formatter={formatNumber}
									CustomTooltip={CustomTooltip}
								/>
							) : (
								<EmptyChartPlaceholder />
							)}
						</div>
					</div>
				</div>

				{/* Damage and Loss Section */}
				<div className="mg-grid mg-grid--gap-default">
					{/* Damage Box */}
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId03">
								Damages in {currency} due to {getHazardTypeDisplay()}
							</span>
							<button
								ref={damageTooltipRef}
								className="dts-tooltip__button"
								onPointerEnter={() =>
									createTooltip(
										damageTooltipRef,
										`Total monetary damage in ${currency} caused by events in this sector`
									)
								}
							>
								<IoInformationCircleOutline aria-hidden="true" />
							</button>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-d">
							{data?.dataAvailability?.damage === "zero" ? (
								<span>Zero Impact (Confirmed)</span>
							) : data?.dataAvailability?.damage === "no_data" ? (
								<>
									<div className="dts-indicator dts-indicator--target-box-d">
										<img src="/assets/images/empty.png" alt="No data" />
										<span className="dts-body-text">No data available</span>
									</div>
								</>
							) : data?.totalDamage !== undefined &&
								data?.totalDamage !== null &&
								data?.totalDamage !== "" ? (
								<span>
									{formatCurrencyWithCode(Number(data.totalDamage), currency)}
								</span>
							) : (
								<>
									<img src="/assets/images/empty.png" alt="No data" />
									<span className="dts-body-text">No data available</span>
								</>
							)}
						</div>
						<div style={{ height: "300px" }}>
							{damageData.length > 0 ? (
								<AreaChart
									data={damageData}
									variant="damage"
									formatter={formatMoneyValue}
									CustomTooltip={CustomTooltip}
								/>
							) : (
								<EmptyChartPlaceholder />
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
								onPointerEnter={() =>
									createTooltip(
										lossTooltipRef,
										`Total financial losses in ${currency} incurred in this sector`
									)
								}
							>
								<IoInformationCircleOutline aria-hidden="true" />
							</button>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-c">
							{data?.dataAvailability?.loss === "zero" ? (
								<span>Zero Impact (Confirmed)</span>
							) : data?.dataAvailability?.loss === "no_data" ? (
								<>
									<div className="dts-indicator dts-indicator--target-box-c">
										<img src="/assets/images/empty.png" alt="No data" />
										<span className="dts-body-text">No data available</span>
									</div>
								</>
							) : data?.totalLoss !== undefined &&
								data?.totalLoss !== null &&
								data?.totalLoss !== "" ? (
								<span>
									{formatCurrencyWithCode(Number(data.totalLoss), currency)}
								</span>
							) : (
								<>
									<div className="dts-indicator dts-indicator--target-box-c">
										<img src="/assets/images/empty.png" alt="No data" />
										<span className="dts-body-text">No data available</span>
									</div>
								</>
							)}
						</div>
						<div style={{ height: "300px" }}>
							{lossData.length > 0 ? (
								<AreaChart
									data={lossData}
									variant="loss"
									formatter={formatMoneyValue}
									CustomTooltip={CustomTooltip}
								/>
							) : (
								<EmptyChartPlaceholder />
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
};

export default ImpactOnSector;
