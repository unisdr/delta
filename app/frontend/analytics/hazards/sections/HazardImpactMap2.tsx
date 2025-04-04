import { useState } from "react";

interface HazardImpactMap2Props {}

const HazardImpactMap2: React.FC<HazardImpactMap2Props> = ({}) => {
	const [selectedTab, setSelectedTab] = useState<string>("tab01");

	// Handle tab selection
	const handleSelectTab = (tabId: string) => {
		setSelectedTab(tabId);
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
								className={`dts-tablist__button ${
									selectedTab === "tab01" ? "active" : ""
								}`}
								type="button"
								role="tab"
								id="tab01"
								aria-controls="tabpanel01"
								aria-selected={selectedTab === "tab01"}
								tabIndex={selectedTab === "tab01" ? 0 : -1}
								onClick={() => handleSelectTab("tab01")}
							>
								<span>Total damages in [local currency]</span> 
							</button>
						</li>
						<li role="presentation">
							<button
								className={`dts-tablist__button ${
									selectedTab === "tab02" ? "active" : ""
								}`}
								type="button"
								role="tab"
								id="tab02"
								aria-controls="tabpanel02"
								aria-selected={selectedTab === "tab02"}
								tabIndex={selectedTab === "tab02" ? 0 : -1}
								onClick={() => handleSelectTab("tab02")}
							>
								<span>Total losses</span>
							</button>
						</li>
						<li role="presentation">
							<button
								className={`dts-tablist__button ${
									selectedTab === "tab03" ? "active" : ""
								}`}
								type="button"
								role="tab"
								id="tab03"
								aria-controls="tabpanel03"
								aria-selected={selectedTab === "tab03"}
								tabIndex={selectedTab === "tab03" ? 0 : -1}
								onClick={() => handleSelectTab("tab03")}
							>
								<span>Number of disaster event</span>
							</button>
						</li>
						<li role="presentation">
							<button
								className={`dts-tablist__button ${
									selectedTab === "tab04" ? "active" : ""
								}`}
								type="button"
								role="tab"
								id="tab04"
								aria-controls="tabpanel04"
								aria-selected={selectedTab === "tab04"}
								tabIndex={selectedTab === "tab04" ? 0 : -1}
								onClick={() => handleSelectTab("tab04")}
							>
								<span>Affected people</span>
							</button>
						</li>
						<li role="presentation">
							<button
								className={`dts-tablist__button ${
									selectedTab === "tab05" ? "active" : ""
								}`}
								type="button"
								role="tab"
								id="tab05"
								aria-controls="tabpanel05"
								aria-selected={selectedTab === "tab05"}
								tabIndex={selectedTab === "tab05" ? 0 : -1}
								onClick={() => handleSelectTab("tab05")}
							>
								<span>Number of deaths</span>
							</button>
						</li>
					</ul>

					<div
						id="tabpanel01"
						role="tabpanel"
						aria-labelledby="tab01"
						hidden={selectedTab !== "tab01"}
					>
						Map1
					</div>

					<div
						id="tabpanel02"
						role="tabpanel"
						aria-labelledby="tab02"
						hidden={selectedTab !== "tab02"}
					>
						Map2
					</div>
					<div
						id="tabpanel03"
						role="tabpanel"
						aria-labelledby="tab03"
						hidden={selectedTab !== "tab03"}
					>
						Map3
					</div>
					<div
						id="tabpanel04"
						role="tabpanel"
						aria-labelledby="tab04"
						hidden={selectedTab !== "tab04"}
					>
						Map4
					</div>
					<div
						id="tabpanel05"
						role="tabpanel"
						aria-labelledby="tab05"
						hidden={selectedTab !== "tab05"}
					>
						Map5
					</div>
				</div>
			</section>
		</>
	);
};

export default HazardImpactMap2;
