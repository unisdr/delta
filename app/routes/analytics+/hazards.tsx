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
	getDisasterEventCountByYear,
	getGenderTotalsByHazardFilters,
	getInternationalPovertyTotalByHazardFilters,
	getNationalPovertyTotalByHazardFilters,
	getTotalDamagesByHazardFilters,
	getTotalDamagesByYear,
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
import HazardImpactMap2 from "~/frontend/analytics/hazards/sections/HazardImpactMap2";
import { config } from "process";

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
		const geographicLevels = await getDivisionByLevel(1);

		const disasterCount = await getDisasterEventCount({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const yearlyDisasterCounts = await getDisasterEventCountByYear({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		console.log("yearly events = ", yearlyDisasterCounts);

		const { totalMen, totalWomen, totalNonBinary } =
			await getGenderTotalsByHazardFilters({
				hazardTypeId,
				hazardClusterId,
				specificHazardId,
				geographicLevelId,
				fromDate,
				toDate,
			});

		const {
			totalDeaths,
			totalInjured,
			totalMissing,
			totalDisplaced,
			totalAffectedDirect,
			totalAffectedIndirect,
		} = await getAffectedPeopleByHazardFilters({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const { totalChildren, totalAdults, totalSeniors } =
			await getAgeTotalsByHazardFilters({
				hazardTypeId,
				hazardClusterId,
				specificHazardId,
				geographicLevelId,
				fromDate,
				toDate,
			});

		const totalDisability = await getDisabilityTotalByHazardFilters({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const totalInternationalPoorPeople =
			await getInternationalPovertyTotalByHazardFilters({
				hazardTypeId,
				hazardClusterId,
				specificHazardId,
				geographicLevelId,
				fromDate,
				toDate,
			});

		const totalNationalPoorPeople =
			await getNationalPovertyTotalByHazardFilters({
				hazardTypeId,
				hazardClusterId,
				specificHazardId,
				geographicLevelId,
				fromDate,
				toDate,
			});

		const totalDamages = await getTotalDamagesByHazardFilters({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const totalLosses = await getTotalLossesByHazardFilters({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const totalDamagesByYear = await getTotalDamagesByYear({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		const totalLossesByYear = await getTotalLossesByYear({
			hazardTypeId,
			hazardClusterId,
			specificHazardId,
			geographicLevelId,
			fromDate,
			toDate,
		});

		return json({
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
			totalLossesByYear
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
		totalLossesByYear
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

	console.log("totalPeopleAffected", totalPeopleAffected);

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
							<HazardImpactMap2 />
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
