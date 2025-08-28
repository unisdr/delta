export type DataFormat = "enum" | "number" | "date"
export type DataRole = "dimension" | "metric"
export type ColWidth = "thin"|"medium"|"wide"

export interface DefBase {
	uiName: ETLocalizedString | string
	uiColWidth?: ColWidth
	jsName: string
	dbName: string
	shared?: boolean
	format: DataFormat
	role: DataRole
	custom?: boolean
}

export interface DefNumber extends DefBase {
	format: "number"
}

export interface DefDate extends DefBase {
	format: "date"
}

export interface DefEnum extends DefBase {
	format: "enum"
	data: EnumEntry[]
}

export type Def = DefNumber | DefDate | DefEnum

export interface ETLocalizedString {
	[lang: string]: string
}

export function etLocalizedStringForLang(str: ETLocalizedString | string, lang: string): string {
	if (typeof str == 'string') {
		return str
	}
	return str[lang] ?? ''
}

export interface EnumEntry {
	key: string
	label: ETLocalizedString | string
}

export function defDataFormats(defs: Def[]): DataFormat[] {
	let r: DataFormat[] = []
	for (let d of defs) {
		r.push(d.format)
	}
	return r
}
