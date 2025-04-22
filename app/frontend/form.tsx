import {Form as ReactForm} from "@remix-run/react";
import {useLoaderData} from "@remix-run/react";
import {Link} from "@remix-run/react";

import {useActionData} from "@remix-run/react";
import {ReactElement, useRef, useState, useEffect} from "react";

import {formatDate, formatDateTimeUTC, formatForDateTimeInput, getMonthName} from "~/util/date";
import {MainContainer} from "./container";

import {capitalizeFirstLetter} from "~/util/string";

import React from 'react'

import * as repeatablefields from "~/frontend/components/repeatablefields"

import {UserForFrontend} from "~/util/auth"
import {notifyError} from "./utils/notifications";

import {JsonView, allExpanded, defaultStyles} from 'react-json-view-lite';

import {DeleteButton} from "./components/delete-dialog";

export type FormResponse<T> =
	| {ok: true; data: T}
	| {ok: false; data: T; errors: Errors<T>};

export type FormResponse2<T> =
	| {ok: true; data: Partial<T>}
	| {ok: false; data: Partial<T>; errors: Errors<T>};

export interface FormError {
	def?: FormInputDefSpecific;
	code: string;
	message: string;
	data?: any;
}

export function errorToString(error: string | FormError): string {
	return typeof error === "string" ? error : error.message;
}

export function errorsToCodes(
	errors: (string | FormError)[] | undefined
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? "unknown_error" : error.code
	);
}

export function errorsToStrings(
	errors: (string | FormError)[] | undefined
): string[] {
	if (!errors) {
		return [];
	}
	return errors.map((error) =>
		typeof error === "string" ? error : error.message
	);
}

export interface Errors<T> {
	form?: (string | FormError)[];
	fields?: Partial<Record<keyof T, (string | FormError)[]>>;
}

export function initErrorField<T>(errors: Errors<T>, field: keyof T): string[] {
	errors.fields = errors.fields || {};
	errors.fields[field] = errors.fields[field] || [];
	return errors.fields[field] as string[];
}

export function firstError<T>(
	errors: Errors<T> | undefined
): FormError | string | null {
	if (!errors) {
		return null;
	}
	if (errors.form && errors.form.length > 0) {
		return errors.form[0];
	}
	if (errors.fields) {
		for (const field in errors.fields) {
			if (errors.fields[field]) {
				if (errors.fields[field]!.length > 0) {
					return errors.fields[field]![0];
				}
			}
		}
	}
	return null;
}

export function hasErrors<T>(errors: Errors<T> | undefined): boolean {
	if (!errors) {
		return false;
	}
	if (errors.form && errors.form.length > 0) {
		return true;
	}
	if (errors.fields) {
		for (const field in errors.fields) {
			if (errors.fields[field]) {
				if (errors.fields[field]!.length > 0) {
					return true;
				}
			}
		}
	}
	return false;
}

interface FormMessageProps {
	children: React.ReactNode;
}

export function FormMessage({children}: FormMessageProps) {
	return <div className="form-message">{children}</div>;
}

interface FieldProps {
	children: React.ReactNode;
	label: string;
	extraClassName?: string;
}

export function Field({children, label, extraClassName}: FieldProps) {
	if (extraClassName && extraClassName?.indexOf('dts-form-component') >= 0) {
		return (
			<div className={extraClassName}>
				<label>
					{label}
					{children}
				</label>
			</div>
		);	
	}
	else {
		return (
			<div className={extraClassName ? `form-field ${extraClassName}` : 'form-field'}>
				<label>
					{label}
					<div>{children}</div>
				</label>
			</div>
		);
	}
}

interface FieldErrorsProps<T> {
	errors?: Errors<T>;
	field: keyof T;
}

export function FieldErrorsStandard<T>({errors, field}: FieldErrorsProps<T>) {
	if (!errors || !errors.fields) {
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0) {
		return null;
	}

	if (!errors) {
		return null;
	}

	return FieldErrors3({errors: errorsToStrings(fieldErrors)});
}

export function FieldErrors<T>({errors, field}: FieldErrorsProps<T>) {
	if (!errors || !errors.fields) {
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0) {
		return null;
	}
	return FieldErrors2({errors: errorsToStrings(fieldErrors)});
}

interface FieldErrors2Props {
	errors: string[] | undefined;
}

export function FieldErrors2({errors}: FieldErrors2Props) {
	if (!errors) {
		return null;
	}

	return (
		<ul className="form-field-errors">
			{errors.map((error, index) => (
				<li style={{color: "red"}} key={index}>
					{error}
				</li>
			))}
		</ul>
	);
}

export function FieldErrors3({errors}: FieldErrors2Props) {
	if (!errors) {
		return null;
	}

	return (
		<>
			<div className="dts-form-component__hint">
				<div className="dts-form-component__hint--error" aria-live="assertive">
					{errors.map((error, index) => (
						<span key={index}>
							{index > 0 && ", "}
							{error}
						</span>
					))}
				</div>
			</div>
		</>
	);
}

interface SubmitButtonProps {
	label: string;
	id?: React.HTMLProps<HTMLButtonElement>["id"];
	className?: string;
	disabled?: boolean;
	style?: React.CSSProperties; // Allow inline styles
}

export function SubmitButton({
	label,
	id = undefined,
	className = "mg-button mg-button-primary",
	style = {}, // Default to an empty style object
}: SubmitButtonProps) {
	return (
		<button
			id={id}
			className={className}
			style={{
				...style, // Use passed styles
				flex: "none", // Prevent stretching within flex containers
			}}
		>
			{label}
		</button>
	);
}

interface FormProps<T> {
	children: React.ReactNode;
	id?: React.HTMLProps<HTMLFormElement>["id"];
	errors?: Errors<T>;
	className?: string;
	formRef?: React.Ref<HTMLFormElement>
}

export function Form<T>(props: FormProps<T>) {
	let errors = props.errors || {};
	errors.form = errors.form || [];

	return (
		<ReactForm id={props.id} ref={props.formRef} method="post" className={props.className}>
			{errors.form.length > 0 ? (
				<>
					<h2>Form Errors</h2>
					<ul className="form-errors">
						{errorsToStrings(errors.form).map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</>
			) : null}
			<div className="fields">{props.children}</div>
		</ReactForm>
	);
}

export interface UserFormProps<T> {
	fieldDef?: FormInputDef<T>[]
	edit: boolean;
	id: any; // only valid when edit is true
	fields: Partial<T>;
	errors?: Errors<T>;

	user?: UserForFrontend
}

export interface FormScreenOpts<T, D> {
	extraData: D;
	fieldsInitial: Partial<T>;
	form: React.FC<UserFormProps<T> & D>;
	edit: boolean;
	id?: any;
}

export function formScreen<T, D>(opts: FormScreenOpts<T, D>) {
	let fields = opts.fieldsInitial;
	let errors = {};
	const actionData = useActionData() as FormResponse<T>;
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			errors = actionData.errors;
		}
	}
	const mergedProps = {
		...opts.extraData,
		edit: opts.edit,
		fields: fields,
		errors: errors,
		id: opts.id,
	};
	return opts.form(mergedProps);
}

export type FormInputType =
	| "text"
	| "textarea"
	| "date"
	| "date_optional_precision" // yyyy,yyyy-mm,yyyy-mm-dd
	| "datetime"
	| "number"
	| "money"
	| "bool"
	| "other"
	| "approval_status"
	| "enum"
	| "enum-flex" // enum-flex - similar to enum but allows values that are not in the list, useful for when list of allowed values changed due to configuration changes
	| "json"
	| "uuid"

export interface EnumEntry {
	key: string;
	label: string;
}

export interface UIRow {
	label?: string
	// normally uses cols matching definiton, adjust if you add cols afterwards
	colOverride?: number
}

export interface FormInputDef<T> {
	key: keyof T & string;
	label: string;
	type: FormInputType;
	required?: boolean;
	tooltip?: string;
	description?: string;
	enumData?: readonly EnumEntry[];
	psqlType?: string;
	uiRow?: UIRow
	uiRowNew?: boolean
	repeatable?: {group: string, index: number}

}

export interface FormInputDefSpecific {
	key: string;
	label: string;
	type: FormInputType;
	required?: boolean;
	tooltip?: string;
	description?: string;
	enumData?: readonly EnumEntry[];
}

export interface InputsProps<T> {
	user?: UserForFrontend
	def: FormInputDef<T>[];
	fields: Partial<T>;
	errors?: Errors<T>;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>
}

interface UIRowWithDefs<T> {
	uiRow?: UIRow
	uiRowDefFromKey?: string
	defs: FormInputDef<T>[]
}

function splitDefsIntoRows<T>(defs: FormInputDef<T>[]) {
	let uiRows: UIRowWithDefs<T>[] = []
	{
		let uiRow: UIRowWithDefs<T> = {
			defs: []
		}
		let onePerRow = true
		for (let d of defs) {
			if (d.uiRow) {
				onePerRow = false
			} else if (d.uiRowNew) {
				onePerRow = true
			}
			if (d.uiRow || onePerRow) {
				if (uiRow.defs.length) {
					uiRows.push(uiRow)
				}
				if (d.uiRow) {
					uiRow = {
						uiRow: d.uiRow,
						uiRowDefFromKey: d.key,
						defs: []
					}
				} else {
					uiRow = {
						defs: []
					}
				}
			}
			uiRow.defs.push(d)
		}
		if (uiRow.defs.length) {
			uiRows.push(uiRow)
		}
	}
	return uiRows
}

interface rowMeta {
	header: any
	emptyRepeatables: boolean
	className: string
}

function rowMeta<T>(uiRow: UIRowWithDefs<T>, allDefs: FormInputDef<T>[], fields: Partial<T>): rowMeta {
	let cols = uiRow.defs.length
	let className = ""
	let header
	if (cols < 3) {
		cols = 3
	}
	if (uiRow.defs.length == 1) {
		let def = uiRow.defs[0]
		if (def.key == "spatialFootprint" || def.key == "attachments") {
			cols = 1
		}
		if (def.type == "textarea") {
			cols = 2
		}
	}
	if (uiRow.uiRow) {
		if (uiRow.uiRow.colOverride) {
			cols = uiRow.uiRow.colOverride
		}
		if (uiRow.uiRow.label) {
			header = <h3 className={"row-header-" + uiRow.uiRowDefFromKey}>{uiRow.uiRow.label}</h3>
		}
	}
	className = `mg-grid mg-grid__col-${cols}`

	let emptyRepeatables = true
	for (let def of uiRow.defs) {
		if (!def.repeatable) {
			emptyRepeatables = false
		} else {
			// check if all are empty in this group and index
			let empty = true
			for (let d of allDefs) {
				if (d.repeatable && d.repeatable.group == def.repeatable.group && d.repeatable.index == def.repeatable.index) {
					let v = fields[d.key]
					if (v !== null && v !== undefined && v !== "") {
						empty = false
					}
				}
			}
			if (!empty) {
				emptyRepeatables = false
			}
		}
	}

	return {className, emptyRepeatables, header}
}

export function Inputs<T>(props: InputsProps<T>) {
	if (!props.def) {
		throw new Error("props.def not passed to form/Inputs")
	}

	let defs = props.def
	//if (props.user?.role != "admin") {
	// only show this in view
	defs = defs.filter(d => d.key != "legacyData")
	//}

	let uiRows = splitDefsIntoRows(defs)


	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow, defs, props.fields)
		let afterRow = null;
		let addMore: any[] = []

		return <React.Fragment key={rowIndex}>
			{meta.header}
			<div className={meta.className}>
				{uiRow.defs.map((def, defIndex) => {
					if (def.repeatable) {
						let index = defs.findIndex((d) => d.key == def.key)
						let shouldAdd = false
						let g = def.repeatable.group
						let repIndex = def.repeatable.index
						if (index < defs.length - 1) {
							let next = defs[index + 1]
							if (next.repeatable && (next.repeatable.group != g || next.repeatable.index != repIndex)) {
								shouldAdd = true
							}
						}
						if (shouldAdd) {
							let cla = "repeatable-add-" + g + "-" + repIndex
							addMore.push(<button key={cla} className={cla}>Add</button>)
						}
					}
					let after = null;
					if (props.elementsAfter && props.elementsAfter[def.key]) {
						if (defIndex == uiRow.defs.length - 1) {
							afterRow = props.elementsAfter[def.key]
						} else {
							after = props.elementsAfter[def.key]
						}
					}
					if (props.override && props.override[def.key] !== undefined) {
						return (
							<React.Fragment key={def.key}>
								{props.override[def.key]}
								{after}
							</React.Fragment>
						)
					}
					let errors: string[] | undefined;
					if (props.errors && props.errors.fields) {
						errors = errorsToStrings(props.errors.fields[def.key]);
					}
					return (
						<React.Fragment key={def.key}>
							<Input
								user={props.user}
								key={def.key}
								def={def}
								name={def.key}
								value={props.fields[def.key]}
								errors={errors}
								enumData={def.enumData}
							/>
							{after}
						</React.Fragment>
					);
				})
				}
			</div>
			{addMore}
			{afterRow}
		</React.Fragment>
	})
}


export interface WrapInputProps {
	def: FormInputDefSpecific;
	child: React.ReactNode
	errors: string[] | undefined;
}

export function WrapInput(props: WrapInputProps) {
	if (!props.def) {
		throw new Error("no props.def")
	}
	let label = props.def.label;
	if (props.def.required) {
		label += " *";
	}
	return (
		<div title={props.def.tooltip} className="dts-form-component">
			<Field label={label}>
				{props.child}
				<FieldErrors2 errors={props.errors} />
				{props.def.description &&
					<p>{props.def.description}</p>
				}
			</Field>
		</div>
	)
}

export interface WrapInputBasicProps {
	label: string
	child: React.ReactNode
}

export function WrapInputBasic(props: WrapInputBasicProps) {
	return (
		<div className="dts-form-component">
			<Field label={props.label}>
				{props.child}
			</Field>
		</div>
	)
}

export interface InputProps {
	user?: UserForFrontend
	def: FormInputDefSpecific;
	name: string;
	value: any;
	errors: string[] | undefined;
	enumData?: readonly EnumEntry[];
	onChange?: (e: any) => void;
	disabled?: boolean
}

let notifiedDateFormatErrorOnce = false

export function Input(props: InputProps) {
	let wrapInput = function (child: React.ReactNode, label?: string) {
		let def = {...props.def}
		if (label) {
			def.label = label
		}
		return (
			<WrapInput
				def={def}
				child={child}
				errors={props.errors}
			/>
		)
	}
	switch (props.def.type) {
		default:
			throw new Error(`Unknown type ${props.def.type} for field ${props.def.key}`)
		case "approval_status": {
			if (!props.user) {
				throw new Error("userRole is required when using approvalStatus field")
			}
			if (props.user.role == "data-validator" || props.user.role == "admin") {

				let vs = props.value as string;
				return wrapInput(
					<>
						<select
							required={props.def.required}
							name={props.name}
							defaultValue={vs}
							onChange={props.onChange}
							disabled={props.disabled}
						>
							{props.enumData!.map((v) => (
								<option key={v.key} value={v.key}>
									{v.label}
								</option>
							))}
						</select>
						{props.disabled && <input type="hidden" name={props.name} value="" />}
					</>
				)
			}
			let vs = props.value as string;
			if (vs == "published") {
				return wrapInput(
					<>
						<input
							type="text"
							defaultValue={props.enumData!.find(v => v.key == vs)!.label}
							disabled={true}
						>
						</input>
						{props.disabled && <input type="hidden" name={props.name} value="" />}
					</>
				)
			}
			return wrapInput(
				<>
					<select
						required={props.def.required}
						name={props.name}
						defaultValue={vs}
						onChange={props.onChange}
						disabled={props.disabled}
					>
						{props.enumData!.filter(v => v.key != "published").map((v) => (
							<option key={v.key} value={v.key}>
								{v.label}
							</option>
						))}
					</select>
					{props.disabled && <input type="hidden" name={props.name} value="" />}
				</>
			)
		}
		case "enum": {
			let vs = props.value as string;
			return wrapInput(
				<>
					<select
						required={props.def.required}
						name={props.name}
						defaultValue={vs}
						onChange={props.onChange}
						disabled={props.disabled}
					>
						{props.enumData!.map((v) => (
							<option key={v.key} value={v.key}>
								{v.label}
							</option>
						))}
					</select>
					{props.disabled && <input type="hidden" name={props.name} value="" />}
				</>
			);
		}
		case "enum-flex": {
			let vs = props.value as string;
			let contains = props.enumData!.some((e) => e.key == vs);
			return wrapInput(
				<select
					required={props.def.required}
					name={props.name}
					defaultValue={vs}
					onChange={props.onChange}
				>
					{!contains && vs && (
						<option key={vs} value={vs}>
							{vs}
						</option>
					)}
					{props.enumData!.map((v) => (
						<option key={v.key} value={v.key}>
							{v.label}
						</option>
					))}
				</select>
			)
		}
		case "bool":
			let v = props.value as boolean;
			if (v) {
				return wrapInput(
					<>
						<input type="hidden" name={props.name} value="off" />
						<input type="checkbox" name={props.name} defaultChecked onChange={props.onChange} />
					</>
				)
			} else {
				return wrapInput(
					<>
						<input type="hidden" name={props.name} value="off" />
						<input type="checkbox" name={props.name} onChange={props.onChange} />
					</>
				)
			}
		case "textarea": {
			let defaultValueTextArea = "";
			if (props.value !== null && props.value !== undefined) {
				let v = props.value as string;
				defaultValueTextArea = v;
			}
			return wrapInput(
				<textarea
					required={props.def.required}
					name={props.name}
					defaultValue={defaultValueTextArea}
					onChange={props.onChange}
				/>
			);
		}
		case "json": {
			let defaultValueTextArea = "";
			if (props.value !== null && props.value !== undefined) {
				let v = JSON.stringify(props.value)
				defaultValueTextArea = v;
			}
			return wrapInput(
				<textarea
					required={props.def.required}
					name={props.name}
					defaultValue={defaultValueTextArea}
					onChange={props.onChange}
				/>
			);
		}
		case "date_optional_precision":
			{
				let vsInit = (props.value || "") as string
				let precisionInit: "yyyy-mm-dd" | "yyyy-mm" | "yyyy" = "yyyy-mm-dd"
				// yyyy-mm-dd
				let vsFullInit: {y: number, m: number, d: number} = {y: 0, m: 0, d: 0}
				if (vsInit) {
					if (vsInit.length == 10) {
						vsFullInit = {
							y: Number(vsInit.slice(0, 4)),
							m: Number(vsInit.slice(5, 7)),
							d: Number(vsInit.slice(8))
						}
					} else if (vsInit.length == 7) {
						vsFullInit = {y: Number(vsInit.slice(0, 4)), m: Number(vsInit.slice(5)), d: 1}
						precisionInit = "yyyy-mm"
					} else if (vsInit.length == 4) {
						vsFullInit = {y: Number(vsInit), m: 1, d: 1}
						precisionInit = "yyyy"
					} else {
						if (!notifiedDateFormatErrorOnce) {
							notifiedDateFormatErrorOnce = true
							notifyError(`Invalid date format in database. Removing value for field ${props.def.label}. Got date: ${vsInit}`)
						}
					}
				}
				let toDB = (vs: {y: number, m: number, d: number}, prec: "yyyy-mm-dd" | "yyyy-mm" | "yyyy"): string => {
					if (prec == "yyyy") {
						if (!vs.y) return ""
						return String(vs.y)
					} else if (prec == "yyyy-mm") {
						if (!vs.y || !vs.m) return ""
						return vs.y + "-" + String(vs.m).padStart(2, '0')
					}
					if (!vs.y || !vs.m || !vs.d) return ""
					return vs.y + "-" + String(vs.m).padStart(2, '0') + "-" + String(vs.d).padStart(2, '0')
				}
				let [vsDB, vsDBSet] = useState(vsInit)
				let [vsFull, vsFullSet] = useState(vsFullInit)
				let [precision, precisionSet] = useState(precisionInit)
				let vsDBSet2 = (v: string) => {
					console.log("setting date in db format", v)
					vsDBSet(v)
				}

				return <div>
					<WrapInputBasic
						label={props.def.label + " Format"}
						child={
							<select
								value={precision}
								onChange={(e: any) => {
									let p = e.target.value
									precisionSet(p)
									vsDBSet(toDB(vsFull, p))
									if (props.onChange) props.onChange(e)
								}}
							>
								<option value="yyyy-mm-dd">Full date</option>
								<option value="yyyy-mm">Year and month</option>
								<option value="yyyy">Year only</option>
							</select>
						}
					/>
					<input type="hidden" name={props.name} value={vsDB} />
					{precision == "yyyy-mm-dd" && (
						wrapInput(
							<input
								required={props.def.required}
								type="date"
								value={vsFull.y + "-" + String(vsFull.m).padStart(2, '0') + "-" + String(vsFull.d).padStart(2, '0')}
								onChange={(e: any) => {
									let vStr = e.target.value
									let v = {y: 0, m: 0, d: 0}
									if (vStr.length >= "yyyy-mm-dd".length) {
										let dateParts = vStr.split('-')
										v = {y: Number(dateParts[0]), m: Number(dateParts[1]), d: Number(dateParts[2])}
									}
									vsFullSet(v)
									vsDBSet2(toDB(v, precision))
									if (props.onChange) props.onChange(e)
								}}
							/>, props.def.label + " Date")
					)}
					{precision == "yyyy-mm" && (
						<>
							{wrapInput(
								<input
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value
										if (!/^\d{4}$/.test(vStr)) {
											notifyError("Invalid year format, must be.")
											return
										}
										let v = {y: Number(vStr), m: vsFull.m, d: 0}
										vsFullSet(v)
										vsDBSet2(toDB(v, precision))
										if (props.onChange) props.onChange(e)
									}}
								/>
								, props.def.label + " Year")}
							<WrapInputBasic
								label={props.def.label + " Month"}
								child={
									<select
										value={vsFull.m || ""}
										onChange={(e: any) => {
											let v = {y: vsFull.y, m: Number(e.target.value), d: 0}
											vsFullSet(v)
											vsDBSet2(toDB(v, precision))
											if (props.onChange) props.onChange(e)
										}}
									>
										<option key="" value="">Select</option>
										{Array.from({length: 12}, (_, i) => (
											<option key={i} value={i + 1}>{getMonthName(i + 1)}</option>
										))}
									</select>
								}
							/>
						</>
					)}
					{precision == "yyyy" && (
						<>
							{wrapInput(
								<input
									required={props.def.required}
									type="text"
									inputMode="numeric"
									defaultValue={vsFull.y || ""}
									onBlur={(e: any) => {
										let vStr = e.target.value
										if (!/^\d{4}$/.test(vStr)) {
											notifyError("Invalid year format, must be yyyy.")
											return
										}
										let v = {y: Number(vStr), m: vsFull.m, d: 0}
										vsFullSet(v)
										vsDBSet2(toDB(v, precision))
										if (props.onChange) props.onChange(e)
									}}
								/>
								, props.def.label + " Year")}
						</>
					)}
				</div >
			}
		case "text":
		case "date":
		case "datetime":
		case "number":
		case "money":
		case "uuid":
			let defaultValue = "";
			if (props.value !== null && props.value !== undefined) {
				switch (props.def.type) {
					case "text":
						{
							let v = props.value as string;
							defaultValue = v;
							break
						}
					case "date": {
						let v = props.value as Date;
						defaultValue = formatDate(v);
						break
					}
					case "datetime": {
						let v = props.value as Date;
						defaultValue = formatForDateTimeInput(v);
						break
					}
					case "number": {
						let v = props.value as number;
						defaultValue = String(v);
						break
					}
					case "money": {
						let v = props.value as string;
						defaultValue = v;
						break
					}
					default:
						throw new Error("unknown type: " + props.def.type)
				}
			}
			let inputType = "";
			switch (props.def.type) {
				case "text":
				case "date":
					inputType = props.def.type
					break
				case "datetime":
					inputType = "datetime-local"
					break
				case "number":
					return wrapInput(
						<input
							required={props.def.required}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							name={props.name}
							defaultValue={defaultValue}
							onChange={props.onChange}
						/>)
				case "money":
					return wrapInput(
						<input
							required={props.def.required}
							type="text"
							inputMode="decimal"
							pattern="[0-9]*\.?[0-9]*"
							name={props.name}
							defaultValue={defaultValue}
							onChange={props.onChange}
						/>)
			}
			if (inputType == "") {
				throw new Error("inputType is empty")
			}
			return wrapInput(
				<input
					required={props.def.required}
					type={inputType}
					name={props.name}
					defaultValue={defaultValue}
					onChange={props.onChange}
				/>)
	}
}

export interface ViewPropsBase<T> {
	def: FormInputDef<T>[]
}

export interface FieldsViewProps<T> {
	def: FormInputDef<T>[]
	fields: T
	elementsAfter?: Record<string, ReactElement>
	override?: Record<string, ReactElement | undefined | null>
	user?: UserForFrontend
}

export function FieldsView<T>(props: FieldsViewProps<T>) {
	if (!props.def) {
		throw new Error("props.def not passed to view")
	}
	let defs = props.def
	if (props.user?.role != "admin") {
		defs = defs.filter(d => d.key != "legacyData")
	}


	let uiRows = splitDefsIntoRows(defs)
	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow, defs, props.fields)
		let afterRow = null;
		return <React.Fragment key={rowIndex}>
			{!meta.emptyRepeatables && meta.header}
			<div className={meta.className}>
				{uiRow.defs.map((def, defIndex) => {

					let after = null;
					if (props.elementsAfter && props.elementsAfter[def.key]) {
						if (defIndex == uiRow.defs.length - 1) {

							afterRow = props.elementsAfter[def.key]
						} else {
							after = props.elementsAfter[def.key]
						}
					}
					if (props.override && props.override[def.key] !== undefined) {
						return (
							<React.Fragment key={def.key}>
								{props.override[def.key]}
								{after}
							</React.Fragment>
						)
					}
					if (def.repeatable) {
						// check if all are empty in this group and index
						let empty = true
						for (let d of defs) {
							if (d.repeatable && d.repeatable.group == def.repeatable.group && d.repeatable.index == def.repeatable.index) {
								let v = props.fields[d.key]
								if (v !== null && v !== undefined && v !== "") {
									empty = false
								}
							}
						}
						if (empty) {
							return (<React.Fragment key={def.key}>
								{after}
							</React.Fragment>)
						}
					}
					return (
						<React.Fragment key={def.key}>
							<FieldView key={def.key} def={def} value={props.fields[def.key]} />
							{after}
						</React.Fragment>
					)
				})
				}
			</div>
			{afterRow}
		</React.Fragment>
	})
}
export interface FieldViewProps {
	def: FormInputDefSpecific;
	value: any;
}

export function FieldView(props: FieldViewProps) {
	const [isClient, setIsClient] = useState(false)

	useEffect(() => {
		setIsClient(true);
	}, []);

	if (props.value === null || props.value === undefined) {
		return <p>{props.def.label}: -</p>;
	}
	switch (props.def.type) {
		default:
			throw new Error(`Unknown type ${props.def.type} for field ${props.def.key}`)
		case "bool":
			let b = props.value as boolean;
			return (
				<p>
					{props.def.label}: {String(b)}
				</p>
			);
		case "number":
			let n = props.value as number;
			return (
				<p>
					{props.def.label}: {String(n)}
				</p>
			);
		case "uuid":
		case "textarea":
		case "text":
		case "money":
		case "date_optional_precision":
			if (typeof props.value !== "string") {
				throw new Error(`invalid data for field ${props.def.key}, not a string, got: ${props.value}`)
			}
			let str = props.value as string;
			if (!str.trim()) {
				return <p>{props.def.label}: -</p>;
			}
			return (
				<p>
					{props.def.label}: {str}
				</p>
			);
		case "date":
			{
				let date = props.value as Date;
				return (
					<p>
						{props.def.label}: {formatDate(date)}
					</p>
				);
			}
		case "datetime":
			{
				let date = props.value as Date;
				return (
					<p>
						{props.def.label}: {formatDateTimeUTC(date)}
					</p>
				);
			}
		case "approval_status":
		case "enum":
		case "enum-flex": {
			let enumId = props.value;
			let enumItem = props.def.enumData!.find((item) => item.key === enumId);
			if (!enumItem) {
				return (
					<p>
						{props.def.label}: {enumId}
					</p>
				);
			}
			return (
				<p>
					{props.def.label}: {enumItem.label}
				</p>
			);
		}
		case "json": {
			if (!isClient) {
				let data = JSON.stringify(props.value)
				return (
					<>
						<p>{props.def.label}</p>
						<pre>{data}</pre>
					</>
				)
			}
			return (
				<>
					<p>{props.def.label}</p>
					<JsonView data={props.value} shouldExpandNode={allExpanded} style={defaultStyles} />
				</>
			)
		}
	}
}

interface FormScreenProps<T> {
	// this is not used
	fieldsDef: FormInputDef<T>[];
	formComponent: any;
	extraData?: any
}

export function FormScreen<T>(props: FormScreenProps<T>) {
	const ld = useLoaderData<{item: T | null}>();

	const fieldsInitial = ld.item ? {...ld.item} : {};

	return formScreen({
		extraData: props.extraData || {},
		fieldsInitial,
		form: props.formComponent,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

interface FormScreenPropsWithDef<T> {
	fieldsDef: FormInputDef<T>[];
	formComponent: any;
}

export function FormScreenWithDef<T>(props: FormScreenPropsWithDef<T>) {
	const ld = useLoaderData<{item: T | null, def: FormInputDef<T>[]}>();

	const fieldsInitial = ld.item ? {...ld.item} : {};

	return formScreen({
		extraData: {
			def: ld.def
		},
		fieldsInitial,
		form: props.formComponent,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

interface ViewScreenProps<T> {
	viewComponent: React.ComponentType<{item: T}>;
}

export function ViewScreen<T>(props: ViewScreenProps<T>) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{item: T}>();
	if (!ld.item) {
		throw "invalid";
	}
	return <ViewComponent item={ld.item} />;
}

interface ViewScreenPropsWithDef<T, X> {
	viewComponent: React.ComponentType<{item: T, def: FormInputDef<X>[]}>;
}

export function ViewScreenWithDef<T, X>(props: ViewScreenPropsWithDef<T, X>) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{
		item: T;
		def: FormInputDef<X>[];
		extraData?: any;
	}>();
	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing"
	}
	const extraData = ld?.extraData || {};
	return <ViewComponent item={ld.item} def={ld.def} {...(extraData ? {extraData} : {})} />;
}

interface ViewScreenPublicApprovedProps<T> {
	viewComponent: React.ComponentType<{item: T; isPublic: boolean; auditLogs?: any[], user: UserForFrontend}>;
}

export function ViewScreenPublicApproved<T>(
	props: ViewScreenPublicApprovedProps<T>
) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{item: T; isPublic: boolean; auditLogs?: any[], user: UserForFrontend}>();
	console.log("ld", ld)
	if (!ld.item) {
		throw "invalid";
	}
	if (ld.isPublic === undefined) {
		throw "loader does not expose isPublic";
	}
	return <ViewComponent isPublic={ld.isPublic} item={ld.item} auditLogs={ld.auditLogs} user={ld.user} />;
}

interface ViewComponentProps {
	isPublic?: boolean;
	path: string;
	listUrl?: string;
	id: any;
	plural: string;
	singular: string;
	extraActions?: React.ReactNode;
	extraInfo?: React.ReactNode;
	children?: React.ReactNode;
}

export function ViewComponent(props: ViewComponentProps) {
	return (
		<MainContainer title={props.plural}>
			<>
				<p>
					<Link to={props.listUrl || props.path}>{props.plural}</Link>
				</p>
				{!props.isPublic && (
					<>
						<div>
							<Link
								to={`${props.path}/edit/${String(props.id)}`}
								className="mg-button mg-button-secondary"
								style={{margin: "5px"}}
							>
								Edit
							</Link>
							<DeleteButton useIcon={true} action={`${props.path}/delete/${String(props.id)}`} />
						</div>
						{props.extraActions}
					</>
				)}
				<h2>{props.singular}</h2>
				<p>ID: {String(props.id)}</p>
				{props.extraInfo}
				{props.children}
			</>
		</MainContainer>
	);
}

interface FormViewProps {
	path: string;
	listUrl?: string;
	viewUrl?: string;
	edit: boolean;
	id?: any;
	plural: string;
	singular: string;
	infoNodes?: React.ReactNode;
	errors: any;
	fields: any;
	fieldsDef: any;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>
	formRef?: React.Ref<HTMLFormElement>;
	user?: UserForFrontend
}

export function FormView(props: FormViewProps) {
	if (!props.fieldsDef) {
		throw new Error("props.fieldsDef not passed to FormView")
	}

	const pluralCap = capitalizeFirstLetter(props.plural);

	let inputsRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		let opts = {inputsRef, defs: props.fieldsDef}
		repeatablefields.attach(opts)
		return () => {
			repeatablefields.detach(opts)
		}
	})

	return (
		<MainContainer title={pluralCap}>
			<>
				<p>
					<Link to={props.listUrl || props.path}>{pluralCap}</Link>
				</p>
				{props.edit && props.id && (
					<p>
						<Link to={props.viewUrl || `${props.path}/${props.id}`}>
							View
						</Link>
					</p>
				)}
				<h2>
					{props.edit ? "Edit" : "Add"} {props.singular}
				</h2>
				{props.edit && props.id && <p>ID: {String(props.id)}</p>}
				{props.infoNodes}
				<Form formRef={props.formRef} errors={props.errors} className="dts-form">
					<div ref={inputsRef}>
						<Inputs
							user={props.user}
							def={props.fieldsDef}
							fields={props.fields}
							errors={props.errors}
							override={props.override}
							elementsAfter={props.elementsAfter}
						/>
					</div>
					<div className="dts-form__actions">
						<SubmitButton
							label={
								props.edit
									? `Update ${props.singular}`
									: `Create ${props.singular}`
							}
						/>
					</div>
				</Form>
			</>
		</MainContainer>
	);
}

interface ActionLinksProps {
	route: string;
	id: string | number;
	deleteMessage?: string;
	hideViewButton?: boolean
	hideEditButton?: boolean
	hideDeleteButton?: boolean
}

export function ActionLinks(props: ActionLinksProps) {
	return (
		<div style={{display: 'flex', justifyContent: 'space-evenly'}}>
			{!props.hideViewButton && (
				<Link to={`${props.route}/${props.id}`}>
					<button type="button" className="mg-button mg-button-outline">
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</Link>
			)}
			{!props.hideEditButton && (
				<Link to={`${props.route}/edit/${props.id}`}>
					<button type="button" className="mg-button mg-button-outline">
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/edit.svg#edit" />
						</svg>
					</button>
				</Link>
			)}
			{!props.hideDeleteButton && (
				<DeleteButton
					key={props.id}
					action={`${props.route}/delete/${props.id}`}
					useIcon
					confirmMessage={props.deleteMessage}
				/>
			)}
		</div>
	)
}



/**
 * Disables the submit button of a form until all required fields are valid.
 *
 * @param formId - The ID of the form element to validate.
 * @param submitButtonId - The ID of the submit button element to disable/enable.
 */
export const validateFormAndToggleSubmitButton = (formId: string, submitButtonId: string): void => {
    // Select the form element using the provided ID
    const formElement = document.querySelector<HTMLFormElement>(`#${formId}`);
    
    // Select the submit button element using the provided ID
    const submitButton = document.querySelector<HTMLButtonElement>(`#${submitButtonId}`);

	// Check if the form and submit button elements are found
    if (formElement && submitButton) {
        // Select all input fields with the 'required' attribute within the form
        const requiredFields = formElement.querySelectorAll<HTMLInputElement>("input[required]");
        
        if (requiredFields.length > 0) {
            // Iterate over each required field and add an event listener to validate inputs
            requiredFields.forEach(field => {
                field.addEventListener("input", () => {
                    // Check if all required fields are valid
                    const allFieldsValid = Array.from(requiredFields).every(
                        requiredField => requiredField.validity.valid
                    );

                    // Enable the submit button if all fields are valid, otherwise disable it
                    submitButton.disabled = !allFieldsValid;
                });
            });
        }
    } else {
        console.error("Form or submit button not found. Ensure the provided IDs are correct.");
    }
};