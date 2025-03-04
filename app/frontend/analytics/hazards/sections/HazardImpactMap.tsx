import { useEffect, useState } from "react";
import { useQuery } from "react-query";
import ImpactMapOl from "./Map/ImpactMapOl";

// Define the filter shape
type FilterValues = {
	hazardTypeId: string | null;
	hazardClusterId: string | null;
	specificHazardId: string | null;
	geographicLevelId: string | null;
	fromDate: string | null;
	toDate: string | null;
};

type Filters = FilterValues | null;

type ImpactMapProps = {
	filters: Filters;
};

const DEFAULT_FILTERS: FilterValues = {
	hazardTypeId: null,
	hazardClusterId: null,
	specificHazardId: null,
	geographicLevelId: null,
	fromDate: null,
	toDate: null,
};

interface Hazard {
	id: string | number;
	name: string;
}

interface HazardTypesResponse {
	hazardTypes: Hazard[];
}
interface HazardClustersResponse {
	clusters: Hazard[];
}
interface SpecificHazardsResponse {
	hazards: Hazard[];
}

export default function HazardImpactMap({
	filters = DEFAULT_FILTERS,
}: ImpactMapProps) {
	const [geoData, setGeoData] = useState<any>(null);
	const [selectedMetric, setSelectedMetric] = useState<
		| "totalDamage"
		| "totalLoss"
		| "numDisasterEvents"
		| "affectedPeople"
		| "numDeaths"
	>("totalDamage");
	const [selectedTab, setSelectedTab] = useState<string>("tab01");

	// Fetch hazard types data
	const { data: hazardTypesData } = useQuery<HazardTypesResponse>(
		["hazardTypes", filters?.hazardTypeId],
		async () => {
			const response = await fetch(`/api/analytics/hazard-types`);
			if (!response.ok) throw new Error("Failed to fetch hazard types");
			return response.json();
		}
	);

	// Fetch hazard clusters data
	const { data: hazardClustersData } = useQuery<HazardClustersResponse>(
		["hazardClusters", filters?.hazardClusterId],
		async () => {
			if (!filters?.hazardTypeId) return { clusters: [] };
			const response = await fetch(
				`/api/analytics/hazard-clusters?hazardTypeId=${filters.hazardTypeId}`
			);
			if (!response.ok) throw new Error("Failed to fetch hazard clusters");
			return response.json();
		},
		{
			enabled: !!filters?.hazardTypeId,
		}
	);

	// Fetch specific hazards data
	const { data: specificHazardsData } = useQuery<SpecificHazardsResponse>(
		["specificHazards", filters?.hazardClusterId],
		async () => {
			if (!filters?.hazardClusterId) return { hazards: [] };
			const response = await fetch(
				`/api/analytics/specific-hazards?clusterId=${filters.hazardClusterId}`
			);
			if (!response.ok) throw new Error("Failed to fetch specific hazards");
			return response.json();
		},
		{
			enabled: !!filters?.hazardClusterId,
		}
	);

	// Function to get section title based on selected sector
	const sectionTitle = () => {
		if (filters?.specificHazardId && specificHazardsData?.hazards) {
			const hazard = specificHazardsData.hazards.find(
				(h) => h.id.toString() === filters.specificHazardId
			);
			return `${hazard?.name} impacts across the country`;
		}
		if (filters?.hazardClusterId && hazardClustersData?.clusters) {
			const cluster = hazardClustersData.clusters.find(
				(c) => c.id.toString() === filters.hazardClusterId
			);
			return `${cluster?.name} impacts across the country`;
		}
		if (filters?.hazardTypeId && hazardTypesData?.hazardTypes) {
			const type = hazardTypesData.hazardTypes.find(
				(t) => t.id.toString() === filters.hazardTypeId
			);
			return `${type?.name} impacts across the country`;
		}

		return "All hazards impact across the country";
	};

	// Handle tab selection
	const handleSelectTab = (tabId: string, metric: string) => {
		setSelectedTab(tabId);
		// setSelectedMetric(tabId === "tab01" ? "totalDamage" : "totalLoss");
		setSelectedMetric(metric as any);
	};

	// Fetch geographic impact data
	useEffect(() => {
		const fetchData = async () => {
			try {
				const url = new URL(
					"/api/analytics/geographic-impacts",
					window.location.origin
				);
				const activeFilters = filters || DEFAULT_FILTERS;

				// Add all non-null filters to URL
				Object.entries(activeFilters).forEach(([key, value]) => {
					if (value !== null && value !== "") {
						url.searchParams.append(key, value);
					}
				});

				const response = await fetch(url.toString());
				if (!response.ok) throw new Error("Failed to fetch geographic data");
				const data = await response.json();
				setGeoData(data);
			} catch (error) {
				console.error("Error fetching geographic data:", error);
			}
		};

		fetchData();
	}, [filters]);

	return (
		<section className="dts-page-section">
			<div className="mg-container">
				<h2 className="dts-heading-2">Hazard Impact Map</h2>
				<div className="map-section">
					<h2 className="mg-u-sr-only" id="tablist01">
						Geographic Impact View
					</h2>
					<ul
						className="dts-tablist"
						role="tablist"
						aria-labelledby="tablist01"
					>
						{[
							{ id: "tab01", label: "Total Damages", metric: "totalDamage" },
							{ id: "tab02", label: "Total Losses", metric: "totalLoss" },
							{
								id: "tab03",
								label: "Number of Disaster Events",
								metric: "numDisasterEvents",
							},
							{
								id: "tab04",
								label: "Affected People",
								metric: "affectedPeople",
							},
							{ id: "tab05", label: "Number of Deaths", metric: "numDeaths" },
						].map(({ id, label, metric }) => (
							<li key={id} role="presentation">
								<button
									className="dts-tablist__button"
									type="button"
									role="tab"
									id={id}
									aria-controls={`tabpanel${id}`}
									aria-selected={selectedTab === id}
									tabIndex={selectedTab === id ? 0 : -1}
									onClick={() => handleSelectTab(id, metric)}
								>
									<span>{label}</span>
								</button>
							</li>
						))}
					</ul>

					{geoData ? (
						<ImpactMapOl
							geoData={geoData}
							selectedMetric={selectedMetric}
							filters={filters || DEFAULT_FILTERS}
						/>
					) : (
						<div className="map-loading">Loading map...</div>
					)}
				</div>
			</div>
		</section>
	);
}
