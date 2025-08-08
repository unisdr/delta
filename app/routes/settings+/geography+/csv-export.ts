import { divisionTable } from "~/drizzle/schema";
import { dr } from "~/db.server";
import { asc, eq } from "drizzle-orm";
import { authLoaderWithPerm } from "~/util/auth";
import { stringifyCSV } from "~/util/csv";
import { getCountryAccountsIdFromSession } from "~/util/session";

// Create a custom loader that enforces tenant isolation
export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const { request } = loaderArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	// Get divisions with tenant filtering
	let rows = await dr.query.divisionTable.findMany({
		columns: {
			id: true,
			importId: true,
			parentId: true,
			name: true,
		},
		where: eq(divisionTable.countryAccountsId, countryAccountsId),
		orderBy: [asc(divisionTable.id)],
	});

	// Format data for CSV export
	const url = new URL(request.url);
	const parts = url.pathname.split('/').filter(s => s !== '');
	const typeName = parts.length > 1 ? parts[parts.length - 2] : "";

	if (!rows.length) {
		return new Response(`No data for ${typeName}`, {
			headers: { "Content-Type": "text/plain" },
		});
	}

	// Transform data for CSV format
	let res: any[] = [];
	for (let row of rows) {
		let r: any = {};
		for (let k in row) {
			if (k === "name") {
				continue;
			}
			r[k] = (row as any)[k];
		}
		for (let k in row["name"]) {
			r["lang_" + k] = row["name"][k];
		}
		res.push(r);
	}

	// Generate CSV
	let headers: string[] = [];
	let csvRows: string[][] = [];

	for (const k in res[0]) {
		if (k == "spatialFootprint" || k == "attachments") {
			continue;
		}
		headers.push(k);
	}

	for (const item of res) {
		let csvRow: string[] = [];
		for (const h of headers) {
			csvRow.push(valueToCsvString(item[h]));
		}
		csvRows.push(csvRow);
	}

	let all = [
		headers,
		...csvRows
	];

	let csv = await stringifyCSV(all);

	return new Response(csv, {
		status: 200,
		headers: {
			"Content-Type": "text/csv",
			"Content-Disposition": `attachment; filename="${typeName}.csv"`
		}
	});
});

// Helper function to convert values to CSV string format
function valueToCsvString(value: any): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}
