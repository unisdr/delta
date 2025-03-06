import { useQuery } from "react-query";

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

type Props = {
	filters: Filters;
};

// Define the expected return type from the API
type AffectedPeopleTotals = {
	missingTotal: number;
	injuredTotal: number;
	deathsTotal: number;
	directTotal: number;
	displacedTotal: number;
	affectedPeopleTotal?: number;
};

const DEFAULT_FILTERS: FilterValues = {
	hazardTypeId: null,
	hazardClusterId: null,
	specificHazardId: null,
	geographicLevelId: null,
	fromDate: null,
	toDate: null,
};

// Update fetchTotalAffectedPeople to return AffectedPeopleTotals
async function fetchTotalAffectedPeople(
	filters: Filters
): Promise<AffectedPeopleTotals> {
	const params = new URLSearchParams();
	if (filters) {
		Object.entries(filters).forEach(([key, value]) => {
			if (value) params.append(key, value);
		});
	}

	const response = await fetch(
		`/api/analytics/affected-people?${params.toString()}`,
		{
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch total affected people: ${response.statusText}`
		);
	}

	const data = await response.json();
	console.log("Affected people data:", data);

	if (!data.success) {
		throw new Error(data.error || "Unknown error");
	}

	// Assuming the API now returns an object with individual totals
	return data.data as AffectedPeopleTotals;
}

export default function HumanDirectEffects({
	filters = DEFAULT_FILTERS,
}: Props) {
	const {
		data: totals,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["totalAffectedPeople", filters],
		queryFn: () => fetchTotalAffectedPeople(filters),
		enabled: !!filters, // Only fetch if filters are not null
		retry: false,
	});

	// Destructure the individual totals from the data with defaults
	const {
		missingTotal = 0,
		injuredTotal = 0,
		deathsTotal = 0,
		directTotal = 0,
		displacedTotal = 0,
		affectedPeopleTotal = 0,
	} = totals || {};

	return (
    
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
						<span>
							{isLoading
								? "Loading..."
								: affectedPeopleTotal !== undefined
								? affectedPeopleTotal.toLocaleString()
								: "N/A"}
						</span>
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
						<span>
							{isLoading ? "Loading..." : deathsTotal.toLocaleString()}
						</span>
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
							<span>Total number of deaths</span>
							<div className="dts-tooltip__arrow"></div>
						</div>
					</h3>
					<div className="dts-indicator dts-indicator--target-box-b">
						<span>
							{isLoading ? "Loading..." : injuredTotal.toLocaleString()}
						</span>
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
						<span>
							{isLoading ? "Loading..." : missingTotal.toLocaleString()}
						</span>
					</div>
				</div>
			</div>

			<div className="mg-grid mg-grid__col-2" style={{ gap: "16px" }}>
				<div className="dts-data-box">
					<h3 className="dts-body-label">
						<span id="elementId01">
							People directly affected - Sendai target B
						</span>
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
						<span>
							{isLoading ? "Loading..." : directTotal.toLocaleString()}
						</span>
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
						<span>
							{isLoading ? "Loading..." : displacedTotal.toLocaleString()}
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}
