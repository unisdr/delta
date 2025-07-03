import { dr } from "~/db.server";
import { and, desc, eq } from "drizzle-orm";
import { format } from "date-fns";

import { auditLogsTable, userTable } from "~/drizzle/schema";

import { useLoaderData, Link } from "@remix-run/react";

import { authLoaderWithPerm } from "~/util/auth";
import { getTenantContext } from "~/util/tenant";
import { getUserFromSession } from "~/util/session";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	// Get user session and tenant context
	const userSession = await getUserFromSession(loaderArgs.request);
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const tenantContext = await getTenantContext(userSession);
	if (!tenantContext) {
		throw new Response("Unauthorized - No tenant context", { status: 401 });
	}

	// Get user with tenant check
	const [user] = await dr
		.select()
		.from(userTable)
		.where(
			and(
				eq(userTable.id, Number(id)),
				eq(userTable.countryAccountsId, tenantContext.countryAccountId)
			)
		);

	if (!user) {
		throw new Response("User not found or access denied", { status: 404 });
	}

	// Get audit logs with tenant check
	const auditLogs = await dr
		.select({
			action: auditLogsTable.action,
			by: userTable.firstName,
			organization: userTable.organization,
			timestamp: auditLogsTable.timestamp,
		})
		.from(auditLogsTable)
		.leftJoin(userTable, eq(auditLogsTable.userId, userTable.id))
		.where(
			and(
				eq(auditLogsTable.tableName, "user"),
				eq(auditLogsTable.recordId, String(id)),
				eq(userTable.countryAccountsId, tenantContext.countryAccountId)
			)
		)
		.orderBy(desc(auditLogsTable.timestamp));

	return Response.json({
		item: {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			role: user.role,
			organization: user.organization,
			emailVerified: user.emailVerified,
			authType: user.authType,
			modifiedAt: user.updatedAt,
		},
		auditLogs: auditLogs.map((log) => ({
			action: log.action,
			by: log.by,
			organization: log.organization,
			date: format(new Date(log.timestamp), "yyyy-MM-dd"),
			time: format(new Date(log.timestamp), "HH:mm:ss"),
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
