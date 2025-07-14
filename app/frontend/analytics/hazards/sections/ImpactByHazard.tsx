import React from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { createFloatingTooltip } from "~/util/tooltip";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { YearlyDisasterCount } from "~/backend.server/models/analytics/hazard-analysis";

interface ImpactByHazardProps {
	hazardName: string;
	geographicName: string | null;
	fromDate: string | null;
	toDate: string | null;
	disasterCount: number;
	yearlyEventsCount: YearlyDisasterCount[];
}

const ImpactByHazard: React.FC<ImpactByHazardProps> = ({
	hazardName,
	geographicName,
	fromDate,
	toDate,
	disasterCount,
	yearlyEventsCount,
}) => {
	// Construct the title dynamically
	const titleParts = [hazardName];
	if (geographicName) titleParts.push(`(${geographicName})`);
	if (fromDate || toDate)
		titleParts.push(`[${fromDate || "Start"} to ${toDate || "End"}]`);

	titleParts.push(` impact summary`);
	const title = titleParts.join(" ");

	// Helper function to check if chart data exists
	const hasChartData = yearlyEventsCount && yearlyEventsCount.length > 0;

	return (
		<>
			<section
				className="dts-page-section"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				{/* <div
					className="mg-container"
					style={{ maxWidth: "100%", overflow: "hidden" }}
				> */}
				<h2 className="text-sm text-gray-600 mb-4">{title}</h2>
				<div className="mg-grid mg-grid__col-2">
					{/* Events impacting sectors */}
					<div className="mg-grid mg-grid--gap-default">
						<div className="dts-data-box">
							<h3 className="dts-body-label">
								<span id="elementId01">
									Total events in{" "}
									{geographicName ? geographicName : " all country"}
								</span>
								<div
									className="dts-tooltip__button"
									onPointerEnter={(e) =>
										createFloatingTooltip({
											content: `Total number of ${hazardName} events that occurred in ${geographicName || "all country"}`,
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
								{disasterCount > 0 ? (
									<span>{disasterCount}</span>
								) : (
									<>
										<img src="/assets/images/empty.png" alt="No data" />
										<span className="dts-body-text">No data available</span>
									</>
								)}
							</div>
						</div>
					</div>

					{/* Events overtime */}
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Events over time</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: `Distribution of ${hazardName} events over time showing frequency and patterns`,
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
						<div style={{ height: "400px" }}>
							{hasChartData ? (
								<ResponsiveContainer width="100%" height={400}>
									<AreaChart data={yearlyEventsCount}>
										<defs>
											<linearGradient
												id="eventGradient"
												x1="0"
												y1="0"
												x2="0"
												y2="1"
											>
												<stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
												<stop
													offset="95%"
													stopColor="#8884d8"
													stopOpacity={0.1}
												/>
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="year" />
										<YAxis
											tickFormatter={(value) => Math.round(value).toString()}
											allowDecimals={false}
											domain={[0, "auto"]}
										/>
										<Tooltip />
										<Area
											type="linear"
											dataKey="count"
											stroke="#8884d8"
											fill="url(#eventGradient)"
											strokeWidth={2}
										/>
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<EmptyChartPlaceholder height={400} />
							)}
						</div>
					</div>
				</div>
				{/* </div> */}
			</section>
		</>
	);
};

export default ImpactByHazard;