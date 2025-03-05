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

const DEFAULT_FILTERS: FilterValues = {
  hazardTypeId: null,
  hazardClusterId: null,
  specificHazardId: null,
  geographicLevelId: null,
  fromDate: null,
  toDate: null,
};

async function fetchTotalAffectedPeople(filters: Filters): Promise<number> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
  }

  const response = await fetch(`/api/analytics/affected-people?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch total affected people: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Affected people data:", data);

  if (!data.success) {
    throw new Error(data.error || "Unknown error");
  }

  return data.data.totalAffectedPeople as number;
}

export default function HumanDirectEffects({
  filters = DEFAULT_FILTERS,
}: Props) {
  const { data: totalAffected, isLoading, error } = useQuery({
    queryKey: ["totalAffectedPeople", filters],
    queryFn: () => fetchTotalAffectedPeople(filters),
    enabled: !!filters, // Only fetch if filters are not null
    retry: false,
  });

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
                  : totalAffected !== undefined
                  ? totalAffected.toLocaleString()
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}