import React, { useState, useRef, useEffect } from "react";
import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useLoaderData, Outlet } from "@remix-run/react";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfig } from "./content-picker-config";

import {
	disasterEventSectorsById,
	disasterEvent_DisasterRecordsCount__ById,
	disasterEventSectorTotal__ById,
	disasterEventSectorTotal__ByDivisionId,
} from "~/backend.server/models/analytics/disaster-events";

import {
	disasterEventById,
	DisasterEventViewModel,
} from "~/backend.server/models/event";

import { sectorChildrenById } from "~/backend.server/models/sector";

import { getDivisionByLevel, getCountDivisionByLevel1 } from "~/backend.server/models/division";
import { dr } from "~/db.server"; // Drizzle ORM instance
import MapChart, { MapChartRef } from "~/components/MapChart";
import { getAffected } from "~/backend.server/models/analytics/affected-people-by-disaster-event-v2";

import CustomPieChart from "~/components/PieChart";
import CustomStackedBarChart from "~/components/StackedBarChart";
import HorizontalBarChart from "~/components/HorizontalBarChart";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { createFloatingTooltip } from "~/util/tooltip";

// Define an interface for the structure of the JSON objects
interface interfaceMap {
	total: number;
	name: string;
	description: string;
	colorPercentage: number;
	geojson: any;
}

interface interfacePieChart {
	name: string;
	value: number;
}

interface interfaceBarChart {
	name: string;
	damage: number;
	losses: number;
}

interface interfaceSector {
	id: string;
	sectorname: string;
	level?: number;
	ids?: [];
	subSector?: interfaceSector[];
}

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async (loaderArgs: any) => {
		const request = loaderArgs.request;

		// Parse the request URL
		const parsedUrl = new URL(request.url);

		// Extract query string parameters
		const queryParams = parsedUrl.searchParams;
		const qsDisEventId = queryParams.get("disasterEventId") || "";
		let record: any = undefined;
		let recordsRelatedSectors: any = undefined;
		let countRelatedDisasterRecords: any = undefined;
		let totalSectorEffects: any = undefined;
		let cpDisplayName: string = "";
		let sectorDamagePieChartData: interfacePieChart[] = [];
		let sectorLossesPieChartData: interfacePieChart[] = [];
		let sectorRecoveryPieChartData: interfacePieChart[] = [];
		let datamageGeoData: interfaceMap[] = [];
		let lossesGeoData: interfaceMap[] = [];
		let humanEffectsGeoData: interfaceMap[] = [];
		// let totalAffectedPeople:any = {};
		let totalAffectedPeople2: any = {};
		const sectortData: Record<
			string,
			{ id: string; sectorname: string; subSector?: interfaceSector[] }
		> = {};

		const sectorPieChartData: Record<
			number,
			{
				damages: interfacePieChart;
				losses: interfacePieChart;
				recovery: interfacePieChart;
			}
		> = {};
		let sectorBarChartData: Record<number, interfaceBarChart> = {};

		// Initialize arrays to store filtered values
		let sectorParentArray: interfaceSector[] = [];
		let x: any = {};

		const settings = await getCountrySettingsFromSession(request);
		let currency = "USD";
		if (settings) {
			currency = settings.currencyCode;
		}

		// Use the shared public tenant context for analytics
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		const countDivisionByLevel1 = await getCountDivisionByLevel1(countryAccountsId);

		if (qsDisEventId) {
			// Pass public tenant context for analytics access
			record = await disasterEventById(qsDisEventId).catch(console.error);
			if (record) {
				try {
					if (record.countryAccountsId !== countryAccountsId) {
						throw new Response("Unauthorized access", { status: 401 });
					}
					cpDisplayName = await contentPickerConfig.selectedDisplay(
						dr,
						qsDisEventId
					);

					// get all related sectors
					recordsRelatedSectors = await disasterEventSectorsById(
						qsDisEventId,
						true
					);
					for (const item of recordsRelatedSectors) {
						// console.log( item.relatedAncestorsDecentants );
						// const sectorParentArray = (item.relatedAncestorsDecentants as interfaceSector[]).filter(item2 => item2.level === 2);

						if (item.relatedAncestorsDecentants) {
							// Filter for level 2 and save to filteredAncestors
							const filteredAncestors = (
								item.relatedAncestorsDecentants as interfaceSector[]
							).filter((ancestor) => ancestor.level === 2);
							x = filteredAncestors[0];

							x.myChildren = [];
							// console.log(x.myChildren);

							const ancestorIds = (
								item.relatedAncestorsDecentants as interfaceSector[]
							).map((ancestor) => ancestor.id);

							x.myChildren = ancestorIds;
							x.effects = {};
							x.effects = await disasterEventSectorTotal__ById(
								qsDisEventId,
								ancestorIds,
								currency
							);

							// Populate sectorData - will be used for the sector filter
							if (!sectortData[x.id]) {
								sectortData[x.id] = {
									id: x.id,
									sectorname: x.sectorname,
									subSector: (await sectorChildrenById(
										x.id
									)) as interfaceSector[],
								};
							}

							// Populate Sector Pie Chart Data
							if (!sectorPieChartData[x.id]) {
								sectorPieChartData[x.id] = {
									damages: {
										name: x.sectorname,
										value: x.effects.damages.total,
									},
									losses: { name: x.sectorname, value: x.effects.losses.total },
									recovery: {
										name: x.sectorname,
										value: x.effects.recovery.total,
									},
								};
							} else {
								sectorPieChartData[x.id].damages.value +=
									x.effects.damages.total;
								sectorPieChartData[x.id].losses.value += x.effects.losses.total;
								sectorPieChartData[x.id].recovery.value +=
									x.effects.recovery.total;
							}

							// Populate Sector Bar Chart Data
							if (!sectorBarChartData[x.id]) {
								sectorBarChartData[x.id] = {
									name: x.sectorname,
									damage: x.effects.damages.total,
									losses: x.effects.losses.total,
								};
							} else {
								sectorBarChartData[x.id].damage += x.effects.damages.total;
								sectorBarChartData[x.id].losses += x.effects.losses.total;
							}
						}
					}

					// Convert object to array and sort sectorname in ascending order
					sectorParentArray = Object.values(sectortData).sort((a, b) =>
						a.sectorname.localeCompare(b.sectorname)
					);

					// Extract values only for damage, losses, and recovery
					sectorDamagePieChartData = Object.values(sectorPieChartData).map(
						(entry) => entry.damages
					);
					sectorLossesPieChartData = Object.values(sectorPieChartData).map(
						(entry) => entry.losses
					);
					sectorRecoveryPieChartData = Object.values(sectorPieChartData).map(
						(entry) => entry.recovery
					);

					// Remove the associate ID of the array to align to the format required by the chart.
					sectorBarChartData = Object.values(sectorBarChartData);

					countRelatedDisasterRecords =
						await disasterEvent_DisasterRecordsCount__ById(qsDisEventId);

					totalSectorEffects = await disasterEventSectorTotal__ById(
						qsDisEventId,
						[],
						currency
					);

					//retired, system is now using version 2
					totalAffectedPeople2 = await getAffected(dr, qsDisEventId);

					const divisionLevel1 = await getDivisionByLevel(
						countDivisionByLevel1 === 1 ? 2 : 1,
						settings.countryAccountsId
					);
					for (const item of divisionLevel1) {
						const totalPerDivision = await disasterEventSectorTotal__ByDivisionId(
								qsDisEventId,
								item.id,
								currency
							);
						const humanEffectsPerDivision = await getAffected(
							dr,
							qsDisEventId,
							{ divisionId: item.id }
						);

						// Populate the geoData for the map for the human effects
						humanEffectsGeoData.push({
							total: humanEffectsPerDivision.noDisaggregations.totalPeopleAffected,
							name: String(item.name["en"]),
							description:
								"Total People Affected: " +
								humanEffectsPerDivision.noDisaggregations.totalPeopleAffected.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});

						// Populate the geoData for the map for losses
						lossesGeoData.push({
							total: totalPerDivision.losses.total,
							name: String(item.name["en"]),
							description:
								"Total Losses: " +
								totalPerDivision.losses.currency +
								" " +
								totalPerDivision.losses.total.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});

						// Populate the geoData for the map for damages
						datamageGeoData.push({
							total: totalPerDivision.damages.total,
							name: String(item.name["en"]),
							description:
								"Total Damage: " +
								totalPerDivision.damages.currency +
								" " +
								totalPerDivision.damages.total.toLocaleString(
									navigator.language,
									{ minimumFractionDigits: 0 }
								),
							colorPercentage: 1,
							geojson: item.geojson,
						});
					}
				} catch (e) {
					console.log(e);
					throw e;
				}
			} else {
				return Response.json({}, { status: 404 });
			}
		}

		return {
			qsDisEventId: qsDisEventId,
			record: record,
			recordsRelatedSectors: recordsRelatedSectors,
			countRelatedDisasterRecords: countRelatedDisasterRecords,
			total: totalSectorEffects,
			cpDisplayName: cpDisplayName,
			datamageGeoData: datamageGeoData,
			lossesGeoData: lossesGeoData,
			humanEffectsGeoData: humanEffectsGeoData,
			totalAffectedPeople2: totalAffectedPeople2,
			sectorDamagePieChartData: sectorDamagePieChartData,
			sectorLossesPieChartData: sectorLossesPieChartData,
			sectorRecoveryPieChartData: sectorRecoveryPieChartData,
			sectorBarChartData: sectorBarChartData,
			sectorParentArray: sectorParentArray,
			currency,
		};
	}
);

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "Disaster Events Analysis - DELTA Resilience" },
		{
			name: "description",
			content: "Disaster events analysis page under DELTA Resilience.",
		},
	];
};

// React component for Disaster Events Analysis page
function DisasterEventsAnalysisContent() {
	const btnCancelRef = useRef<HTMLButtonElement>(null);
	const btnSubmitRef = useRef<HTMLButtonElement>(null);
	const mapChartRef = useRef<MapChartRef>(null); //  Reference to MapChart
	const [selectedSector, setSelectedSector] = useState("");
	const [selectedSubSector, setSelectedSubSector] = useState("");
	const [subSectors, setSubSectors] = useState<
		{ id: string; sectorname: string }[]
	>([]);

	const ld = useLoaderData<{
		qsDisEventId: string;
		record: DisasterEventViewModel | null;
		recordsRelatedSectors: any;
		countRelatedDisasterRecords: number | null;
		total: any | null;
		cpDisplayName: string;
		datamageGeoData: any;
		lossesGeoData: any;
		humanEffectsGeoData: any;
		totalAffectedPeople2: any;
		sectorDamagePieChartData: interfacePieChart[];
		sectorLossesPieChartData: interfacePieChart[];
		sectorRecoveryPieChartData: interfacePieChart[];
		sectorBarChartData: interfaceBarChart[];
		sectorParentArray: interfaceSector[];
		currency: string;
	}>();
	let disaggregationsAge2:
		| {
				children: number | undefined;
				adult: number | undefined;
				senior: number | undefined;
		  }
		| undefined = undefined;

	let [activeData, setActiveData] = useState(ld.datamageGeoData); //  Default MapChart geoData

	// Define the handleClearFilters function
	const handleClearFilters = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault(); // Prevent the default form submission
		window.location.href = "/analytics/disaster-events";
	};

	const handleSectorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		const sectorId = event.target.value;
		setSelectedSector(sectorId);

		// Filter sub-sectors based on selected sector ID
		const filteredSubSectors = ld.sectorParentArray.filter(
			(item) => item.id === sectorId
		);
		const element = document.getElementById("sector-apply-filter");

		if (filteredSubSectors.length === 0) {
			setSubSectors([]);
			setSelectedSubSector("");

			if (element) {
				element.style.pointerEvents = "none"; // Enables interaction
				element.style.opacity = "0.5"; // Set opacity to 50%
			}
		} else {
			setSubSectors(filteredSubSectors[0].subSector || []);
			setSelectedSubSector("");

			if (element) {
				element.style.pointerEvents = "auto"; // Enables interaction
				element.style.opacity = "1"; // Set opacity to normal
			}
		}
	};

	const handleSubSectorChange = (
		event: React.ChangeEvent<HTMLSelectElement>
	) => {
		const subSectorId = event.target.value;
		setSelectedSubSector(subSectorId);
	};

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

		const buttonText = e.currentTarget.textContent?.trim() || "Legend";

		e.currentTarget.ariaSelected = "true";

		setActiveData(data);
		mapChartRef.current?.setDataSource(data);
		mapChartRef.current?.setLegendTitle(buttonText);
		mapChartRef.current?.setLegendMaxColor(legendMaxColor);
	};

	useEffect(() => {
		if (ld.record) {
			if (btnCancelRef.current) {
				btnCancelRef.current.disabled = false;
			}
		} else {
			if (btnSubmitRef.current) {
				btnSubmitRef.current.disabled = false;
			}
			if (btnCancelRef.current) {
				btnCancelRef.current.disabled = true;
			}
		}
		mapChartRef.current?.setLegendTitle(`Total damages in ${ld.currency}`);
	}, []);

	// TODO: apply mapping of data, ask to revise key
	if (ld.record && ld.totalAffectedPeople2.disaggregations.age) {
		const ageData = ld.totalAffectedPeople2.disaggregations.age;
		disaggregationsAge2 = {
			children: ageData["0-14"],
			adult: ageData["15-64"],
			senior: ageData["65+"],
		};
	}

	return (
		<MainContainer
			title="Disaster Events Analysis"
			headerExtra={<NavSettings />}
		>
			<div style={{ maxWidth: "100%", overflow: "hidden" }}>
				<div className="disaster-events-page">
					<section>
						<div className="mg-container">
							<form className="dts-form" method="get">
								<div className="dts-form__body">
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-form-component">
											<label>
												<div className="dts-form-component__label">
													<span>Disaster event</span>
												</div>
												<ContentPicker
													{...contentPickerConfig}
													value={ld.record ? ld.record.id : ""}
													displayName={ld.cpDisplayName}
													onSelect={() => {
														if (btnCancelRef.current) {
															btnCancelRef.current.disabled = false;
														}
														if (btnSubmitRef.current) {
															btnSubmitRef.current.disabled = false;
														}
													}}
													disabledOnEdit={ld.record ? true : false}
												/>
											</label>
										</div>
									</div>
									<div className="dts-form__actions">
										<button
											ref={btnSubmitRef}
											type="submit"
											className="mg-button mg-button--small mg-button-primary"
											disabled
										>
											Apply filters
										</button>
										<button
											ref={btnCancelRef}
											onClick={handleClearFilters}
											type="button"
											className="mg-button mg-button--small mg-button-outline"
										>
											Clear
										</button>
									</div>
								</div>
							</form>
						</div>
					</section>

					{/* Conditional rendering: Display this message until filters are applied */}
					{!ld.record && (
						<div
							style={{
								marginTop: "1.43rem",
								textAlign: "justify",
								padding: "1.43rem",
								borderRadius: "8px",
								backgroundColor: "#f9f9f9",
								color: "#333",
								fontSize: "1.14rem",
								lineHeight: "1.29rem",
							}}
						>
							<h3
								style={{
									color: "#004f91",
									fontSize: "1.43rem",
									marginBottom: "0.71rem",
									textAlign: "center",
								}}
							>
								Welcome to the Disaster Events Dashboard! 🌟
							</h3>
							<p style={{ textAlign: "center" }}>
								Please select and apply filters above to view the analysis.
							</p>
						</div>
					)}
				</div>

				{ld.record && (
					<>
						<section className="dts-page-section">
							<div className="mg-container">
								<h2 className="dts-heading-2">{ld.cpDisplayName}</h2>
								<p>
									<strong>Affiliated record(s)</strong>:
									&nbsp;
									{ld.countRelatedDisasterRecords}{" "}
									{ld.countRelatedDisasterRecords &&
										ld.countRelatedDisasterRecords > 0 && (
											<a href={`/disaster-record?search=${ld.qsDisEventId}`}>
												View records
											</a>
										)}
								</p>

								{Array.isArray(ld.recordsRelatedSectors) &&
									ld.recordsRelatedSectors.length > 0 && (
										<>
											<p>
												{Array.isArray(ld.recordsRelatedSectors) &&
													ld.recordsRelatedSectors.map((sector, index) => (
														<span key={index}>
															{sector.sectorname}
															{ld.recordsRelatedSectors.length == index + 1
																? " "
																: ", "}
														</span>
													))}
											</p>
										</>
									)}

								{ld.record && (ld.record.startDate || ld.record.endDate) && (
									<>
										<p>
											<strong>Date</strong>: {ld.record.startDate} to{" "}
											{ld.record.endDate}
										</p>
									</>
								)}

								{ld.record && ld.record.dataSource && (
									<>
										<p>Data Source: {ld.record.dataSource}</p>
									</>
								)}

								<div className="mg-grid mg-grid__col-3">
									{Number(ld.total.damages.total) > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span id="elementId03">
													Damage in {ld.total.damages.currency}
												</span>
											</h3>
											<div className="dts-indicator dts-indicator--target-box-b">
												<span>
													{ld.total.damages.total.toLocaleString(
														navigator.language,
														{ minimumFractionDigits: 0 }
													)}
												</span>
											</div>
										</div>
									)}

									{Number(ld.total.losses.total) > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span id="elementId04">
													Losses in {ld.total.losses.currency}
												</span>
											</h3>
											<div className="dts-indicator dts-indicator--target-box-c">
												<span>
													{ld.total.losses.total.toLocaleString(
														navigator.language,
														{ minimumFractionDigits: 0 }
													)}
												</span>
											</div>
										</div>
									)}

									{Number(ld.total.recovery.total) > 0 && (
										<>
											<div className="dts-data-box">
												<h3 className="dts-body-label">
													<span id="elementId05">
														Recovery in {ld.total.recovery.currency}
													</span>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-d">
													<span>
														{ld.total.recovery.total.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
													</span>
												</div>
											</div>
										</>
									)}
								</div>
							</div>
						</section>

						{Number(ld.totalAffectedPeople2.noDisaggregations.totalPeopleAffected) > 0 && (
							<>
								<section className="dts-page-section">
									<div className="mg-container">
										<h2 className="dts-heading-2">Human effects</h2>

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
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-f">
													<span>
														{
														ld.totalAffectedPeople2.noDisaggregations.totalPeopleAffected.toLocaleString(navigator.language, {
															minimumFractionDigits: 0,
														})}
													</span>
												</div>
											</div>
										</div>
									</div>
								</section>

								<section className="dts-page-section">
									<div className="mg-container">
										<div className="mg-grid mg-grid__col-3">
											<div className="dts-data-box">
												<h3 className="dts-body-label">
													<span>Death</span>
													<div
														className="dts-tooltip__button"
														onPointerEnter={(e) =>
															createFloatingTooltip({
																content:
																	"Death is the number of people who died as a result of the disaster event.",
																target: e.currentTarget,
																placement: "top",
																offsetValue: 8,
															})
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-g">
													<span>
														{ld.totalAffectedPeople2.noDisaggregations.tables.deaths.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
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
																content:
																	"Injured is the number of people who were injured as a result of the disaster event.",
																target: e.currentTarget,
																placement: "top",
																offsetValue: 8,
															})
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-g">
													<span>
														{ld.totalAffectedPeople2.noDisaggregations.tables.injured.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
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
																content:
																	"Missing is the number of people who were missing as a result of the disaster event.",
																target: e.currentTarget,
																placement: "top",
																offsetValue: 8,
															})
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-g">
													<span>
														{ld.totalAffectedPeople2.noDisaggregations.tables.missing.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
													</span>
												</div>
											</div>
										</div>
									</div>
								</section>

								<section className="dts-page-section">
									<div className="mg-container">
										<div className="mg-grid mg-grid__col-3">
											<div className="dts-data-box">
												<h3 className="dts-body-label">
													<span>
														People directly affected (old DesInventar)
													</span>
													<div
														className="dts-tooltip__button"
														onPointerEnter={(e) =>
															createFloatingTooltip({
																content:
																	"People directly affected (old DesInventar) is the number of people who were directly affected by the disaster event.",
																target: e.currentTarget,
																placement: "top",
																offsetValue: 8,
															})
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-g">
													<span>
														{ld.totalAffectedPeople2.noDisaggregations.tables.directlyAffected.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
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
																content:
																	"Displaced is the number of people who were displaced as a result of the disaster event.",
																target: e.currentTarget,
																placement: "top",
																offsetValue: 8,
															})
														}
													>
														<svg
															aria-hidden="true"
															focusable="false"
															role="img"
														>
															<use href="/assets/icons/information_outline.svg#information"></use>
														</svg>
													</div>
												</h3>
												<div className="dts-indicator dts-indicator--target-box-g">
													<span>
														{ld.totalAffectedPeople2.noDisaggregations.tables.displaced.toLocaleString(
															navigator.language,
															{ minimumFractionDigits: 0 }
														)}
													</span>
												</div>
											</div>
										</div>
									</div>
								</section>

								<section className="dts-page-section">
									<div className="mg-container">
										<div className="mg-grid mg-grid__col-3">
											{ld.totalAffectedPeople2.disaggregations.sex &&
												(ld.totalAffectedPeople2.disaggregations.sex.m ||
													ld.totalAffectedPeople2.disaggregations.sex.f ||
													ld.totalAffectedPeople2.disaggregations.sex.o) && (
													<div className="dts-data-box">
														<h3 className="dts-body-label">
															<span>Men and women affected</span>
															<div
																className="dts-tooltip__button"
																onPointerEnter={(e) =>
																	createFloatingTooltip({
																		content:
																			"Men and women affected is the number of men and women who were affected by the disaster event.",
																		target: e.currentTarget,
																		placement: "top",
																		offsetValue: 8,
																	})
																}
															>
																<svg
																	aria-hidden="true"
																	focusable="false"
																	role="img"
																>
																	<use href="/assets/icons/information_outline.svg#information"></use>
																</svg>
															</div>
														</h3>
														<div style={{ height: "300px" }}>
															<HorizontalBarChart
																data={[
																	{
																		name: "",
																		Men: ld.totalAffectedPeople2.disaggregations
																			.sex.m,
																		Women:
																			ld.totalAffectedPeople2.disaggregations
																				.sex.f,
																		"Other non-Binary":
																			ld.totalAffectedPeople2.disaggregations
																				.sex.o,
																	},
																]}
																colorScheme="violet"
																imgSrc="/assets/icons/Male&Female.svg"
															/>
														</div>
													</div>
												)}

											{((ld.totalAffectedPeople2.disaggregations.disability &&
												ld.totalAffectedPeople2.disaggregations.disability
													.disability) ||
												(ld.totalAffectedPeople2.disaggregations
													.globalPovertyLine &&
													ld.totalAffectedPeople2.disaggregations
														.globalPovertyLine.below) ||
												(ld.totalAffectedPeople2.disaggregations
													.nationalPovertyLine &&
													ld.totalAffectedPeople2.disaggregations
														.nationalPovertyLine.below)) && (
												<div className="dts-data-box">
													<h3 className="dts-body-label">
														<span>
															Persons with disabilities and living in poverty
															affected
														</span>
														<div
															className="dts-tooltip__button"
															onPointerEnter={(e) =>
																createFloatingTooltip({
																	content:
																		"Persons with disabilities and living in poverty affected is the number of persons with disabilities and living in poverty who were affected by the disaster event.",
																	target: e.currentTarget,
																	placement: "top",
																	offsetValue: 8,
																})
															}
														>
															<svg
																aria-hidden="true"
																focusable="false"
																role="img"
															>
																<use href="/assets/icons/information_outline.svg#information"></use>
															</svg>
														</div>
													</h3>
													<div style={{ height: "350px" }}>
														<HorizontalBarChart
															data={[
																{
																	name: "",
																	"Persons with disabilities":
																		ld.totalAffectedPeople2.disaggregations
																			.disability.disability,
																	"Persons living in poverty (national)":
																		ld.totalAffectedPeople2.disaggregations
																			.nationalPovertyLine.below,
																	"Persons living in poverty (international)":
																		ld.totalAffectedPeople2.disaggregations
																			.globalPovertyLine.below,
																},
															]}
															colorScheme="cerulean"
															imgSrc="/assets/icons/People-with-physical-impairments.svg"
														/>
													</div>
												</div>
											)}

											{ld.totalAffectedPeople2.disaggregations.age &&
												disaggregationsAge2 &&
												disaggregationsAge2.children && (
													<div className="dts-data-box">
														<h3 className="dts-body-label">
															<span>
																Children, adults, and seniors affected
															</span>
															<div
																className="dts-tooltip__button"
																onPointerEnter={(e) =>
																	createFloatingTooltip({
																		content:
																			"Children, adults, and seniors affected is the number of children, adults, and seniors who were affected by the disaster event.",
																		target: e.currentTarget,
																		placement: "top",
																		offsetValue: 8,
																	})
																}
															>
																<svg
																	aria-hidden="true"
																	focusable="false"
																	role="img"
																>
																	<use href="/assets/icons/information_outline.svg#information"></use>
																</svg>
															</div>
														</h3>
														<div style={{ height: "300px" }}>
															<HorizontalBarChart
																data={[
																	{
																		name: "",
																		Children: Number(
																			disaggregationsAge2?.children
																		),
																		Adults: Number(disaggregationsAge2?.adult),
																		Seniors: Number(
																			disaggregationsAge2?.senior
																		),
																	},
																]}
																colorScheme="violet"
																imgSrc="/assets/icons/Male&Female.svg"
															/>
														</div>
													</div>
												)}
										</div>
									</div>
								</section>
							</>
						)}

						{(Number(ld.total.damages.total) > 0 ||
							Number(ld.total.losses.total) > 0 ||
							Number(ld.total.recovery.total) > 0) && (
							<>
								<section className="dts-page-section">
									<div className="mg-container">
										<h2 className="dts-heading-2">Affected areas/zones</h2>

										<ul
											className="dts-tablist"
											role="tablist"
											aria-labelledby="tablist01"
										>
											<li role="presentation">
												<button
													onClick={(e) =>
														handleSwitchMapData(
															e,
															ld.datamageGeoData,
															"#208f04"
														)
													}
													type="button"
													className="dts-tablist__button"
													role="tab"
													id="tab01"
													aria-selected="true"
													aria-controls="tabpanel01"
												>
													<span>Total Damage in {ld.currency}</span>
												</button>
											</li>
											<li role="presentation">
												<button
													onClick={(e) =>
														handleSwitchMapData(
															e,
															ld.humanEffectsGeoData,
															"#ff1010"
														)
													}
													type="button"
													className="dts-tablist__button"
													role="tab"
													id="tab02"
													aria-controls="tabpanel02"
													aria-selected="false"
												>
													<span>Total Affected</span>
												</button>
											</li>
											<li role="presentation">
												<button
													onClick={(e) =>
														handleSwitchMapData(e, ld.lossesGeoData, "#58508d")
													}
													type="button"
													className="dts-tablist__button"
													role="tab"
													id="tab03"
													aria-controls="tabpanel03"
													aria-selected="false"
												>
													<span>Total Losses in {ld.currency}</span>
												</button>
											</li>
										</ul>
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
													legendTitle="Total Damage"
													legendMaxColor="#208f04"
												/>
											</div>
										</div>
									</div>
								</section>
							</>
						)}

						<section className="dts-page-section">
							<div className="mg-container">
								<h2 className="dts-heading-2">
									{ld.cpDisplayName} impacts on sectors
								</h2>

								<div className="mg-grid mg-grid__col-3">
									{Object.keys(ld.sectorDamagePieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span>Damage</span>
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													data={ld.sectorDamagePieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}

									{Object.keys(ld.sectorLossesPieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span>Losses</span>
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													data={ld.sectorLossesPieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}

									{Object.keys(ld.sectorRecoveryPieChartData).length > 0 && (
										<div className="dts-data-box">
											<h3 className="dts-body-label">
												<span>Recovery need</span>
											</h3>
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomPieChart
													data={ld.sectorRecoveryPieChartData}
													boolRenderLabel={false}
													currency={ld.currency}
												/>
											</div>
										</div>
									)}
								</div>

								{Object.keys(ld.sectorBarChartData).length > 0 && (
									<div className="mg-grid mg-grid__col-1">
										<div className="dts-data-box">
											<div
												className="dts-placeholder"
												style={{ height: "400px" }}
											>
												<CustomStackedBarChart data={ld.sectorBarChartData} />
											</div>
										</div>
									</div>
								)}
							</div>
						</section>

						{ld.sectorParentArray.length > 0 && (
							<>
								<section className="dts-page-section">
									<div className="mg-container">
										<h2 className="dts-heading-2">Details of effects</h2>
										<form className="dts-form">
											<div className="dts-form__body">
												<div className="mg-grid mg-grid__col-auto">
													<div className="dts-form-component">
														<label>
															<div className="dts-form-component__label">
																<span>Sector *</span>
															</div>
															<select
																id="sector-select"
																className="filter-select"
																name="sector"
																required
																onChange={handleSectorChange}
															>
																<option value="">Select Sector</option>
																{ld.sectorParentArray.map((item, index) => (
																	<option key={index} value={item.id}>
																		{item.sectorname}
																	</option>
																))}
															</select>
														</label>
													</div>
													<div className="dts-form-component">
														<label>
															<div className="dts-form-component__label">
																<span>Sub Sector</span>
															</div>
															<select
																id="sub-sector-select"
																className="filter-select"
																name="sub-sector"
																onChange={handleSubSectorChange}
															>
																<option value="">Select Sector First</option>
																{subSectors.map(
																	(sub: { id: string; sectorname: string }) => (
																		<option key={sub.id} value={sub.id}>
																			{sub.sectorname}
																		</option>
																	)
																)}
															</select>
														</label>
													</div>
												</div>
												<div className="dts-form__actions">
													<Link
														id="sector-apply-filter"
														style={{ pointerEvents: "none", opacity: 0.5 }}
														to={`/analytics/disaster-events/sector/?disasterEventId=${ld.record.id}&sectorid=${selectedSector}&subsectorid=${selectedSubSector}`}
														className="mg-button mg-button--small mg-button-primary"
													>
														Apply filters
													</Link>
													<Link
														id="sector-clear-filter"
														to={`/analytics/disaster-events/?disasterEventId=${ld.record.id}`}
														className="mg-button mg-button--small mg-button-outline"
													>
														Clear
													</Link>
												</div>
											</div>
										</form>
									</div>
								</section>
							</>
						)}

						<Outlet context={{ name: "joel" }} />
					</>
				)}

				<p>&nbsp;</p>
				<p>&nbsp;</p>
				<div className="dts-caption mt-4">
					* Data shown is based on published records
				</div>
			</div>
		</MainContainer>
	);
}

// Wrapper component that provides QueryClient
export default function DisasterEventsAnalysis() {
	return <DisasterEventsAnalysisContent />;
}
