import {Def} from "~/frontend/editabletable/defs"

export type HumanEffectsTable = "Deaths" | "Injured" | "Missing" | "Affected" | "Displaced" | "DisplacementStocks"

export interface HumanEffectTableDef {
	id: HumanEffectsTable
	label: string
}

export const HumanEffectTablesDefs: HumanEffectTableDef[] = [
	{id: "Deaths", label: "Deaths"},
	{id: "Injured", label: "Injured"},
	{id: "Missing", label: "Missing"},
	{id: "Affected", label: "Affected"},
	{id: "Displaced", label: "Displaced"},
	{id: "DisplacementStocks", label: "Displacement Stocks"},
]

function sharedDefs(): Def[] {
	let shared: Def[] = [
		{
			uiName: "Sex",
			jsName: "sex",
			dbName: "sex",
			uiColWidth: 50,
			type: "enum",
			data: [
				{key: "m", label: "M"},
				{key: "f", label: "F"}]
		},
		{
			uiName: "Age",
			jsName: "age",
			dbName: "age",
			uiColWidth: 80,
			type: "enum",
			data: [
				{key: "0-20", label: "0-20"},
				{key: "21-40", label: "21-40"},
				{key: "41-60", label: "41-60"},
				{key: "60-81", label: "60-81"},
				{key: ">80", label: ">80"},
			]
		},
		{
			uiName: "Disability",
			jsName: "disability",
			dbName: "disability",
			uiColWidth: 120,
			type: "enum",
			data: [
				{key: "dis_none", label: "No disabilities"},
				{key: "dis_group1", label: "Dis. group 1"},
				{key: "dis_group2", label: "Dis. group 2"},
			]
		},
		{
			uiName: "Global poverty line",
			jsName: "globalPovertyLine",
			dbName: "global_poverty_line",
			uiColWidth: 60,
			type: "enum",
			data: [
				{key: "below", label: "Below"},
				{key: "above", label: "Above"},
			]
		},
		{
			uiName: "National poverty line",
			jsName: "nationalPovertyLine",
			dbName: "national_poverty_line",
			uiColWidth: 60,
			type: "enum",
			data: [
				{key: "below", label: "Below"},
				{key: "above", label: "Above"},
			]
		},
	]
	for (const item of shared) {
		item.shared = true
	}
	return shared
}

export function defsForTable(tbl: HumanEffectsTable): Def[] {
	let res = sharedDefs()
	switch (tbl) {
		case "Deaths":
			res.push({
				uiName: "Deaths",
				jsName: "deaths",
				dbName: "deaths",
				type: "number",
			})
			break
		case "Injured":
			res.push({
				uiName: "Injured",
				jsName: "injured",
				dbName: "injured",
				type: "number",
			})
			break
		case "Missing":
			res.push({
				uiName: "Missing",
				jsName: "missing",
				dbName: "missing",
				type: "number",
			})
			break
		case "Affected":
			res.push(
				{
					uiName: "Directly Affected",
					jsName: "direct",
					dbName: "direct",
					type: "number",
				},
				{
					uiName: "Indirectly Affected",
					jsName: "indirect",
					dbName: "indirect",
					type: "number",
				}
			)
			break
		case "Displaced":
			res.push(
				{
					uiName: "Short Term",
					jsName: "shortTerm",
					dbName: "short_term",
					type: "number",
				},
				{
					uiName: "Medium Short Term",
					jsName: "mediumShort",
					dbName: "medium_short",
					type: "number",
				},
				{
					uiName: "Medium Long Term",
					jsName: "mediumLong",
					dbName: "medium_long",
					type: "number",
				},
				{
					uiName: "Long Term",
					jsName: "longTerm",
					dbName: "long_term",
					type: "number",
				},
				{
					uiName: "Permanent",
					jsName: "permanent",
					dbName: "permanent",
					type: "number",
				}
			)
			break
		case "DisplacementStocks":
			res.push(
				{
					uiName: "Preemptive",
					jsName: "preemptive",
					dbName: "preemptive",
					type: "number",
				},
				{
					uiName: "Reactive",
					jsName: "reactive",
					dbName: "reactive",
					type: "number",
				}
			)
			break
		default:
			throw new Error(`Unknown table: ${tbl}`)
	}
	return res
}

