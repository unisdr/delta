import React from "react";
import { DisasterSummary } from "~/backend.server/models/analytics/hazard-analysis";
import { formatNumberWithoutDecimals } from "~/util/currency";

interface DisasterEventsListProps {
	hazardName: string;
	geographicName: string | null;
	disasterSummaryTable: DisasterSummary[];
}

const DisasterEventsList: React.FC<DisasterEventsListProps> = ({
	hazardName,
	geographicName,
	disasterSummaryTable,
}) => {
	return (
		<>
			<section className="dts-page-section">
				<h2 className="dts-heading-2">
					Most recent {hazardName} events in{" "}
					{geographicName == null ? " across country" : geographicName}
				</h2>
				<div className="table-container">
					<table className="dts-table">
						<thead>
							<tr>
								<th>UUID</th>
								<th>Event name</th>
								<th>Start Date</th>
								<th>End Date</th>
								<th>Province Affected</th>
								<th>Damages</th>
								<th>Losses</th>
								<th>People Affected</th>
							</tr>
						</thead>
						<tbody>
							{disasterSummaryTable.map((disasterSummaryRecord) => {
								return (
									<tr key={disasterSummaryRecord.disasterId}>
										<td>{disasterSummaryRecord.disasterId}</td>
										<td>{disasterSummaryRecord.disasterName}</td>
										<td>{disasterSummaryRecord.startDate}</td>
										<td>{disasterSummaryRecord.endDate}</td>
										<td>{disasterSummaryRecord.provinceAffected}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalDamages)}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalLosses)}</td>
										<td>{formatNumberWithoutDecimals(disasterSummaryRecord.totalAffectedPeople)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</section>
		</>
	);
};

export default DisasterEventsList;
