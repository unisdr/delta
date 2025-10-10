import React, { useRef, useEffect } from "react";
import { createFloatingTooltip } from "~/util/tooltip";
import {
	formatCurrencyWithCode,
	formatNumber,
} from "~/frontend/utils/formatters";
import AreaChart from "~/components/AreaChart";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";

// Types
interface Sector {
	id: string;
	sectorname: string;
	subsectors?: Sector[];
}

// No additional interface needed as we're using the prop type directly

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

interface Props {
	sectorId: string;
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
	// New prop to receive data from loader instead of fetching via API
	sectorImpactData?: ApiResponse | null;
	// New prop to receive sectors data from loader instead of fetching via API
	sectorsData?: { sectors: Sector[] | null };
}


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

function ImpactOnSector({
	sectorId,
	filters,
	currency,
	sectorImpactData,
	sectorsData,
}: Props) {
	// Determine which ID to use
	const targetSectorId = filters.subSectorId || sectorId;

	// Track previous values for debugging
	const prevTargetSectorIdRef = useRef(targetSectorId);
	const prevGeographicLevelRef = useRef(filters.geographicLevelId);

	// Use sectorsData directly from props instead of maintaining local state

	useEffect(() => {
		if (prevTargetSectorIdRef.current !== targetSectorId) {
			prevTargetSectorIdRef.current = targetSectorId;
		}
		if (prevGeographicLevelRef.current !== filters.geographicLevelId) {
			prevGeographicLevelRef.current = filters.geographicLevelId;
		}
	}, [targetSectorId, filters.geographicLevelId]);

	// Determine loading, error, and data states
	const isLoading = !sectorImpactData;
	const error = sectorImpactData?.success === false ? new Error("Failed to fetch sector impact data") : null;
	const apiResponse = sectorImpactData;

	// Get hazard type display text
	const getHazardTypeDisplay = () => {
		// Since we're no longer fetching hazard data via React Query,
		// we'll use a simplified approach based on the filter values
		if (filters.specificHazardId) {
			return "Specific Hazard";
		}
		if (filters.hazardClusterId) {
			return "Hazard Cluster";
		}
		if (filters.hazardTypeId) {
			return "Hazard Type";
		}
		return "All Hazards";
	};

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

	if (isLoading) {
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
			const selectedSector = sectorsData?.sectors.find(
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
		console.error("Component in error state", {
			error: error instanceof Error ? error.message : String(error)
		});

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
						console.error("Extracted API error", { errorMessage });
					}
				})
				.catch((err: unknown) => {
					console.error("Failed to extract API error", { error: err });
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
					<p className="text-gray-600 mb-4">
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


	return (
		<>
			<section
				className="dts-page-section"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				<div
					className="mg-container"
					style={{ maxWidth: "100%", overflow: "hidden" }}
				>
					<h2 className="dts-heading-2">{renderTitle()}</h2>
					<p className="text-gray-600 mb-4">
						This dashboard shows the aggregated impact data for the selected
						sector, including all its subsectors.
					</p>

					{/* Events impacting sectors */}
					<div className="mg-grid mg-grid--gap-default">
						<div className="dts-data-box">
							<h3 className="dts-body-label">
								<span id="elementId01">Disaster events impacting sectors</span>
								<div
									className="dts-tooltip__button"
									onPointerEnter={(e) =>
										createFloatingTooltip({
											content: "Total number of disaster events that have impacted this sector",
											target: e.currentTarget,
											placement: "top",
											offsetValue: 8,
										})
									}
								>
									<svg aria-hidden="true" focusable="false" role="img">
										<use href="/assets/icons/information_outline.svg#information"></use>
									</svg>
								</div>
							</h3>
							<div className="dts-indicator dts-indicator--target-box-g">
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
								<div
									className="dts-tooltip__button"
									onPointerEnter={(e) =>
										createFloatingTooltip({
											content: "Distribution of events over time showing frequency and patterns",
											target: e.currentTarget,
											placement: "top",
											offsetValue: 8,
										})
									}
								>
									<svg aria-hidden="true" focusable="false" role="img">
										<use href="/assets/icons/information_outline.svg#information"></use>
									</svg>
								</div>
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
								<div
									className="dts-tooltip__button"
									onPointerEnter={(e) =>
										createFloatingTooltip({
											content: `Total monetary damage in ${currency} caused by events in this sector`,
											target: e.currentTarget,
											placement: "top",
											offsetValue: 8,
										})
									}
								>
									<svg aria-hidden="true" focusable="false" role="img">
										<use href="/assets/icons/information_outline.svg#information"></use>
									</svg>
								</div>
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
								<div
									className="dts-tooltip__button"
									onPointerEnter={(e) =>
										createFloatingTooltip({
											content: `Total financial losses in ${currency} incurred in this sector`,
											target: e.currentTarget,
											placement: "top",
											offsetValue: 8,
										})
									}
								>
									<svg aria-hidden="true" focusable="false" role="img">
										<use href="/assets/icons/information_outline.svg#information"></use>
									</svg>
								</div>
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
		</>
	);
};

export default ImpactOnSector;