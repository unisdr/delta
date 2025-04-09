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
import {
	DamageByYear,
	LossByYear,
} from "~/backend.server/models/analytics/hazard-analysis";
import { createFloatingTooltip } from "~/util/tooltip";

interface DamagesAndLosesProps {
	localCurrency: string;
	totalDamages: number;
	totalLosses: number;
	totalDamagesByYear: DamageByYear[];
	totalLossesByYear: LossByYear[];
}

const DamagesAndLoses: React.FC<DamagesAndLosesProps> = ({
	localCurrency,
	totalDamages,
	totalLosses,
	totalDamagesByYear,
	totalLossesByYear,
}) => {
	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">Damages and loses</h2>

				<div className="mg-grid mg-grid__col-2">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Damages in {localCurrency}</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) => createFloatingTooltip({
									content: "Total monetary value of damages caused by hazards",
									target: e.currentTarget,
									placement: "top",
									offsetValue: 8,
								})}
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							<span>{totalDamages}</span>
						</div>
						{/* Damages overtime */}
						<div>
							<ResponsiveContainer width="100%" height={400}>
								<AreaChart data={totalDamagesByYear}>
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
										dataKey="totalDamages"
										stroke="#8884d8"
										fill="url(#eventGradient)"
										strokeWidth={2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Losses in {localCurrency}</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) => createFloatingTooltip({
									content: "Total monetary value of losses caused by hazards",
									target: e.currentTarget,
									placement: "top",
									offsetValue: 8,
								})}
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							<span>{totalLosses}</span>
						</div>
						<div>
							<ResponsiveContainer width="100%" height={400}>
								<AreaChart data={totalLossesByYear}>
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
										dataKey="totalLosses"
										stroke="#8884d8"
										fill="url(#eventGradient)"
										strokeWidth={2}
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default DamagesAndLoses;
