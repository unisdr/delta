import { format } from "date-fns";

import { Link, useLoaderData } from "@remix-run/react";

import { authLoaderWithPerm } from "~/util/auth";

import { getAllAuditLogsWithUserByTableNameAndRecordIdsAndCountryAccountsIdOrderByTimestampDesc } from "~/db/queries/auditLogsTable";
import { getUserCountryAccountsByUserIdAndCountryAccountsId } from "~/db/queries/userCountryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "~/routes/settings/nav";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const { request, params } = loaderArgs;
	const id = params.id;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}
	const userCountryAccounts =
		await getUserCountryAccountsByUserIdAndCountryAccountsId(
			id,
			countryAccountsId
		);
	if (!userCountryAccounts) {
		throw new Response("Unauthorized Access", { status: 401 });
	}

	const user = userCountryAccounts.user;

	if (!user) {
		throw new Response("User not found or access denied", { status: 404 });
	}

	const auditLogs =
		await getAllAuditLogsWithUserByTableNameAndRecordIdsAndCountryAccountsIdOrderByTimestampDesc(
			"user",
			id,
			countryAccountsId
		);
	return Response.json({
		item: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: userCountryAccounts.user_country_accounts.role,
			organization: user.organization,
			emailVerified: user.emailVerified,
			authType: user.authType,
			modifiedAt: user.updatedAt,
		},
		auditLogs: auditLogs.map((auditLog) => ({
			action: auditLog.audit_logs.action,
			by: auditLog.user.firstName,
			organization: auditLog.user.organization,
			date: format(new Date(auditLog.audit_logs.timestamp), "yyyy-MM-dd"),
			time: format(new Date(auditLog.audit_logs.timestamp), "HH:mm:ss"),
		})),
	});
});

interface AuditLogsRef {
	action: string;
	by: string | null;
	organization: string | null;
	date: string;
	time: string;
}

export default function Data() {
	const { item, auditLogs } = useLoaderData<typeof loader>();

	return (
		<MainContainer title="Access management" headerExtra={<NavSettings />}>
			<>
				<Link to={`/settings/access-mgmnt/edit/${item.id}`}>Edit</Link>{" "}
				<Link to="/settings/access-mgmnt/">Back to Users</Link>
				<p>ID: {item.id}</p>
				<p>Email: {item.email}</p>
				<p>First Name: {item.firstName}</p>
				<p>Last Name: {item.lastName}</p>
				<p>Role: {item.role}</p>
				<p>Organisation: {item.organization}</p>
				<p>Email Verified: {String(item.emailVerified)}</p>
				<p>Auth Type: {item.authType}</p>
				<br />
				<h3>Audit Log History</h3>
				{/* Audit Log History Table */}
				<div className="table-container">
					<table className="dts-table" style={{ marginTop: "0px" }}>
						<thead>
							<tr>
								<th>Action Taken</th>
								<th>By</th>
								<th>Organisation</th>
								<th>Date</th>
								<th>Time</th>
							</tr>
						</thead>
						<tbody>
							{auditLogs.map((item: AuditLogsRef, index: number) => (
								<tr key={index}>
									<td>{item.action}</td>
									<td>{item.by}</td>
									<td>{item.organization}</td>
									<td>{item.date}</td>
									<td>{item.time}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</>
		</MainContainer>
	);
}
