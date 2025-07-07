
import {
	authLoaderWithPerm
} from "~/util/auth";
import { getTenantContext } from "~/util/tenant";

import { Link } from "react-router-dom";

import { divisionTable } from "~/drizzle/schema";

import {
	useLoaderData,
} from "@remix-run/react";

import { dr } from "~/db.server";

import {
	eq,
	and
} from "drizzle-orm";

import { Breadcrumb } from "~/frontend/division";

import { divisionBreadcrumb, DivisionBreadcrumbRow } from "~/backend.server/models/division";

import { useState, useEffect } from "react";

import type { SerializeFrom } from "@remix-run/server-runtime";

import DTSMap from "~/frontend/dtsmap/dtsmap";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

	const userSession = (loaderArgs as any).userSession;
	if (!userSession) {
		throw new Error("User session is required");
	}
	const tenantContext = await getTenantContext(userSession);

	const res = await dr.select().from(divisionTable).where(
		and(
			eq(divisionTable.id, Number(id)),
			eq(divisionTable.countryAccountsId, tenantContext.countryAccountId)
		)
	);

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];
	let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
	if (item.parentId) {
		breadcrumbs = await divisionBreadcrumb(["en"], item.parentId, tenantContext)
	}

	return {
		division: item,
		breadcrumbs: breadcrumbs,
	};

});

interface CommonProps {
	loaderData: SerializeFrom<typeof loader>
}

function Common({ loaderData }: CommonProps) {
	const { division, breadcrumbs } = loaderData
	return (
		<>
			<h1>Division Details</h1>
			<Link to={`/settings/geography/edit/${division.id}`}>Edit</Link>
			<p>ID: {division.id}</p>
			<Breadcrumb rows={breadcrumbs} linkLast={true} />
			<p>Parent ID: {division.parentId || "-"}</p>
			<h2>Names:</h2>
			<ul>
				{Object.entries(division.name).map(([lang, name]) => (
					<li key={lang}>
						<strong>{lang}:</strong> {name || "N/A"}
					</li>
				))}
			</ul>
		</>
	);
}

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();

	// only render in the browser, not server
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);

	return (
		<MainContainer
			title="Geographic levels"
			headerExtra={<NavSettings />}
		>
			<Common loaderData={loaderData} />
			{isClient && (
				loaderData.division.geojson ? (
					<DTSMap geoData={loaderData.division.geojson} />
				) : (
					<p>No geodata for this division</p>
				)
			)}
		</MainContainer>
	);
}
