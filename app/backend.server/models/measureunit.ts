import {EnumEntry} from "~/frontend/form"

export type typeEnumKey = "number"|"area"|"volume"|"duration"

export const typeEnumData: readonly EnumEntry[] = [
	{key: "number", label: "Number"},
	{key: "area", label: "Area"},
	{key: "volume", label: "Volume"},
	{key: "duration", label: "Duration"},
]

export function typeLabelForKey(key: typeEnumKey): string {
	let r = typeEnumData.find(d => d.key == key)
	if (!r){
		throw new Error("invalid key: " + key)
	}
	return r.label
}
