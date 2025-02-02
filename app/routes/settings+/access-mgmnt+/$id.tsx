import { dr } from "~/db.server";
import { and, desc, eq } from "drizzle-orm";

import { auditLogsTable, userTable } from "~/drizzle/schema";

import { json } from "@remix-run/node";

import { useLoaderData, Link } from "@remix-run/react";

import { authLoaderWithPerm } from "~/util/auth";

import { NavSettings } from "~/routes/settings/nav";

import { MainContainer } from "~/frontend/container";
import { useState } from "react";
import { Pagination } from "~/frontend/pagination/view";

export const loader = authLoaderWithPerm("ViewUsers", async (loaderArgs) => {
  const { id } = loaderArgs.params;
  if (!id) {
    throw new Response("Missing item ID", { status: 400 });
  }

  const res = await dr
    .select()
    .from(userTable)
    .where(eq(userTable.id, Number(id)));

  if (!res || res.length === 0) {
    throw new Response("Item not found", { status: 404 });
  }

  const item = res[0];

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
        eq(auditLogsTable.recordId, String(id))
      )
    )
    .orderBy(desc(auditLogsTable.timestamp));

  return json({
    item: {
      id: item.id,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      role: item.role,
      organization: item.organization,
      emailVerified: item.emailVerified,
      authType: item.authType,
    },
    auditLogs: auditLogs.map((log) => ({
      action: log.action,
      by: log.by,
      organization: log.organization,
      date: log.timestamp.toDateString(),
      time: log.timestamp.toTimeString(),
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
  const [auditLogsList, setAuditLogsList] = useState<AuditLogsRef[]>(auditLogs);

  return (
    <MainContainer title="Access management" headerExtra={<NavSettings />}>
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
      <>
        <Link to={`/settings/access-mgmnt/edit/${item.id}`}>Edit</Link>{" "}
        <Link to="/settings/access-mgmnt/">Back to Users</Link>
        <p>ID: {item.id}</p>
        <p>Email: {item.email}</p>
        <p>First Name: {item.firstName}</p>
        <p>Last Name: {item.lastName}</p>
        <p>Role: {item.role}</p>
        <p>Organization: {item.organization}</p>
        <p>Email Verified: {String(item.emailVerified)}</p>
        <p>Auth Type: {item.authType}</p>
        <br />
        <h3>Audit Log History</h3>
        {/* Audit Log History Table */}
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
              {auditLogsList.map((item, index) => (
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
