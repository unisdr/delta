import { useRef, useState } from "react";
import MapChart, { MapChartRef } from "~/components/MapChart";

interface HazardImpactMap2Props {
	localCurrency: string;
	damagesGeoData: any[];
	lossesGeoData: any[];
	disasterEventGeoData: any[];
	affectedPeopleGeoData: any[];
	deathsGeoData: any[];
}

const HazardImpactMap2: React.FC<HazardImpactMap2Props> = ({
	localCurrency,
	damagesGeoData,
	lossesGeoData,
	disasterEventGeoData,
	affectedPeopleGeoData,
	deathsGeoData,
}) => {
	const mapChartRef = useRef<MapChartRef>(null);
	const [activeData, setActiveData] = useState(damagesGeoData);

	const handleSwitchMapData = (
		e: React.MouseEvent<HTMLButtonElement>,
		data: any,
		legendMaxColor: string
	) => {
		if (!e || !e.currentTarget) {
			console.error("Event is undefined or does not have a target.");
			return;
		}

		e.preventDefault();

		document.getElementById("tab01")?.setAttribute("aria-selected", "false");
		document.getElementById("tab02")?.setAttribute("aria-selected", "false");
		document.getElementById("tab03")?.setAttribute("aria-selected", "false");
		document.getElementById("tab04")?.setAttribute("aria-selected", "false");
		document.getElementById("tab05")?.setAttribute("aria-selected", "false");

		const buttonText = e.currentTarget.textContent?.trim() || "Legend";

		e.currentTarget.ariaSelected = "true";

		setActiveData(data);
		mapChartRef.current?.setDataSource(data);
		mapChartRef.current?.setLegendTitle(buttonText);
		mapChartRef.current?.setLegendMaxColor(legendMaxColor);
	};

	return (
		<>
			<section
				className="dts-page-section"
				style={{ maxWidth: "100%", overflow: "hidden" }}
			>
				<h2>TODO - Add five different maps</h2>
				<div className="map-section">
					<h2 className="mg-u-sr-only" id="tablist01">
						Geographic Impact View
					</h2>

					<ul
						className="dts-tablist"
						role="tablist"
						aria-labelledby="tablist01"
					>
						<li role="presentation">
							<button
								onClick={(e) =>
									handleSwitchMapData(e, damagesGeoData, "#208f04")
								}
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab01"
								aria-controls="tabpanel01"
								aria-selected="false"
							>
								<span>Total damages in {localCurrency}</span>
							</button>
						</li>

						<li role="presentation">
							<button
								onClick={(e) =>
									handleSwitchMapData(e, lossesGeoData, "#ff1010")
								}
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab02"
								aria-controls="tabpanel02"
								aria-selected="false"
							>
								<span>Total losses</span>
							</button>
						</li>
						<li role="presentation">
							<button
								onClick={(e) =>
									handleSwitchMapData(e, disasterEventGeoData, "#58508d")
								}
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab03"
								aria-controls="tabpanel03"
								aria-selected="false"
							>
								<span>Number of disaster event</span>
							</button>
						</li>
						<li role="presentation">
							<button
								onClick={(e) =>
									handleSwitchMapData(e, affectedPeopleGeoData, "#208f04")
								}
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab04"
								aria-controls="tabpanel04"
								aria-selected="false"
							>
								<span>Affected people</span>
							</button>
						</li>
						<li role="presentation">
							<button
								onClick={(e) =>
									handleSwitchMapData(e, deathsGeoData, "#ff1010")
								}
								type="button"
								className="dts-tablist__button"
								role="tab"
								id="tab05"
								aria-controls="tabpanel05"
								aria-selected="false"
							>
								<span>Number of deaths</span>
							</button>
						</li>
					</ul>

					<div id="tabpanel01" role="tabpanel" aria-labelledby="tab01">
						<div
							className="dts-tablist__panel"
							id="tabpanel01"
							role="tabpanel"
							aria-labelledby="tab01"
						>
							<div>
								<MapChart
									ref={mapChartRef}
									id="map_viewer"
									dataSource={activeData}
									legendMaxColor="#208f04"
								/>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
};

export default HazardImpactMap2;
