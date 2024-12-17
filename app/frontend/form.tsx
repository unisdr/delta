import {Form as ReactForm} from "@remix-run/react";
import {useLoaderData} from "@remix-run/react";
import {Link} from "@remix-run/react";

import {
	useActionData,
} from "@remix-run/react";
import {ReactElement} from "react";

import {formatDate} from "~/util/date"
import {MainContainer} from "./container";

export type FormResponse<T> =
	| {ok: true; data: T}
	| {ok: false; data: T, errors: Errors<T>};

export type FormResponse2<T> =
	| {ok: true; data: Partial<T>}
	| {ok: false; data: Partial<T>, errors: Errors<T>};

export interface Errors<T> {
	form?: string[]
	fields?: Partial<Record<keyof T, string[]>>
}

export function initErrorField<T>(errors: Errors<T>, field: keyof T): string[] {
	errors.fields = errors.fields || {};
	errors.fields[field] = errors.fields[field] || [];
	return errors.fields[field] as string[];
}

export function hasErrors<T>(errors: Errors<T>): boolean {
	if (errors.form && errors.form.length > 0) {
		return true;
	}
	if (errors.fields) {
		for (const field in errors.fields) {
			if (errors.fields[field] && errors.fields[field]?.length > 0) {
				return true;
			}
		}
	}
	return false;
}

interface FormMessageProps {
	children: React.ReactNode;
}

export function FormMessage({children}: FormMessageProps) {
	return (
		<div className="form-message">
			{children}
		</div>
	)
}

interface FieldProps {
	children: React.ReactNode;
	label: string
}

export function Field({children, label}: FieldProps) {
	return (
		<div className="form-field">
			<label>{label}
				<div>
					{children}
				</div>
			</label>
		</div>
	)
}

interface FieldErrorsProps<T> {
	errors?: Errors<T>
	field: keyof T
}

export function FieldErrors<T>({errors, field}: FieldErrorsProps<T>) {
	if (!errors || !errors.fields) {
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0) {
		return null;
	}
	return FieldErrors2({errors: fieldErrors})
}

interface FieldErrors2Props {
	errors: string[] | undefined
}

export function FieldErrors2({errors}: FieldErrors2Props) {
	if (!errors) {
		return null;
	}

	return (
		<ul className="form-field-errors">
			{errors.map((error, index) => (
				<li key={index}>{error}</li>
			))}
		</ul>
	);
}

interface SubmitButtonProps {
	label: string;
	className?: string;
}

export function SubmitButton({label, className}: SubmitButtonProps) {
	if (className?.length === 0) {
		return (
			<div className="form-buttons">
				<button>{label}</button>
			</div>
		)
	}
	else {
		return (
			<div className="form-buttons">
				<button className={className}>{label}</button>
			</div>
		)
	}
}

interface FormProps<T> {
	children: React.ReactNode;
	errors?: Errors<T>;
	className?: string;
}

export function Form<T>({children, errors, className}: FormProps<T>) {
	errors = errors || {};
	errors.form = errors.form || [];

	return (
		<ReactForm method="post" className={className}>
			{errors.form.length > 0 ? (
				<>
					<h2>Form Errors</h2>
					<ul className="form-errors">
						{errors.form.map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</>
			) : null}
			<div className="fields">
				{children}
			</div>
		</ReactForm>
	)
}

export interface UserFormProps<T> {
	edit: boolean
	id: any // only valid when edit is true
	fields: Partial<T>
	errors?: Errors<T>
}

export interface FormScreenOpts<T, D> {
	extraData: D
	fieldsInitial: Partial<T>
	form: React.FC<UserFormProps<T> & D>
	edit: boolean
	id?: any
}

export function formScreen<T, D>(opts: FormScreenOpts<T, D>) {
	let fields = opts.fieldsInitial
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

export type FormInputType = "text" | "date" | "number" | "bool" | "other" | "enum"

export interface EnumEntry {
	key: string
	label: string
}

export interface FormInputDef<T> {
	key: keyof T & string
	label: string
	type: FormInputType
	required?: boolean
	enumData?: readonly EnumEntry[]
}

export interface FormInputDefSpecific {
	label: string
	type: FormInputType
	required?: boolean
	enumData?: readonly EnumEntry[]
}

export function fieldsFromMap<T>(
	data: {[key: string]: string},
	fieldsDef: FormInputDef<T>[]
): T {
	return Object.fromEntries(
		fieldsDef.map((field) => {
			let k = field.key
			let vs = data[field.key] || ""
			switch (field.type) {
				case "other":
					return [k, vs]
				case "number":
					return [k, Number(vs)]
				case "text":
					return [k, vs]
				case "date":
					if (!vs) {
						return [k, null]
					}
					return [k, new Date(vs)]
				case "bool":
					return [k, Boolean(vs)]
				case "enum":
					return [k, vs]
			}
		})
	) as T;
}

export interface validateFromMapRes<T> {
	ok: boolean
	data: Partial<T>
	resOk?: T
	errors: Errors<T>
}

function fieldRequiredMsg(field: string): string {
	return `The field "${field}" is required.`
}

export function validateFromMap<T>(
	data: {[key: string]: string},
	fieldsDef: FormInputDef<T>[]
): validateFromMapRes<T> {
	const errors: Errors<T> = {};
	errors.fields = {};

	let partial: [keyof T, any][] = []
	let full: [keyof T, any][] = []

	for (let field of fieldsDef) {
		if (field.type == "bool" && field.required) {
			throw "Code sets bool as required, but bools are always required"
		}
		let k = field.key
		let vs = data[field.key] || ""
		let fieldValue: any;
		switch (field.type) {
			case "other":
				fieldValue = vs;
				break;
			case "number":
				fieldValue = vs === "" ? null : Number(vs);
				break;
			case "text":
				fieldValue = vs;
				break;
			case "date":
				fieldValue = vs === "" ? null : new Date(vs);
				break;
			case "bool":
				fieldValue = vs === "on" ? true : false;
				break;
			case "enum":
				const enumValid = field.enumData?.some(e => e.key === vs);

				if (!enumValid) {
					throw new Error("Unknown value for enum");
				}
				fieldValue = vs;
				break;
			default:
				throw new Error(`Unknown type ${field.type}`);
		}
		if (field.type != "bool" && (vs === "" && field.required)) {
			errors.fields![k] = [fieldRequiredMsg(field.label)];
		} else {
			partial.push([k, fieldValue]);
			full.push([k, fieldValue]);
		}
	}

	const ok = !hasErrors(errors)
	if (!ok) {
		return {
			ok,
			data: Object.fromEntries(partial) as Partial<T>,
			errors
		}
	}
	return {
		ok,
		data: Object.fromEntries(partial) as Partial<T>,
		resOk: Object.fromEntries(full) as T,
		errors
	}
}

export interface InputsProps<T> {
	def: FormInputDef<T>[]
	fields: Partial<T>
	errors?: Errors<T>
	override?: Record<string, ReactElement>
}

export function Inputs<T>(props: InputsProps<T>) {
	return props.def
		.map((def) => {
			if (props.override && props.override[def.key]) {
				return props.override[def.key]
			}
			let errors: string[] | undefined;
			if (props.errors && props.errors.fields) {
				errors = props.errors.fields[def.key]
			}
			return <Input key={def.key} def={def} name={def.key} value={props.fields[def.key]} errors={errors} enumData={def.enumData} />
		})
}

export interface InputProps {
	def: FormInputDefSpecific
	name: string
	value: any
	errors: string[] | undefined
	enumData?: readonly EnumEntry[]
}

export function Input(props: InputProps) {
	let label = props.def.label;
	if (props.def.required) {
		label += " *"
	}
	switch (props.def.type) {
		default:
			throw `Unknown type ${props.def.type}`
		case "enum":
			let vs = props.value as string;
			return <Field label={label}>
				<select
					required={props.def.required}
					name={props.name}
					defaultValue={vs}
				>
					{props.enumData!.map((v) => (
						<option key={v.key} value={v.key}>{v.label}</option>
					))}
				</select>
				<FieldErrors2 errors={props.errors} />
			</Field>
		case "bool":
			let v = props.value as boolean;
			if (v) {
				return <Field label={label}>
					<input
						required={props.def.required}
						type="checkbox"
						name={props.name}
						defaultChecked
					/>
					<FieldErrors2 errors={props.errors} />
				</Field>
			} else {
				return <Field label={label}>
					<input
						required={props.def.required}
						type="checkbox"
						name={props.name}
					/>
					<FieldErrors2 errors={props.errors} />
				</Field>
			}
		case "text":
		case "date":
		case "number":
			let defaultValue = ""
			if (props.value !== null && props.value !== undefined) {
				if (props.def.type == "text") {
					let v = props.value as string;
					defaultValue = v
				} else if (props.def.type == "date") {
					let v = props.value as Date;
					defaultValue = formatDate(v)
				} else if (props.def.type == "number") {
					let v = props.value as number;
					defaultValue = String(v)
				}
			}
			return <Field label={label}>
				<input
					required={props.def.required}
					type={props.def.type}
					name={props.name}
					defaultValue={defaultValue}
				/>
				<FieldErrors2 errors={props.errors} />
			</Field>
	}
}

export interface FieldsViewProps<T> {
	def: FormInputDef<T>[]
	fields: T
	override?: Record<string, ReactElement>
}

export function FieldsView<T>(props: FieldsViewProps<T>) {
	return props.def
		.map((def) => {
			if (props.override && props.override[def.key]) {
				return props.override[def.key]
			}
			return <FieldView key={def.key} def={def} value={props.fields[def.key]} />
		})
}

export interface FieldViewProps {
	def: FormInputDefSpecific
	value: any
}

export function FieldView(props: FieldViewProps) {
	if (props.value === null) {
		return <p>{props.def.label}: -</p>
	}
	switch (props.def.type) {
		default:
			throw `Unknown type ${props.def.type}`
		case "bool":
			let b = props.value as boolean;
			return <p>{props.def.label}: {String(b)}</p>
		case "number":
			let n = props.value as number;
			return <p>{props.def.label}: {String(n)}</p>
		case "text":
			let str = props.value as string;
			if (!str.trim()) {
				return <p>{props.def.label}: -</p>
			}
			return <p>{props.def.label}: {str}</p>
		case "date":
			let date = props.value as Date;
			return <p>{props.def.label}: {formatDate(date)}</p>
		case "enum":
			let enumId = props.value;
			let enumItem = props.def.enumData!.find((item) => item.key === enumId);
			return <p>{props.def.label}: {enumItem!.label}</p>

	}
}

interface FormScreenProps<T> {
	fieldsDef: FormInputDef<T>[];
	formComponent: any;
}

export function FormScreen<T>(props: FormScreenProps<T>) {
	const ld = useLoaderData<{item: T | null}>();

	const fieldsInitial = ld.item
		? {...ld.item}
		: {};

	return formScreen({
		extraData: {},
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

interface ViewScreenPublicApprovedProps<T> {
	viewComponent: React.ComponentType<{item: T, isPublic: boolean}>;
}

export function ViewScreenPublicApproved<T>(props: ViewScreenPublicApprovedProps<T>) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{item: T, isPublic: boolean}>();
	if (!ld.item) {
		throw "invalid";
	}
	if (ld.isPublic === undefined) {
		throw "loader does not expose isPublic"
	}
	return <ViewComponent isPublic={ld.isPublic} item={ld.item} />;
}

interface ViewComponentProps {
	isPublic?: boolean;
	path: string;
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
					<Link to={props.path}>{props.plural}</Link>
				</p>
				{!props.isPublic && (
					<>
						<p>
							<Link to={`${props.path}/edit/${String(props.id)}`}>Edit</Link>
						</p>
						<p>
							<Link to={`${props.path}/delete/${String(props.id)}`}>Delete</Link>
						</p>
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
	edit: boolean;
	id?: any;
	plural: string;
	singular: string;
	infoNodes?: React.ReactNode;
	errors: any;
	fields: any;
	fieldsDef: any;
	override?: Record<string, ReactElement>;
}

export function FormView(props: FormViewProps) {
	return (

		<MainContainer title={props.plural}>
				<>
					<p>
						<Link to={props.path}>{props.plural}</Link>
					</p>
					{props.edit && props.id && (
						<p>
							<Link to={`${props.path}/${String(props.id)}`}>View</Link>
						</p>
					)}
					<h2>{props.singular}</h2>
					{props.edit && props.id && <p>ID: {String(props.id)}</p>}
					{props.infoNodes}
					<Form errors={props.errors}>
						<Inputs def={props.fieldsDef} fields={props.fields} errors={props.errors} override={props.override} />
						<SubmitButton label={props.edit ? `Update ${props.singular}` : `Create ${props.singular}`} />
					</Form>
				</>
		</MainContainer>
	);
}

interface ActionLinksProps {
	route: string;
	id: string | number;
}

export function ActionLinks({route, id}: ActionLinksProps) {
	return (
		<>
			<Link to={`${route}/${id}`}>View</Link>&nbsp;
			<Link to={`${route}/edit/${id}`}>Edit</Link>&nbsp;
			<Link to={`${route}/delete/${id}`}>Delete</Link>&nbsp;
		</>
	);
}


