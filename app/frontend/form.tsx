import {Form as ReactForm} from "@remix-run/react";
import {useLoaderData} from "@remix-run/react";
import {Link} from "@remix-run/react";

import {useActionData} from "@remix-run/react";
import {ReactElement, useRef} from "react";

import {formatDate} from "~/util/date";
import {MainContainer} from "./container";

import {capitalizeFirstLetter} from "~/util/string";

import React from 'react'

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
}

export function Field({children, label}: FieldProps) {
	return (
		<div className="form-field">
			<label>
				{label}
				<div>{children}</div>
			</label>
		</div>
	);
}

interface FieldErrorsProps<T> {
	errors?: Errors<T>;
	field: keyof T;
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

interface SubmitButtonProps {
	label: string;
	className?: string;
	disabled?: boolean;
	style?: React.CSSProperties; // Allow inline styles
}

export function SubmitButton({
	label,
	className = "mg-button mg-button-primary",
	style = {}, // Default to an empty style object
}: SubmitButtonProps) {
	return (
		<button
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
	errors?: Errors<T>;
	className?: string;
	ref?: React.Ref<HTMLFormElement>
}

export function Form<T>(props: FormProps<T>) {
	let errors = props.errors || {};
	errors.form = errors.form || [];

	return (
		<ReactForm ref={props.ref} method="post" className={props.className}>
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
	| "number"
	| "money"
	| "bool"
	| "other"
	| "enum"
	| "enum-flex"; // enum-flex - similar to enum but allows values that are not in the list, useful for when list of allowed values changed due to configuration changes

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

export function fieldsFromMap<T>(
	data: {[key: string]: string},
	fieldsDef: FormInputDef<T>[]
): T {
	return Object.fromEntries(
		fieldsDef.map((field) => {
			let k = field.key;
			let vs = data[field.key] || "";
			switch (field.type) {
				case "other":
					return [k, vs];
				case "number":
					return [k, Number(vs)];
				case "money":
					return [k, vs];
				case "text":
					return [k, vs];
				case "textarea":
					return [k, vs];
				case "date":
					if (!vs) {
						return [k, null];
					}
					return [k, new Date(vs)];
				case "bool":
					return [k, Boolean(vs)];
				case "enum":
					return [k, vs];
				case "enum-flex":
					return [k, vs];
			}
		})
	) as T;
}



export interface InputsProps<T> {
	def: FormInputDef<T>[];
	fields: Partial<T>;
	errors?: Errors<T>;
	override?: Record<string, ReactElement | undefined | null>;
	elementsAfter?: Record<string, ReactElement>
}

interface UIRowWithDefs<T> {
	uiRow?: UIRow
	defs: FormInputDef<T>[]
}

function splitDefsIntoDows<T>(defs: FormInputDef<T>[]) {
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
	className: string
}

function rowMeta<T>(uiRow: UIRowWithDefs<T>): rowMeta {
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
			header = <h3>{uiRow.uiRow.label}</h3>
		}
	}
	className = `mg-grid mg-grid__col-${cols}`
	return {className, header}
}

export function Inputs<T>(props: InputsProps<T>) {
	if (!props.def) {
		throw new Error("props.def not passed to form/Inputs")
	}

	let uiRows = splitDefsIntoDows(props.def)

	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow)
		let afterRow = null;
		return <React.Fragment key={rowIndex}>
			{meta.header}
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
					let errors: string[] | undefined;
					if (props.errors && props.errors.fields) {
						errors = errorsToStrings(props.errors.fields[def.key]);
					}
					return (
						<React.Fragment key={def.key}>
							<Input
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
	def: FormInputDefSpecific;
	name: string;
	value: any;
	errors: string[] | undefined;
	enumData?: readonly EnumEntry[];
}

export function Input(props: InputProps) {
	let wrapInput = function (child: React.ReactNode) {
		return (
			<WrapInput
				def={props.def}
				child={child}
				errors={props.errors}
			/>
		)
	}
	switch (props.def.type) {
		default:
			throw `Unknown type ${props.def.type}`;
		case "enum": {
			let vs = props.value as string;
			return wrapInput(
				<select
					required={props.def.required}
					name={props.name}
					defaultValue={vs}
				>
					{props.enumData!.map((v) => (
						<option key={v.key} value={v.key}>
							{v.label}
						</option>
					))}
				</select>
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
						<input type="checkbox" name={props.name} defaultChecked />
					</>
				)
			} else {
				return wrapInput(
					<>
						<input type="hidden" name={props.name} value="off" />
						<input type="checkbox" name={props.name} />
					</>
				)
			}
		case "textarea":
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
				/>
			);
		case "text":
		case "date":
		case "number":
		case "money":
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
				case "number":
					return wrapInput(
						<input
							required={props.def.required}
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							name={props.name}
							defaultValue={defaultValue}
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
}

export function FieldsView<T>(props: FieldsViewProps<T>) {
	if (!props.def) {
		throw new Error("props.def not passed to view")
	}

	let uiRows = splitDefsIntoDows(props.def)
	return uiRows.map((uiRow, rowIndex) => {
		let meta = rowMeta(uiRow)
		let afterRow = null;
		return <React.Fragment key={rowIndex}>
			{meta.header}
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
					return (
						<React.Fragment key={def.key}>
							<FieldView key={def.key} def={def} value={props.fields[def.key]} />
							{after}

						</React.Fragment>
					);
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
	if (props.value === null) {
		return <p>{props.def.label}: -</p>;
	}
	switch (props.def.type) {
		default:
			throw `Unknown type ${props.def.type}`;
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
		case "textarea":
		case "text":
		case "money":
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
			let date = props.value as Date;
			return (
				<p>
					{props.def.label}: {formatDate(date)}
				</p>
			);
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
	}
}

interface FormScreenProps<T> {
	// this is not used
	fieldsDef: FormInputDef<T>[];
	formComponent: any;
}

export function FormScreen<T>(props: FormScreenProps<T>) {
	const ld = useLoaderData<{item: T | null}>();

	const fieldsInitial = ld.item ? {...ld.item} : {};

	return formScreen({
		extraData: {},
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
	const ld = useLoaderData<{item: T, def: FormInputDef<X>[]}>();
	if (!ld.item) {
		throw "invalid";
	}
	if (!ld.def) {
		throw "def missing"
	}
	return <ViewComponent item={ld.item} def={ld.def} />;
}

interface ViewScreenPublicApprovedProps<T> {
	viewComponent: React.ComponentType<{item: T; isPublic: boolean; auditLogs?: any[]}>;
}

export function ViewScreenPublicApproved<T>(
	props: ViewScreenPublicApprovedProps<T>
) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{item: T; isPublic: boolean; auditLogs?: any[]}>();
	if (!ld.item) {
		throw "invalid";
	}
	if (ld.isPublic === undefined) {
		throw "loader does not expose isPublic";
	}
	return <ViewComponent isPublic={ld.isPublic} item={ld.item} auditLogs={ld.auditLogs} />;
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
							<Link
								to={`${props.path}/delete/${String(props.id)}`}
								className="mg-button mg-button-secondary"
							>
								Delete
							</Link>
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
	ref?: React.Ref<HTMLFormElement>;
}

export function FormView(props: FormViewProps) {
	if (!props.fieldsDef) {
		throw new Error("props.fieldsDef not passed to FormView")
	}

	const pluralCap = capitalizeFirstLetter(props.plural);
	return (
		<MainContainer title={pluralCap}>
			<>
				<p>
					<Link to={props.listUrl || props.path}>{pluralCap}</Link>
				</p>
				{props.edit && props.id && (
					<p>
						<Link to={props.viewUrl || `${props.path}/${String(props.id)}`}>
							View
						</Link>
					</p>
				)}
				<h2>
					{props.edit ? "Edit" : "Add"} {props.singular}
				</h2>
				{props.edit && props.id && <p>ID: {String(props.id)}</p>}
				{props.infoNodes}
				<Form ref={props.ref} errors={props.errors} className="dts-form">
					<Inputs
						def={props.fieldsDef}
						fields={props.fields}
						errors={props.errors}
						override={props.override}
						elementsAfter={props.elementsAfter}
					/>
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
}

export function ActionLinks({route, id, deleteMessage}: ActionLinksProps) {
	//const [showConfirmDelete, setShowConfirmDelete] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);

	const handleDeleteClick = (event: React.MouseEvent) => {
		event.preventDefault();
		//setShowConfirmDelete(true);
		if (dialogRef.current) {
			dialogRef.current.showModal(); // Show as a modal with backdrop
		}
	};

	const confirmDelele = async () => {
		try {
			await fetch(`${route}/delete/${id}`, {
				method: "GET", // Todo. change the method to DELETE and add action in the delete.$id.tsx file
			});
			window.location.reload();
		} catch (error) {
			console.error("Error deleting hazard event: ", error);
		}
		//setShowConfirmDelete(false);
		if (dialogRef.current) {
			dialogRef.current.close(); // Close modal
		}
	};
	return (
		<>
			<div style={{display: "flex", justifyContent: "space-evenly"}}>
				<Link to={`${route}/${id}`}>
					<button type="button" className="mg-button mg-button-outline">
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show"></use>
						</svg>
					</button>
				</Link>
				<Link to={`${route}/edit/${id}`}>
					<button type="button" className="mg-button mg-button-outline">
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/edit.svg#edit"></use>
						</svg>
					</button>
				</Link>
				<button
					type="button"
					className="mg-button mg-button-outline"
					style={{color: "red"}}
					onClick={handleDeleteClick}
				>
					<svg aria-hidden="true" focusable="false" role="img">
						<use href="/assets/icons/trash-alt.svg#delete"></use>
					</svg>
				</button>

				{/* Delete confirmation popup  */}
				<dialog ref={dialogRef} className="dts-dialog">
					<div className="dts-dialog__content">
						<div className="dts-form__intro">
							<h2>Confirm Deletion</h2>
						</div>
						<div className="dts-form__body">
							<p>
								{deleteMessage || "Are you sure you want to delete this item?"}
							</p>
						</div>
						<div className="dts-form__actions">
							<button
								onClick={confirmDelele}
								className="mg-button mg-button-primary"
							>
								Yes
							</button>
							<button
								onClick={() => {
									//setShowConfirmDelete(false);
									if (dialogRef.current) {
										dialogRef.current.close();
									}
								}}
								className="mg-button mg-button-outline"
							>
								No
							</button>
						</div>
					</div>
				</dialog>
			</div>
		</>
	);
}
