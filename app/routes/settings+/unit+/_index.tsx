import {
  useLoaderData,
  Link,
} from "@remix-run/react";

import {
  unitTable,
} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {createPaginatedLoader} from "~/backend.server/handlers/view";

import {desc} from "drizzle-orm";
import {DataScreen} from "~/frontend/data_screen";

import {ActionLinks} from "~/frontend/form"

import {
  route
} from "~/frontend/unit";

export let loader = createPaginatedLoader(
  unitTable,
  async (offsetLimit) => {
    return dr.query.unitTable.findMany({
      ...offsetLimit,
      columns: {id: true, name: true, type: true},
      orderBy: [desc(unitTable.name)],
    });
  },
  [desc(unitTable.name)]
);

export default function Data() {
  let ld = useLoaderData<typeof loader>();
  let {items, pagination} = ld.data;

  return DataScreen({
    plural: "Units",
    resourceName: "Unit",
    baseRoute: route,
    columns: ["ID", "Name", "Type", "Actions"],
    items: items,
    paginationData: pagination,
    csvExportLinks: true,
    renderRow: (item, route) => (
      <tr key={item.id}>
        <td>
          <Link to={`${route}/${item.id}`}>{item.id}</Link>
        </td>
        <td>{item.name}</td>
        <td>{item.type}</td>
        <td>
          <ActionLinks route={route} id={item.id} />
        </td>
      </tr>
    ),
  });
}
