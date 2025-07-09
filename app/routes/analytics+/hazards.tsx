import {
	MetaFunction,
	ActionFunctionArgs,
} from "@remix-run/node";
import { useEffect, useState } from "react";
import {
	useActionData,
	useLoaderData,
} from "@remix-run/react";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { public_tenant_context } from "~/util/tenant";
import { fetchHazardTypes } from "~/backend.server/models/analytics/hazard-types";
import { fetchAllSpecificHazards } from "~/backend.server/models/analytics/specific-hazards";
import {
	getAffectedPeopleByHazardFilters,
	getAgeTotalsByHazardFilters,
	getDisabilityTotalByHazardFilters,
	getDisasterEventCount,
	getDisasterEventCountByDivision,
	getDisasterEventCountByYear,
	getDisasterSummary,
	getGenderTotalsByHazardFilters,
	getInternationalPovertyTotalByHazardFilters,
	getNationalPovertyTotalByHazardFilters,
	getTotalAffectedPeopleByDivision,
	getTotalDamagesByDivision,
	getTotalDamagesByHazardFilters,
	getTotalDamagesByYear,
	getTotalDeathsByDivision,
	getTotalLossesByDivision,
	getTotalLossesByHazardFilters,
	getTotalLossesByYear,
} from "~/backend.server/models/analytics/hazard-analysis";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/routes/settings/nav";
import HazardFilters from "~/frontend/analytics/hazards/sections/HazardFilters";
import ImpactByHazard from "~/frontend/analytics/hazards/sections/ImpactByHazard";
import { getDivisionByLevel, getDivisionIdAndNameByLevel } from "~/backend.server/models/division";
import { fetchHazardClusters } from "~/backend.server/models/analytics/hazard-clusters";
import HumanAffects from "~/frontend/analytics/hazards/sections/HumanAffects";
import DamagesAndLoses from "~/frontend/analytics/hazards/sections/DamagesAndLoses";
import DisasterEventsList from "~/frontend/analytics/hazards/sections/DisasterEventsList";
import HazardImpactMap from "~/frontend/analytics/hazards/sections/HazardImpactMap";
import { getCurrenciesAsListFromCommaSeparated } from "~/util/currency";
import { getCountrySettingsFromSession } from "~/util/session";

// Define an interface for the structure of the JSON objects
interface interfaceMap {
	total: number;
	name: string;
	description: string;
	colorPercentage: number;
	geojson: any;
}

export const loader = authLoaderPublicOrWithPerm(
	"ViewData",
	async ({request}) => {
		const settings = await getCountrySettingsFromSession(request);
		let currencies: string[] = [];
		if (settings) {
			currencies = getCurrenciesAsListFromCommaSeparated(settings.currencyCodes);
		}

		const currency = currencies[0] || "PHP";
		const hazardTypes = await fetchHazardTypes();
		const hazardClusters = await fetchHazardClusters(null);
		const specificHazards = await fetchAllSpecificHazards();
		const level1DivisionNames = await getDivisionIdAndNameByLevel(1, public_tenant_context);

		return {
			currency,
			hazardTypes,
			hazardClusters,
			specificHazards,
			level1DivisionNames
		};
	}
);

function getStringValue(value: FormDataEntryValue | null): string | null {
	return typeof value === "string" ? value : null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	const hazardTypeId = getStringValue(formData.get("hazardTypeId"));
	const hazardClusterId = getStringValue(formData.get("hazardClusterId"));
	const specificHazardId = getStringValue(formData.get("specificHazardId"));
	const geographicLevelId = getStringValue(formData.get("geographicLevelId"));
	const fromDate = getStringValue(formData.get("fromDate"));
	const toDate = getStringValue(formData.get("toDate"));

	const filters = {
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	};

	const settings = await getCountrySettingsFromSession(request);
	let currency = "USD";
	if (settings) {
		currency = settings.currencyCodes?.split(",")[0]
	}
	const geographicLevel1 = await getDivisionByLevel(1, public_tenant_context);

	const disasterCount = await getDisasterEventCount(filters);
	const yearlyDisasterCounts = await getDisasterEventCountByYear(filters);
	const { totalMen, totalWomen, totalNonBinary } = await getGenderTotalsByHazardFilters(filters);
	const {
		totalDeaths,
		totalInjured,
		totalMissing,
		totalDisplaced,
		totalAffectedDirect,
		totalAffectedIndirect,
	} = await getAffectedPeopleByHazardFilters(filters);
	const { totalChildren, totalAdults, totalSeniors } = await getAgeTotalsByHazardFilters(filters);
	const totalDisability = await getDisabilityTotalByHazardFilters(filters);
	const totalInternationalPoorPeople = await getInternationalPovertyTotalByHazardFilters(filters);
	const totalNationalPoorPeople = await getNationalPovertyTotalByHazardFilters(filters);
	const totalDamages = await getTotalDamagesByHazardFilters(filters);
	const totalLosses = await getTotalLossesByHazardFilters(filters);
	const totalDamagesByYear = await getTotalDamagesByYear(filters);
	const totalLossesByYear = await getTotalLossesByYear(filters);
	const damagesByDivision = await getTotalDamagesByDivision(filters);
	const lossesByDivision = await getTotalLossesByDivision(filters);
	const deathsByDivision = await getTotalDeathsByDivision(filters);
	const affectedPeopleByDivision = await getTotalAffectedPeopleByDivision(filters);
	const disasterEventCountByDivision = await getDisasterEventCountByDivision(filters);

	// Build damagesGeoData
	const maxDamages = Math.max(...damagesByDivision.map((d) => d.totalDamages), 1);
	const damagesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionDamage = damagesByDivision.find((d) => d.divisionId === division.id.toString());
		const total = divisionDamage ? divisionDamage.totalDamages : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total Damages: ${total} ${currency}`,
			colorPercentage: total / maxDamages,
			geojson: division.geojson || {},
		};
	});

	// Build lossesGeoData
	const maxLosses = Math.max(...lossesByDivision.map((l) => l.totalLosses), 1);
	const lossesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionLoss = lossesByDivision.find((l) => l.divisionId === division.id.toString());
		const total = divisionLoss ? divisionLoss.totalLosses : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total Losses: ${total} ${currency}`,
			colorPercentage: total / maxLosses,
			geojson: division.geojson || {},
		};
	});

	// Build deathsGeoData
	const maxDeaths = Math.max(...deathsByDivision.map((d) => d.totalDeaths), 1);
	const deathsGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionDeaths = deathsByDivision.find((d) => d.divisionId === division.id.toString());
		const total = divisionDeaths ? divisionDeaths.totalDeaths : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total Deaths: ${total}`,
			colorPercentage: total / maxDeaths,
			geojson: division.geojson || {},
		};
	});

	// Build affectedPeopleGeoData
	const maxAffected = Math.max(...affectedPeopleByDivision.map((a) => a.totalAffected), 1);
	const affectedPeopleGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionAffected = affectedPeopleByDivision.find((a) => a.divisionId === division.id.toString());
		const total = divisionAffected ? divisionAffected.totalAffected : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Total Affected People: ${total}`,
			colorPercentage: total / maxAffected,
			geojson: division.geojson || {},
		};
	});

	// Build disasterEventGeoData
	const maxEvents = Math.max(...disasterEventCountByDivision.map((e) => e.eventCount), 1);
	const disasterEventGeoData: interfaceMap[] = geographicLevel1.map((division) => {
		const divisionEvents = disasterEventCountByDivision.find((e) => e.divisionId === division.id.toString());
		const total = divisionEvents ? divisionEvents.eventCount : 0;
		return {
			total,
			name: division.name["en"] || "Unknown",
			description: `Disaster Events: ${total}`,
			colorPercentage: total / maxEvents,
			geojson: division.geojson || {},
		};
	});

	const disasterSummary = await getDisasterSummary(filters);

	return {
		currency,
		disasterCount,
		yearlyDisasterCounts,
		totalDeaths,
		totalInjured,
		totalMissing,
		totalDisplaced,
		totalAffectedDirect,
		totalAffectedIndirect,
		totalMen,
		totalWomen,
		totalNonBinary,
		totalChildren,
		totalAdults,
		totalSeniors,
		totalDisability,
		totalInternationalPoorPeople,
		totalNationalPoorPeople,
		totalDamages,
		totalLosses,
		totalDamagesByYear,
		totalLossesByYear,
		damagesGeoData,
		lossesGeoData,
		deathsGeoData,
		affectedPeopleGeoData,
		disasterEventGeoData,
		disasterSummary,
		hazardTypeId,
		hazardClusterId,
		specificHazardId,
		geographicLevelId,
		fromDate,
		toDate,
	};
};

export default function HazardAnalysis() {
	const {
		currency,
		hazardTypes,
		hazardClusters,
		specificHazards,
		level1DivisionNames
		// geographicLevel1: geographicLevels,

	} = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const [appliedFilters, setAppliedFilters] = useState<{
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
	}>({
		hazardTypeId: null,
		hazardClusterId: null,
		specificHazardId: null,
		geographicLevelId: null,
		fromDate: null,
		toDate: null,
	});

	// Inside HazardAnalysis component, before return
	useEffect(() => {
		if (actionData) {
			// Update appliedFilters based on the latest form submission
			setAppliedFilters({
				hazardTypeId: actionData.hazardTypeId || null,
				hazardClusterId: actionData.hazardClusterId || null,
				specificHazardId: actionData.specificHazardId || null,
				geographicLevelId: actionData.geographicLevelId || null,
				fromDate: actionData.fromDate || null,
				toDate: actionData.toDate || null,
			});
		}
	}, [actionData]);
	const handleClearFilters = () => {
		setAppliedFilters({
			hazardTypeId: null,
			hazardClusterId: null,
			specificHazardId: null,
			geographicLevelId: null,
			fromDate: null,
			toDate: null,
		});
	};

	const hazardName =
		appliedFilters.specificHazardId && specificHazards.length > 0
			? specificHazards.find((h) => h.id === appliedFilters.specificHazardId)
				?.nameEn || "Unknown Hazard"
			: appliedFilters.hazardClusterId && hazardClusters.length > 0
				? hazardClusters.find((c) => c.id === appliedFilters.hazardClusterId)
					?.name || "Unknown Cluster"
				: appliedFilters.hazardTypeId
					? hazardTypes.find((t) => t.id === appliedFilters.hazardTypeId)?.name ||
					"Unknown Type"
					: null;

	const geographicName =
		appliedFilters.geographicLevelId && level1DivisionNames.length > 0
			? level1DivisionNames.find(
				(g) => g.id.toString() === appliedFilters.geographicLevelId
			)?.name["en"] || "Unknown Level"
			: null;

	const totalPeopleAffected = actionData
		? Number(actionData.totalAffectedDirect) +
		Number(actionData.totalDisplaced) +
		Number(actionData.totalInjured) +
		Number(actionData.totalMissing)
		: 0;

	return (
		<MainContainer title="Hazards Analysis" headerExtra={<NavSettings />}>
			<div style={{ maxWidth: "100%", overflow: "hidden" }}>
				<div className="sectors-page">
					<HazardFilters
						hazardTypes={hazardTypes}
						hazardClusters={hazardClusters}
						specificHazards={specificHazards}
						geographicLevels={level1DivisionNames}
						onClearFilters={handleClearFilters}
						selectedHazardClusterId={appliedFilters.hazardClusterId}
						selectedSpecificHazardId={appliedFilters.specificHazardId}
						selectedGeographicLevelId={appliedFilters.geographicLevelId}
					/>
					{!hazardName && (
						<div
							style={{
								marginTop: "2rem",
								textAlign: "center",
								padding: "2rem",
								borderRadius: "8px",
								backgroundColor: "#f9f9f9",
								color: "#333",
								fontSize: "1.6rem",
								lineHeight: "1.8rem",
							}}
						>
							<h3
								style={{
									color: "#004f91",
									fontSize: "2rem",
									marginBottom: "1rem",
								}}
							>
								Welcome to the Hazard Dashboard! 🌟
							</h3>
							<p>Please select and apply filters above to view the analysis.</p>
						</div>
					)}
					{hazardName && (
						<div
							className="sectors-content"
							style={{
								marginTop: "2rem",
								maxWidth: "100%",
								overflow: "hidden",
							}}
						>
							{actionData && (
								<HazardImpactMap
									hazardName={hazardName}
									geographicName={geographicName}
									localCurrency={currency}
									damagesGeoData={actionData.damagesGeoData}
									lossesGeoData={actionData.lossesGeoData}
									disasterEventGeoData={actionData.disasterEventGeoData}
									affectedPeopleGeoData={actionData.affectedPeopleGeoData}
									deathsGeoData={actionData.deathsGeoData}
								/>
							)}

							{actionData && (
								<ImpactByHazard
									hazardName={hazardName}
									geographicName={geographicName}
									fromDate={appliedFilters.fromDate}
									toDate={appliedFilters.toDate}
									disasterCount={actionData.disasterCount}
									yearlyEventsCount={actionData.yearlyDisasterCounts}
								/>
							)}

							{actionData && (
								<HumanAffects
									totalPeopleAffected={totalPeopleAffected}
									totalDeaths={actionData.totalDeaths}
									totalDisplaced={actionData.totalDisplaced}
									totalInjured={actionData.totalInjured}
									totalMissing={actionData.totalMissing}
									totalPeopleDirectlyAffected={actionData.totalAffectedDirect}
									noOfMen={actionData.totalMen}
									noOfWomen={actionData.totalWomen}
									noOfNonBinary={actionData.totalNonBinary}
									totalChildren={actionData.totalChildren}
									totalAdults={actionData.totalAdults}
									totalSeniors={actionData.totalSeniors}
									totalDisability={actionData.totalDisability}
									totalInternationalPoorPeople={
										actionData.totalInternationalPoorPeople
									}
									totalNationalPoorPeople={actionData.totalNationalPoorPeople}
								/>
							)}

							{actionData && (
								<DamagesAndLoses
									localCurrency={currency}
									totalDamages={actionData.totalDamages}
									totalLosses={actionData.totalLosses}
									totalDamagesByYear={actionData.totalDamagesByYear}
									totalLossesByYear={actionData.totalLossesByYear}
								/>
							)}
							{actionData && (
								<DisasterEventsList
									hazardName={hazardName}
									geographicName={geographicName}
									disasterSummaryTable={actionData.disasterSummary}
								/>
							)}
						</div>
					)}
				</div>
			</div>
		</MainContainer>
	);
}

export const meta: MetaFunction = () => {
	return [
		{ title: "Hazards Analysis - DTS" },
		{ name: "description", content: "Hazards analysis page under DTS." },
	];
};
