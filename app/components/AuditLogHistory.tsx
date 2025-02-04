type AuditLog = {
	id: string;
	action: string;
	by: string | null;
	organization: string | null;
	timestamp: Date;
};

type AuditLogHistoryProps = {
	auditLogs: AuditLog[];
};

export default function AuditLogHistory({ auditLogs }: AuditLogHistoryProps) {
	return (
		<>
			<style>{`
		.table-styled {
		  width: 100%;
		  border-collapse: collapse;
		  margin-top: 20px;
		  font-size: 14px;
		  overflow-x: auto;
		}

		.table-styled th,
		.table-styled td {
		  padding: 12px 15px;
		  border: 1px solid #ddd;
		  text-align: left;
		}

		.table-styled th {
		  background-color: #f4f4f4;
		  font-weight: bold;
		  position: relative;
		}
		`}</style>
			<div className="table-container">
				<table className="table-styled" style={{ marginTop: "0px" }}>
					<thead>
						<tr>
							<th>Action Taken</th>
							<th>By</th>
							<th>Organization</th>
							<th>Date</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{auditLogs.map((auditLogs) => {
							return (
								<tr key={auditLogs.id}>
									<td>{auditLogs.action}</td>
									<td>{auditLogs.by}</td>
									<td>{auditLogs.organization}</td>
									<td>{auditLogs.timestamp.toDateString()}</td>
									<td>{auditLogs.timestamp.toTimeString()}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}
