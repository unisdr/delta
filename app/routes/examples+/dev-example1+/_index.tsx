import { Link, useLoaderData } from "@remix-run/react";

import { devExample1Table } from "~/drizzle/schema";

import { dr } from "~/db.server";

import { createPaginatedLoader } from "~/backend.server/handlers/view";

import { desc, eq } from "drizzle-orm";
import { DataScreen } from "~/frontend/data_screen";

import { ActionLinks } from "~/frontend/form";

import { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { route } from "~/frontend/dev_example1";
import { getCountryAccountsIdFromSession, getCountrySettingsFromSession } from "~/util/session";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	let instanceName = "Disaster Tracking System";

	if (countryAccountsId) {
		const settings = await getCountrySettingsFromSession(request);
		instanceName = settings.websiteName;
	}

	// Get paginated data
	const paginatedLoader = createPaginatedLoader(
		async (offsetLimit) => {
			return dr.query.devExample1Table.findMany({
				...offsetLimit,
				columns: { id: true, field1: true },
				where: eq(devExample1Table.countryAccountsId, countryAccountsId),
				orderBy: [desc(devExample1Table.field1)],
			});
		},
		await dr.$count(
			devExample1Table,
			eq(devExample1Table.countryAccountsId, countryAccountsId)
		)
	);

	// Call the loader
	const paginatedData = await paginatedLoader(args);

	// Return both
	return {
		instanceName,
		...paginatedData,
	};
};

export default function Data() {
	const ld = useLoaderData<typeof loader>();
	const { items, pagination } = ld.data;

	return DataScreen({
		plural: "Dev examples",
		resourceName: "Dev example 1",
		baseRoute: route,
		columns: ["ID", "Field 1", "Actions"],
		listName: "dev-examples",
		instanceName: ld.instanceName,
		totalItems: pagination.totalItems,
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id}</Link>
				</td>
				<td>{item.field1}</td>
				<td>
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
