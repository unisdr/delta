import { json, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { useState } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { fetchHazardTypes } from "~/backend.server/models/analytics/hazard-types";
import { fetchAllSpecificHazards } from "~/backend.server/models/analytics/specific-hazards";
import {
	getAffectedPeopleByHazardFilters,
	getAgeTotalsByHazardFilters,
	getDisabilityTotalByHazardFilters,
	getDisasterEventCount,
	getDisasterEventCountByDivision,
	getDisasterEventCountByYear,
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
import { getDivisionByLevel } from "~/backend.server/models/division";
import { fetchHazardClusters } from "~/backend.server/models/analytics/hazard-clusters";
import HumanAffects from "~/frontend/analytics/hazards/sections/HumanAffects";
import DamagesAndLoses from "~/frontend/analytics/hazards/sections/DamagesAndLoses";
import DisasterEventsList from "~/frontend/analytics/hazards/sections/DisasterEventsList";
import HazardImpactMap from "~/frontend/analytics/hazards/sections/HazardImpactMap";

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
	async ({ request }: LoaderFunctionArgs) => {
		const url = new URL(request.url);
		const hazardTypeId = url.searchParams.get("hazardTypeId") || null;
		const hazardClusterId = url.searchParams.get("hazardClusterId") || null;
		const specificHazardId = url.searchParams.get("specificHazardId") || null;
		const geographicLevelId = url.searchParams.get("geographicLevelId") || null;
		const fromDate = url.searchParams.get("fromDate") || null;
		const toDate = url.searchParams.get("toDate") || null;

		const currency = process.env.CURRENCY_CODES?.split(",")[0] || "PHP";
		const hazardTypes = await fetchHazardTypes();
		const hazardClusters = await fetchHazardClusters(null);
		const specificHazards = await fetchAllSpecificHazards();
		const geographicLevel1 = await getDivisionByLevel(1);

		const filters = {
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		};

		const disasterCount = await getDisasterEventCount(filters);

		const yearlyDisasterCounts = await getDisasterEventCountByYear(filters);

		const { totalMen, totalWomen, totalNonBinary } =
			await getGenderTotalsByHazardFilters(filters);

		const {
			totalDeaths,
			totalInjured,
			totalMissing,
			totalDisplaced,
			totalAffectedDirect,
			totalAffectedIndirect,
		} = await getAffectedPeopleByHazardFilters(filters);

		const { totalChildren, totalAdults, totalSeniors } =
			await getAgeTotalsByHazardFilters(filters);

		const totalDisability = await getDisabilityTotalByHazardFilters({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const totalInternationalPoorPeople =
			await getInternationalPovertyTotalByHazardFilters(filters);

		const totalNationalPoorPeople =
			await getNationalPovertyTotalByHazardFilters({
				hazardTypeId,
				hazardClusterId,
				specificHazardId,
				geographicLevelId,
				fromDate,
				toDate,
			});

		const totalDamages = await getTotalDamagesByHazardFilters(filters);

		const totalLosses = await getTotalLossesByHazardFilters(filters);

		const totalDamagesByYear = await getTotalDamagesByYear(filters);

		const totalLossesByYear = await getTotalLossesByYear(filters);

		// Get damages by division
		const damagesByDivision = await getTotalDamagesByDivision(filters);

		// Get losses by division
		const lossesByDivision = await getTotalLossesByDivision(filters);

		// Get deaths by division
		const deathsByDivision = await getTotalDeathsByDivision(filters);

		// Get affected people by division
		const affectedPeopleByDivision = await getTotalAffectedPeopleByDivision(
			filters
		);

		// Get disaster event count by division
		const disasterEventCountByDivision = await getDisasterEventCountByDivision(
			filters
		);

		// Build damagesGeoData
		const maxDamages = Math.max(
			...damagesByDivision.map((d) => d.totalDamages),
			1
		); // Avoid division by 0
		const damagesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
			const divisionDamage = damagesByDivision.find(
				(d) => d.divisionId === division.id.toString()
			);
			const total = divisionDamage ? divisionDamage.totalDamages : 0;
			return {
				total,
				name: division.name["en"] || "Unknown",
				description: `Total Damages: ${total} ${currency}`,
				colorPercentage: total / maxDamages, // Normalized 0-1 for coloring
				geojson: division.geojson || {}, 
			};
		});

		// Build lossesGeoData
		const maxLosses = Math.max(
			...lossesByDivision.map((l) => l.totalLosses),
			1
		); // Avoid division by 0
		const lossesGeoData: interfaceMap[] = geographicLevel1.map((division) => {
			const divisionLoss = lossesByDivision.find(
				(l) => l.divisionId === division.id.toString()
			);
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
		const maxDeaths = Math.max(
			...deathsByDivision.map((d) => d.totalDeaths),
			1
		);
		const deathsGeoData: interfaceMap[] = geographicLevel1.map((division) => {
			const divisionDeaths = deathsByDivision.find(
				(d) => d.divisionId === division.id.toString()
			);
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
		const maxAffected = Math.max(
			...affectedPeopleByDivision.map((a) => a.totalAffected),
			1
		);
		const affectedPeopleGeoData: interfaceMap[] = geographicLevel1.map(
			(division) => {
				const divisionAffected = affectedPeopleByDivision.find(
					(a) => a.divisionId === division.id.toString()
				);
				const total = divisionAffected ? divisionAffected.totalAffected : 0;
				return {
					total,
					name: division.name["en"] || "Unknown",
					description: `Total Affected People: ${total}`,
					colorPercentage: total / maxAffected,
					geojson: division.geojson || {},
				};
			}
		);

		// Build disasterEventGeoData
		const maxEvents = Math.max(
			...disasterEventCountByDivision.map((e) => e.eventCount),
			1
		);
		const disasterEventGeoData: interfaceMap[] = geographicLevel1.map(
			(division) => {
				const divisionEvents = disasterEventCountByDivision.find(
					(e) => e.divisionId === division.id.toString()
				);
				const total = divisionEvents ? divisionEvents.eventCount : 0;
				return {
					total,
					name: division.name["en"] || "Unknown",
					description: `Disaster Events: ${total}`,
					colorPercentage: total / maxEvents,
					geojson: division.geojson || {},
				};
			}
		);

		return json({
			currency,
			hazardTypes,
			hazardClusters,
			specificHazards,
			geographicLevels: geographicLevel1,
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
		});
	}
);

export default function HazardAnalysis() {
	const {
		currency,
		hazardTypes,
		hazardClusters,
		specificHazards,
		geographicLevels,
		disasterCount,
		yearlyDisasterCounts,
		totalDeaths,
		totalInjured,
		totalMissing,
		totalDisplaced,
		totalAffectedDirect,
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
	} = useLoaderData<typeof loader>();
	const navigate = useNavigate();

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

	const handleApplyFilters = (filters: {
		hazardTypeId: string | null;
		hazardClusterId: string | null;
		specificHazardId: string | null;
		geographicLevelId: string | null;
		fromDate: string | null;
		toDate: string | null;
	}) => {
		setAppliedFilters(filters);

		// Build search params
		const searchParams = new URLSearchParams();
		if (filters.hazardTypeId)
			searchParams.set("hazardTypeId", filters.hazardTypeId);
		if (filters.hazardClusterId)
			searchParams.set("hazardClusterId", filters.hazardClusterId);
		if (filters.specificHazardId)
			searchParams.set("specificHazardId", filters.specificHazardId);
		if (filters.geographicLevelId)
			searchParams.set("geographicLevelId", filters.geographicLevelId);
		if (filters.fromDate) searchParams.set("fromDate", filters.fromDate);
		if (filters.toDate) searchParams.set("toDate", filters.toDate);

		// Use navigate to trigger loader re-run
		navigate(`?${searchParams.toString()}`, { replace: true });
	};

	const handleClearFilters = () => {
		setAppliedFilters({
			hazardTypeId: null,
			hazardClusterId: null,
			specificHazardId: null,
			geographicLevelId: null,
			fromDate: null,
			toDate: null,
		});
		navigate(window.location.pathname, { replace: true }); // Clear URL params
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
		appliedFilters.geographicLevelId && geographicLevels.length > 0
			? geographicLevels.find(
					(g) => g.id.toString() === appliedFilters.geographicLevelId
			  )?.name["en"] || "Unknown Level"
			: null;

	const totalPeopleAffected =
		Number(totalAffectedDirect) +
		Number(totalDisplaced) +
		Number(totalInjured) +
		Number(totalMissing);

	return (
		<MainContainer title="Hazards Analysis" headerExtra={<NavSettings />}>
			<div style={{ maxWidth: "100%", overflow: "hidden" }}>
				<div className="sectors-page">
					<HazardFilters
						hazardTypes={hazardTypes}
						hazardClusters={hazardClusters}
						specificHazards={specificHazards}
						geographicLevels={geographicLevels}
						onApplyFilters={handleApplyFilters}
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
							<HazardImpactMap
								hazardName={hazardName}
								geographicName={geographicName}
								localCurrency={currency}
								damagesGeoData={damagesGeoData}
								lossesGeoData={lossesGeoData}
								disasterEventGeoData={disasterEventGeoData}
								affectedPeopleGeoData={affectedPeopleGeoData}
								deathsGeoData={deathsGeoData}
							/>
							<ImpactByHazard
								hazardName={hazardName}
								geographicName={geographicName}
								fromDate={appliedFilters.fromDate}
								toDate={appliedFilters.toDate}
								disasterCount={disasterCount}
								yearlyEventsCount={yearlyDisasterCounts}
							/>

							<HumanAffects
								totalPeopleAffected={totalPeopleAffected}
								totalDeaths={totalDeaths}
								totalDisplaced={totalDisplaced}
								totalInjured={totalInjured}
								totalMissing={totalMissing}
								totalPeopleDirectlyAffected={totalAffectedDirect}
								noOfMen={totalMen}
								noOfWomen={totalWomen}
								noOfNonBinary={totalNonBinary}
								totalChildren={totalChildren}
								totalAdults={totalAdults}
								totalSeniors={totalSeniors}
								totalDisability={totalDisability}
								totalInternationalPoorPeople={totalInternationalPoorPeople}
								totalNationalPoorPeople={totalNationalPoorPeople}
							/>

							<DamagesAndLoses
								localCurrency={currency}
								totalDamages={totalDamages}
								totalLosses={totalLosses}
								totalDamagesByYear={totalDamagesByYear}
								totalLossesByYear={totalLossesByYear}
							/>
							<DisasterEventsList />
						</div>
					)}
				</div>
			</div>
		</MainContainer>
	);
}

export const meta: MetaFunction = ({ data }) => {
	return [
		{ title: "Hazards Analysis - DTS" },
		{ name: "description", content: "Hazards analysis page under DTS." },
	];
};
