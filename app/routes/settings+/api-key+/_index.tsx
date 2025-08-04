import { Link, useLoaderData } from "@remix-run/react";

import { apiKeyTable } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { createPaginatedLoader } from "~/backend.server/handlers/view";

import { desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { route } from "~/frontend/api_key";
import { formatDate } from "~/util/date";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createPaginatedLoader(async (offsetLimit) => {
		return dr.query.apiKeyTable.findMany({
			...offsetLimit,
			columns: {
				id: true,
				createdAt: true,
				name: true,
			},
			where: eq(apiKeyTable.countryAccountsId, countryAccountsId),
			orderBy: [desc(apiKeyTable.name)],
			with: {
				managedByUser: true,
			},
		});
	}, await dr.$count(apiKeyTable, eq(apiKeyTable.countryAccountsId, countryAccountsId)))(
		args
	);
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, pagination } = ld.data;
	return DataScreen({
		plural: "API keys",
		resourceName: "API key",
		baseRoute: route,
		columns: ["ID", "Created at", "Managed by", "Key Name", "Actions"],
		items: items,
		paginationData: pagination,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id}</Link>
				</td>
				<td>{formatDate(item.createdAt)}</td>
				<td>{item.managedByUser.email}</td>
				<td>{item.name}</td>
				<td>
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
