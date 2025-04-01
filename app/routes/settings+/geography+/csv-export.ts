import {divisionTable} from "~/drizzle/schema";

import {dr} from "~/db.server";

import {asc} from "drizzle-orm";

import {csvExportLoader} from "~/backend.server/handlers/form/csv_export";

export const loader = csvExportLoader({
	table: divisionTable,
	fetchData: async () => {
		let rows = await dr.query.divisionTable.findMany({
			columns: {
				id: true,
				importId: true,
				parentId: true,
				name: true,
			},
			orderBy: [asc(divisionTable.id)],
		});
		let res: any[] = []
		for (let row of rows) {
			let r: any = {}
			for (let k in row) {
				if (k === "name") {
					continue
				}
				r[k] = (row as any)[k]
			}
			for (let k in row["name"]) {
				r["lang_" + k] = row["name"][k]
			}
			res.push(r)
		}
		return Promise.resolve(res)
	},
});
