import React from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

interface DisasterEventsListProps {
}

const DisasterEventsList: React.FC<DisasterEventsListProps> = ({
}) => {
	
	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">Most recent [selected hazards] events in [instance name]</h2>

				<div className="mg-grid mg-grid__col-1">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId011"></span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId011"
								aria-describedby="tooltip011"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip011" role="tooltip">
								<span>
									Total people affected is the sum of deaths, injured, missing,
									directly affected people and displaced
								</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-g">
							<span></span>
						</div>
					</div>
				</div>

			</section>

		</>
	);
};

export default DisasterEventsList;
