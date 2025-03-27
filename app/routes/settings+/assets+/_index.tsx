import {
	useLoaderData,
	Link,
} from "@remix-run/react";

import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks, Field} from "~/frontend/form"

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
		columns: [
			"ID",
			"Name",
			"Sector(s)",
			"Is Custom",
			"Actions"
		],
		items: items,
		paginationData: pagination,
		csvExportLinks: true,
		beforeListElement: <Filters
			clearFiltersUrl={route}
			search={filters.search}
			formStartElement={
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-form-component">
						<Field label="Is Custom?">
							<select name="builtIn" defaultValue="">
								<option value="">All</option>
								<option value="false">Custom</option>
								<option value="true">Built-in</option>
							</select>
						</Field>
					</div>
				</div>
			}
		/>,
		renderRow: (item, route) => {
			/*
			 we don't have a page for sector nothing to link to
			let sectorIdList = item.sectorIds?.split(',').map(s => s.trim()) ?? []
			let sectorNameList = item.sectorNames?.split(',').map(s => s.trim()) ?? []
			let sectors = sectorIdList.map((id, i) => ({
				id,
				name: sectorNameList[i] ?? ''
			}))
		 */
			return (
				<tr key={item.id}>
					<td>
						<Link to={`${route}/${item.id}`}>{item.id.slice(0, 8)}</Link>
					</td>
					<td>{item.name}</td>
					<td>
						{item.sectorNames}
					</td>
					<td>{!item.isBuiltIn ? "Yes" : "No"}</td>
					<td>
						{item.isBuiltIn ? (
							<ActionLinks route={route} id={item.id} hideEditButton hideDeleteButton />
						) : (
							<ActionLinks route={route} id={item.id} />
						)}
					</td>
				</tr>
			)
		}
	});
}
