import {
  useLoaderData,
  Link,
} from "@remix-run/react";

import {
  assetTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {createPaginatedLoader} from "~/backend.server/handlers/view";

import {desc} from "drizzle-orm";
import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks} from "~/frontend/form"

import {
  route
} from "~/frontend/asset";

export const loader = createPaginatedLoader(
  assetTable,
  async (offsetLimit) => {
    return dr.query.assetTable.findMany({
      ...offsetLimit,
      columns: {
				id: true,
				name: true,
			},
      orderBy: [desc(assetTable.name)],
    });
  },
  [desc(assetTable.name)]
);

export default function Data() {
  let ld = useLoaderData<typeof loader>();
  let {items, pagination} = ld.data;

  return DataScreen({
    plural: "Assets",
    resourceName: "Asset",
    baseRoute: route,
    columns: ["ID", "Name", "Actions"],
    items: items,
    paginationData: pagination,
    csvExportLinks: true,
    renderRow: (item, route) => (
      <tr key={item.id}>
        <td>
          <Link to={`${route}/${item.id}`}>{item.id}</Link>
        </td>
        <td>{item.name}</td>
        <td>
          <ActionLinks route={route} id={item.id} />
        </td>
      </tr>
    ),
  });
}
