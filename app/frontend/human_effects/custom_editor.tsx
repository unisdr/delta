import { ETLocalizedString, EnumEntry, ColWidth } from "~/frontend/editabletable/base"
import { HumanEffectsCustomDef } from "~/frontend/human_effects/defs"
import { useState } from 'react'

export interface LocalizedStringEditorProps {
	label: string
	value: ETLocalizedString | string
	langs: string[]
	onChange: (value: ETLocalizedString) => void
}

export function LocalizedStringEditor(props: LocalizedStringEditorProps) {
	let [labels, setLabels] = useState<Record<string, string>>(() => {
		let obj: Record<string, string> = {}
		let allLangs = [...new Set([...props.langs, ...Object.keys(typeof props.value === 'string' ? {} : props.value)])]

		allLangs.forEach(lang => {
			if (typeof props.value === 'string') {
				obj[lang] = lang === 'en' ? props.value : ''
			} else {
				obj[lang] = props.value[lang] || ''
			}
		})

		return obj
	})

	function update() {
		props.onChange({ ...labels })
	}

	return (
		<div className="dts-localized-string-input">
			{props.langs.length == 1 ? (
				<div className="mg-grid mg-grid__col-3">
					<div className="dts-form-component">
						<label>
							{props.label}
							<input
								required={true}
								value={labels[props.langs[0]] || ''}
								onChange={e => setLabels(prev => ({ ...prev, [props.langs[0]]: e.target.value }))}
								onBlur={update}
							/>
						</label>
					</div>
				</div>
			) : (
				<>
					<label>{props.label}</label>
					<div className="mg-grid mg-grid__col-3">
						{props.langs.map(lang => (
							<div className="dts-form-component" key={lang}>
								<label>
									{lang}
									<input
										required={true}
										value={labels[lang] || ''}
										onChange={e => setLabels(prev => ({ ...prev, [lang]: e.target.value }))}
										onBlur={update}
									/>
								</label>
							</div>
						))}
					</div>
				</>
			)}
		</div>
	)
}

export interface EnumEntryRowProps {
	entry: EnumEntry
	langs: string[]
	onChange: (e: EnumEntry) => void
	onDelete: () => void
}

export function EnumEntryRow(props: EnumEntryRowProps) {
	let [key, setKey] = useState(props.entry.key)

	function update() {
		let updated = { ...props.entry, key }
		props.onChange(updated)
	}

	function remove() {
		props.onDelete()
	}

	return (
		<div className="dts-human-effects-custom-value-editor">
			<h4>
				Value
				<button onClick={remove} type="button" className="mg-button mg-button-outline dts-human-effects-custom-editor-delete" style={{ color: "red" }}>
					<svg aria-hidden="true" focusable="false" role="img">
						<use href="/assets/icons/trash-alt.svg#delete" />
					</svg>
				</button>
			</h4>

			<LocalizedStringEditor
				label="User Interface Name"
				value={props.entry.label}
				langs={props.langs}
				onChange={label => props.onChange({ ...props.entry, key, label })}
			/>

			<div className="mg-grid mg-grid__col-3">
				<div className="dts-form-component">
					<label>DB Value</label>
					<input required={true} value={key} onChange={e => setKey(e.target.value)} onBlur={update} />
				</div>
			</div>

		</div>
	)
}


export interface EnumListProps {
	values: EnumEntry[]
	onChange: (v: EnumEntry[]) => void
	langs: string[]
}

export function EnumList(props: EnumListProps) {
	let addValue = () => {
		let newVal: EnumEntry = {
			key: '',
			label: {}
		}
		let obj: Record<string, string> = {}
		props.langs.forEach(lang => obj[lang] = '')
		newVal.label = obj
		props.onChange([...props.values, newVal])
	}

	let removeValue = (index: number) => {
		props.onChange(props.values.filter((_, i) => i !== index))
	}

	let updateValue = (index: number, newVal: EnumEntry) => {
		props.onChange(props.values.map((v, i) => i === index ? newVal : v))
	}

	return (
		<div>
			{props.values.map((val, idx) => (
				<EnumEntryRow
					key={idx}
					entry={val}
					langs={props.langs}
					onChange={v => updateValue(idx, v)}
					onDelete={() => removeValue(idx)}
				/>
			))}
			<button type="button" onClick={addValue} className="mg-button mg-button-primary">Add Value</button>
		</div>
	)
}

export interface DefEditorProps {
	value: HumanEffectsCustomDef
	langs: string[]
	onChange: (value: HumanEffectsCustomDef) => void
	onRemove: () => void
}

export function DefEditor(props: DefEditorProps) {
	let handleUiNameChange = (label: ETLocalizedString) => {
		props.onChange({ ...props.value, uiName: label })
	}

	let handleEnumChange = (enumValues: EnumEntry[]) => {
		props.onChange({ ...props.value, enum: enumValues })
	}

	return (
		<div className="disaggregation">
			<h3>
				Disaggregation

				<button onClick={props.onRemove} type="button" className="mg-button mg-button-outline dts-human-effects-custom-editor-delete" style={{ color: "red" }}>
					<svg aria-hidden="true" focusable="false" role="img">
						<use href="/assets/icons/trash-alt.svg#delete" />
					</svg>
				</button>

			</h3>

			<LocalizedStringEditor
				label="User Interface Name"
				value={props.value.uiName}
				langs={props.langs}
				onChange={handleUiNameChange}
			/>

			<div className="mg-grid mg-grid__col-3">

				<div className="dts-form-component">
					<label>DB Name</label>
					<input
						required={true}
						type="text"
						value={props.value.dbName}
						onChange={e => props.onChange({ ...props.value, dbName: e.target.value })}
					/>
				</div>
				<div className="dts-form-component">
					<label>User Interface Column Width</label>
					<select
						required={true}
						value={props.value.uiColWidth || ""}
						onChange={e =>
							props.onChange({
								...props.value,
								uiColWidth: e.target.value ? (e.target.value as ColWidth) : "wide"
							})
						}
					>
						<option value="thin">Thin</option>
						<option value="medium">Medium</option>
						<option value="wide">Wide</option>
					</select>
				</div>
			</div>

			<h3>Values</h3>
			<EnumList
				values={props.value.enum}
				langs={props.langs}
				onChange={handleEnumChange}
			/>

		</div>
	)
}

export interface EditorProps {
	value: HumanEffectsCustomDef[]
	langs: string[]
	onChange: (value: HumanEffectsCustomDef[]) => void
}

export function Editor(props: EditorProps) {
	let addDef = () => {
		let newDef: HumanEffectsCustomDef = {
			uiName: { en: "" },
			dbName: "",
			enum: [
				{ key: "", label: { en: "" } }
			],
			uiColWidth: "wide"
		}
		props.onChange([...props.value, newDef])
	}

	let removeDef = (index: number) => {
		props.onChange(props.value.filter((_, i) => i !== index))
	}

	let updateDef = (index: number, def: HumanEffectsCustomDef) => {
		props.onChange(props.value.map((d, i) => i === index ? def : d))
	}

	return (
		<div className="dts-human-effects-custom-editor">

			{props.value.length === 0 ? (
				<p>No custom disaggregations configured. Click "Add Disaggregation" to create one.</p>
			) : (
				props.value.map((def, idx) => (
					<DefEditor
						key={idx}
						value={def}
						langs={props.langs}
						onChange={(d) => updateDef(idx, d)}
						onRemove={() => removeDef(idx)}
					/>
				))
			)}

			<button type="button" onClick={addDef} className="mg-button mg-button-primary">
				Add Disaggregation
			</button>
		</div>
	)
}
