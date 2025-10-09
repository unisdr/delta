import React from "react";
import HorizontalBarChart from "~/components/HorizontalBarChart";
import EmptyChartPlaceholder from "~/components/EmptyChartPlaceholder";
import { createFloatingTooltip } from "~/util/tooltip";

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
			"Children (0 - 14)": totalChildren,
			"Adults (15 - 64)": totalAdults,
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

	// Helper functions to check if data exists for charts
	const hasGenderData = noOfMen > 0 || noOfWomen > 0 || noOfNonBinary > 0;
	const hasAgeData = totalChildren > 0 || totalAdults > 0 || totalSeniors > 0;
	const hasDisabilityPovertyData =
		totalDisability > 0 ||
		totalNationalPoorPeople > 0 ||
		totalInternationalPoorPeople > 0;

	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">Human direct effects</h2>

				<div className="mg-grid mg-grid__col-3">
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Total people affected</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content:
											"Total people affected is the sum of injured, missing, directly affected people and displaced",
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
							<span className="dts-indicator__value">
								{totalPeopleAffected}
							</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-3" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Deaths</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Total number of deaths",
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
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Dead.svg"
								alt="Dead Icon"
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "130px", fontSize: "1.2em" }}>
								{totalDeaths}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Injured</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Total number of injured",
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
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Injured.svg"
								alt="Injured Icon"
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "150px", fontSize: "1.2em" }}>
								{totalInjured}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Missing</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Total number of missing persons",
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
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Missing.svg"
								alt="Missing Icon"
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "150px", fontSize: "1.2em" }}>
								{totalMissing}
							</span>
						</div>
					</div>
				</div>

				<div className="mg-grid mg-grid__col-2" style={{ gap: "16px" }}>
					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>People directly affected</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Total number of people directly affected",
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
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/AffectedPopulation.svg"
								alt="Affected Population Icon"
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "250px", fontSize: "1.2em" }}>
								{totalPeopleDirectlyAffected}
							</span>
						</div>
					</div>

					<div className="dts-data-box">
						<h3 className="dts-body-label">
							<span>Displaced</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Total number of displaced people",
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
						<div
							className="dts-indicator dts-indicator--target-box-b"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "flex-start",
								width: "100%",
							}}
						>
							<img
								src="/assets/icons/Internally-displaced.svg"
								alt="Internally displaced Icon"
								style={{ width: "60px", height: "60px" }}
							/>
							<span style={{ marginLeft: "250px", fontSize: "1.2em" }}>
								{totalDisplaced}
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="dts-page-section">
				<div className="mg-grid mg-grid__col-3">
					{/* Men and women disaggregation */}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>Men and women affected</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Distribution of affected people by gender",
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
						{hasGenderData ? (
							<HorizontalBarChart
								data={data}
								imgSrc="/assets/icons/Male&Female.svg"
							/>
						) : (
							<EmptyChartPlaceholder height={220} />
						)}
					</div>

					{/* Persons with disabilities and living in poverty affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>
								Persons with disabilities and living in poverty affected
							</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content:
											"Distribution of affected people by disability and poverty status",
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
						{hasDisabilityPovertyData ? (
							<HorizontalBarChart
								data={disbilityAndPovertyData}
								imgSrc="/assets/icons/People-with-physical-impairments.svg"
								colorScheme="cerulean"
							/>
						) : (
							<EmptyChartPlaceholder height={220} />
						)}
					</div>

					{/* Children adult and senior affected*/}
					<div className="dts-data-box" style={{ height: "300px" }}>
						<h3 className="dts-body-label">
							<span>Children, adults, and seniors affected</span>
							<div
								className="dts-tooltip__button"
								onPointerEnter={(e) =>
									createFloatingTooltip({
										content: "Distribution of affected people by age group",
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
						{hasAgeData ? (
							<HorizontalBarChart
								data={ageData}
								imgSrc="/assets/icons/Male&Female.svg"
							/>
						) : (
							<EmptyChartPlaceholder height={220} />
						)}
					</div>
				</div>
			</section>
		</>
	);
};

export default HumanAffects;
