import {
	authLoaderWithPerm
} from "~/util/auth";
import { stringifyCSV } from "~/util/csv";

interface csvExportLoaderArgs<T> {
	table: any
	fetchData: (request: Request) => Promise<T[]>
}

export function csvExportLoader<T>(args: csvExportLoaderArgs<T>) {
	return authLoaderWithPerm("ViewData", async (loaderArgs) => {
		const { request } = loaderArgs
		const url = new URL(request.url)

		const parts = url.pathname.split('/').filter(s => s !== '');
		const typeName = parts.length > 1 ? parts[parts.length - 2] : "";

		let data = await args.fetchData(request)
		if (!data.length) {
			return new Response(`No data for ${typeName}`, {
				headers: { "Content-Type": "text/plain" },
			})
		}
		let headers: string[] = []
		let rows: string[][] = []
		for (const k in data[0]) {
			if (k == "spatialFootprint" || k == "attachments") {
				continue
			}
			headers.push(k)
		}
		for (const item of data as Record<string, any>[]) {
			let row: string[] = []
			for (const h of headers) {

				row.push(valueToCsvString(item[h]))
			}
			rows.push(row)
		}
		let all = [
			headers,
			...rows
		]
		let csv = await stringifyCSV(all)

		return new Response(csv, {
			status: 200,
			headers: {
				"Content-Type": "text/csv",
				"Content-Disposition": `attachment; filename="${typeName}.csv"`
			}
		})
	})
}

function valueToCsvString(value: any): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value);
}
