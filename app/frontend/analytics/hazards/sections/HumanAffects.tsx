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

interface HumanAffectsProps {
	totalPeopleAffected: number;
	totalDeaths: number;
	totalInjured: number;
	totalMissing: number;
	totalPeopleDirectlyAffected: number;
	totalDisplaced: number;
	noOfMen: number;
	noOfWomen: number;
	noOfNonBinary: number;
	totalChildren: number;
	totalAdults: number;
	totalSeniors: number;
	totalDisability: number;
	totalInternationalPoorPeople: number;
	totalNationalPoorPeople: number;
}

const HumanAffects: React.FC<HumanAffectsProps> = ({
	totalPeopleAffected,
	totalDeaths,
	totalInjured,
	totalMissing,
	totalPeopleDirectlyAffected,
	totalDisplaced,
	noOfMen,
	noOfWomen,
	noOfNonBinary,
	totalChildren,
	totalAdults,
	totalSeniors,
	totalDisability,
	totalInternationalPoorPeople,
	totalNationalPoorPeople,
}) => {
	const data = [
		{
			name: "",
			Male: noOfMen,
			Female: noOfWomen,
			"Other non-Binary": noOfNonBinary,
		},
	];

	const ageData = [
		{
			name: "",
			"Children (0 - 15)": totalChildren,
			"Adults (15 - 54)": totalAdults,
			"Seniors (65+)": totalSeniors,
		},
	];

	const disbilityAndPovertyData = [
		{
			name: "",
			"Persons with disabilities": totalDisability,
			"Persons living in poverty (national)": totalNationalPoorPeople,
			"Persons living in poverty (international)": totalInternationalPoorPeople,
		},
	];
	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">Human direct effects</h2>

				<div className="mg-grid mg-grid__col-3">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId011">Total people affected</span>
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
							<span>{totalPeopleAffected}</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-3" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">Deaths</span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId01"
								aria-describedby="tooltip01"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip01" role="tooltip">
								<span>Total number of deaths</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-b">
							<span>{totalDeaths}</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">Injured</span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId01"
								aria-describedby="tooltip01"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip01" role="tooltip">
								<span>Total number of injured</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-b">
							<span>{totalInjured}</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">Missing</span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId01"
								aria-describedby="tooltip01"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip01" role="tooltip">
								<span>Total number of missings</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-b">
							<span>{totalMissing}</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-2" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">People directly affected</span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId01"
								aria-describedby="tooltip01"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip01" role="tooltip">
								<span>Total number of people directly affected</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-b">
							<span>{totalPeopleDirectlyAffected}</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span id="elementId01">Displaced</span>
							<button
								type="button"
								className="dts-tooltip__button"
								aria-labelledby="elementId01"
								aria-describedby="tooltip01"
							>
								<svg aria-hidden="true" focusable="false" role="img">
									<use href="/assets/icons/information_outline.svg#information"></use>
								</svg>
							</button>
							<div id="tooltip01" role="tooltip">
								<span>Total number of displaced people</span>
								<div className="dts-tooltip__arrow"></div>
							</div>
						</h3>
						<div className="dts-indicator dts-indicator--target-box-b">
							<span>{totalDisplaced}</span>
						</div>
					</div>
				</div>
			</section>

			<section className="dts-page-section">
				<div className="mg-grid mg-grid__col-3">
					{/* Men and women disaggregation */}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span id="elementId011">Men and women affected</span>
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

						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								width={500}
								height={500}
								layout="vertical"
								data={data}
								margin={{
									top: 5,
									right: 30,
									left: 20,
									bottom: 5,
								}}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<Tooltip />
								<XAxis type="number"/>
								<YAxis type="category" dataKey="name"/>
								<Legend />
								<Bar dataKey="Male" fill="#A64696" />
								<Bar dataKey="Female" fill="#E660CF" />
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Persons with disabilities and living in poverty affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span id="elementId011">
								Persons with disabilities and living in poverty affected
							</span>
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

						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								width={500}
								height={500}
								layout="vertical"
								data={disbilityAndPovertyData}
								margin={{
									top: 5,
									right: 30,
									left: 20,
									bottom: 5,
								}}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<Tooltip />
								<XAxis type="number"/>
								<YAxis type="category" dataKey="name"/>
								<Legend />
								<Bar dataKey="Persons with disabilities" fill="#436EA9" />
								<Bar
									dataKey="Persons living in poverty (national)"
									fill="#8EB4E9"
								/>
								<Bar
									dataKey="Persons living in poverty (international)"
									fill="#436EA980"
								/>
							</BarChart>
						</ResponsiveContainer>
					</div>

					{/* Children adult and senior affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span id="elementId011">
								Children, adults, and seniors affected
							</span>
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

						<ResponsiveContainer width="100%" height="100%">
							<BarChart
								width={500}
								height={500}
								layout="vertical"
								data={ageData}
								margin={{
									top: 5,
									right: 30,
									left: 20,
									bottom: 5,
								}}
							>
								<CartesianGrid strokeDasharray="3 3" />
								<Tooltip />
								<XAxis type="number"/>
								<YAxis type="category" dataKey="name"/>
								<Legend />
								<Bar dataKey="Children (0 - 15)" fill="#A64696" />
								<Bar dataKey="Adults (15 - 54)" fill="#E660CF" />
								<Bar dataKey="Seniors (65+)" fill="#A6469680" />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</section>
		</>
	);
};

export default HumanAffects;
