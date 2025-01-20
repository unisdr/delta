export type DefType = "enum" | "number"

export interface DefBase {
	uiName: string
	uiColWidth?: number
	jsName: string
	dbName: string
	shared?: boolean
	type: DefType
}

export interface DefNumber extends DefBase {
	type: "number"
}

export interface DefEnum extends DefBase {
	type: "enum"
	data: EnumEntry[]
}

export type Def = DefNumber | DefEnum

export interface EnumEntry {
	key: string
	label: string
}
