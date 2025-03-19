import {
	useLoaderData,
	Link,
} from "@remix-run/react";

import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks} from "~/frontend/form"

import {
	route
} from "~/frontend/asset";
import {authLoaderPublicOrWithPerm} from "~/util/auth";
import {assetLoader} from "~/backend.server/handlers/asset";

import {Filters} from "~/frontend/components/list-page-filters";



export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
	return assetLoader({loaderArgs})
})

export default function Data() {
	let ld = useLoaderData<typeof loader>();
	const {filters} = ld;
	let {items, pagination} = ld.data;

	return DataScreen({
		plural: "Assets",
		resourceName: "Asset",
		baseRoute: route,
		columns: ["ID", "Name", "Sector(s)", "Actions"],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		beforeListElement: <Filters
			clearFiltersUrl={route}
			search={filters.search}
		/>,
		renderRow: (item, route) => (
			<tr key={item.id}>
				<td>
					<Link to={`${route}/${item.id}`}>{item.id.slice(0, 8)}</Link>
				</td>
				<td>{item.name}</td>
				<td>{item.sectorIds}</td>
				<td>
					<ActionLinks route={route} id={item.id} />
				</td>
			</tr>
		),
	});
}
