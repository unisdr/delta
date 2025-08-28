import { EnumEntry, ETLocalizedString, ColWidth } from "~/frontend/editabletable/defs"

export type HumanEffectsTable = "Deaths" | "Injured" | "Missing" | "Affected" | "Displaced"

export function HumanEffectsTableFromString(s: string): HumanEffectsTable {
	switch (s) {
		case "Deaths":
		case "Injured":
		case "Missing":
		case "Affected":
		case "Displaced":
			return s
	}
	throw new Error("Unknown human effects table: " + s)
}

export interface HumanEffectTableDef {
	id: HumanEffectsTable
	label: string
}

export const HumanEffectTablesDefs: HumanEffectTableDef[] = [
	{ id: "Deaths", label: "Deaths" },
	{ id: "Injured", label: "Injured" },
	{ id: "Missing", label: "Missing" },
	{ id: "Affected", label: "Affected" },
	{ id: "Displaced", label: "Displaced" },
]

export interface HumanEffectsCustomDef {
	uiName: ETLocalizedString | string
	uiColWidth: ColWidth
	dbName: string
	enum: EnumEntry[]
}

export interface HumanEffectsCustomConfig {
	version: number
	config: HumanEffectsCustomDef[]
}

export interface HumanEffectsHidden {
	cols: string[]
}

