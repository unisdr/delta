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
async function fetchTotalAffectedPeople(filters: Filters): Promise<AffectedPeopleTotals> {
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
      <div className="mg-container">
        <h2 className="dts-heading-2">Human direct effects</h2>
        <div className="map-section">
          <span id="elementId01">Total people affected</span>
          <div className="mg-grid mg-grid__col-4" style={{ gap: "16px" }}>
            <div className="dts-indicator dts-indicator--target-box-c">
              <span>
                {isLoading
                  ? "Loading..."
                  : affectedPeopleTotal !== undefined
                  ? affectedPeopleTotal.toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>

          <div className="mg-grid mg-grid__col-3" style={{ gap: "16px" }}>
            <div>
              <span id="elementId01">Deaths</span>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{isLoading ? "Loading..." : deathsTotal.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <span id="elementId02">Injured</span>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{isLoading ? "Loading..." : injuredTotal.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <span id="elementId03">Missing</span>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{isLoading ? "Loading..." : missingTotal.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <span id="elementId04">People directly affected - Sendai target B</span>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{isLoading ? "Loading..." : directTotal.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <span id="elementId05">Displaced</span>
              <div className="dts-indicator dts-indicator--target-box-b">
                <span>{isLoading ? "Loading..." : displacedTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}