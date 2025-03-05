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

export default function HumanDirectEffects({
	filters = DEFAULT_FILTERS,
}: Props) {
	return (
		<section className="dts-page-section">
			<div className="mg-container">
				<h2 className="dts-heading-2">Human direct effects</h2>
				<div className="map-section">
					<span id="elementId01">Total people affected</span>
					<div className="mg-grid mg-grid__col-4" style={{ gap: "16px;" }}>
						<div className="dts-indicator dts-indicator--target-box-c">
							<span>10,100</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
