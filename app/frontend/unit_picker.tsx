import {useState} from "react";
import {
	Field
} from "~/frontend/form";

interface UnitPickerProps {
	labelPrefix?: string
	name: string
	defaultValue?: string
}

export const unitsEnum = [
	{key: "number_count", label: "Count"},
	{key: "area_m2", label: "Square Meters (m²)"},
	{key: "area_km2", label: "Square Kilometers (km²)"},
	{key: "area_ha", label: "Hectares"},
	{key: "area_mi2", label: "Square Miles (mi²)"},
	{key: "area_ac", label: "Acres"},
	{key: "area_ft2", label: "Square Feet (ft²)"},
	{key: "area_yd2", label: "Square Yards (yd²)"},
	{key: "volume_l", label: "Liters (L)"},
	{key: "volume_m3", label: "Cubic Meters (m³)"},
	{key: "volume_ft3", label: "Cubic Feet (ft³)"},
	{key: "volume_yd3", label: "Cubic Yards (yd³)"},
	{key: "volume_gal", label: "Gallons (gal)"},
	{key: "volume_bbl", label: "Barrels (bbl)"},
	{key: "duration_days", label: "Days"},
	{key: "duration_hours", label: "Hours"}
]

export function UnitPicker(props: UnitPickerProps) {
	let unitTypes = [
		{key: "number", label: "Number"},
		{key: "area", label: "Area"},
		{key: "volume", label: "Volume"},
		{key: "duration", label: "Duration"}
	]

	let unitsMap: Record<string, {key: string; label: string}[]> = {
		number: [
			{key: "number_count", label: "Count"}
		],
		area: [
			{key: "area_m2", label: "Square Meters (m²)"},
			{key: "area_km2", label: "Square Kilometers (km²)"},
			{key: "area_ha", label: "Hectares"},
			{key: "area_mi2", label: "Square Miles (mi²)"},
			{key: "area_ac", label: "Acres"},
			{key: "area_ft2", label: "Square Feet (ft²)"},
			{key: "area_yd2", label: "Square Yards (yd²)"},
		],
		volume: [
			{key: "volume_l", label: "Liters (L)"},
			{key: "volume_m3", label: "Cubic Meters (m³)"},
			{key: "volume_ft3", label: "Cubic Feet (ft³)"},
			{key: "volume_yd3", label: "Cubic Yards (yd³)"},
			{key: "volume_gal", label: "Gallons (gal)"},
			{key: "volume_bbl", label: "Barrels (bbl)"},
		],
		duration: [
			{key: "duration_days", label: "Days"},
			{key: "duration_hours", label: "Hours"}
		]
	}

	let findTypeByUnit = (unit: string) => {
		for (let type in unitsMap) {
			if (unitsMap[type].some((u) => u.key == unit)) return type
		}
		return "number"
	}

	let initialType = props.defaultValue ? findTypeByUnit(props.defaultValue) : "number"

	let [selectedType, setSelectedType] = useState(initialType)
	let [selectedUnit, setSelectedUnit] = useState(props.defaultValue || unitsMap[initialType][0].key)

	let handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		let newType = e.target.value
		setSelectedType(newType)
		setSelectedUnit(unitsMap[newType][0].key)
	}

	let handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedUnit(e.target.value)
	}

	let prefix = props.labelPrefix ? props.labelPrefix + " " : ""

	return (
		<>
			<div className="dts-form-component">
				<Field label={prefix + "Unit Type"}>
					<select name={props.name + "Type"} value={selectedType} onChange={handleTypeChange}>
						{unitTypes.map((ut) => (
							<option key={ut.key} value={ut.key}>
								{ut.label}
							</option>
						))}
					</select>
				</Field>
			</div>
			<div className="dts-form-component">
				<Field label={prefix + "Unit"}>
					<select name={props.name} value={selectedUnit} onChange={handleUnitChange}>
						{unitsMap[selectedType].map((u) => (
							<option key={u.key} value={u.key}>
								{u.label}
							</option>
						))}
					</select>
				</Field>
			</div>
		</>
	)
}

