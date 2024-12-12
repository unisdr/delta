import {Form as ReactForm} from "@remix-run/react";
import {useLoaderData} from "@remix-run/react";
import {Link, Outlet} from "@remix-run/react";

import {
	useActionData,
} from "@remix-run/react";
import {ReactElement} from "react";

import {formatDate} from "~/util/date"

export type FormResponse<T> =
	| {ok: true; data: T}
	| {ok: false; data: T, errors: Errors<T>};

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
	label: string
}

export function SubmitButton({label}: SubmitButtonProps) {
	return (
		<div className="form-buttons">
			<button>{label}</button>
		</div>
	)
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
	fields: T
	errors?: Errors<T>
}

export interface FormScreenOpts<T, D> {
	extraData: D
	fieldsInitial: T
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

export type FormInputType = "text" | "date" | "number" | "bool" | "other"

export interface FormInputDef<T> {
	key: keyof T & string
	label: string
	type: FormInputType
}

export interface FormInputDefSpecific {
	label: string
	type: FormInputType
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
				case "other":
					return [k, vs]
			}
		})
	) as T;
}

export interface InputsProps<T> {
	def: FormInputDef<T>[]
	fields: T
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
			return <Input key={def.key} def={def} name={def.key} value={props.fields[def.key]} errors={errors} />
		})
}

export interface InputProps {
	def: FormInputDefSpecific
	name: string
	value: any
	errors: string[] | undefined
}

export function Input(props: InputProps) {
	switch (props.def.type) {
		default:
			throw `Unknown type ${props.def.type}`
		case "bool":
			let v = props.value as boolean;
			if (v) {
				return <Field label={props.def.label}>
					<input
						type="checkbox"
						name={props.name}
						checked
					/>
					<FieldErrors2 errors={props.errors} />
				</Field>
			} else {
				return <Field label={props.def.label}>
					<input
						type="checkbox"
						name={props.name}
					/>
					<FieldErrors2 errors={props.errors} />
				</Field>
			}
		case "text":
		case "date":
		case "number":
			let props2 = {
				name: props.name,
				label: props.def.label,
				inputType: props.def.type,
				defaultValue: "",
				errors: props.errors,
			}
			if (props.def.type == "text") {
				let v = props.value as string;
				props2.defaultValue = v
			} else if (props.def.type == "date") {
				let v = props.value as Date | null;
				props2.defaultValue = formatDate(v)
			} else if (props.def.type == "number") {
				let v = props.value as number;
				props2.defaultValue = String(v)
			}
			return InputWithBrowserType(props2)
	}
}

export interface InputWithBrowserTypeProps {
	name: string;
	label: string;
	inputType: string;
	defaultValue: string;
	errors: string[] | undefined;
}

export function InputWithBrowserType(props: InputWithBrowserTypeProps) {
	const {name, label, inputType, defaultValue, errors} = props
	return <Field label={label}>
		<input
			type={inputType}
			name={name}
			defaultValue={defaultValue}
		/>
		<FieldErrors2 errors={errors} />
	</Field>
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
			return <p>{props.def.label}: {str}</p>
		case "date":
			let date = props.value as Date | null;
			return <p>{props.def.label}: {formatDate(date)}</p>
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
		: fieldsFromMap({}, props.fieldsDef);

	return formScreen({
		extraData: {},
		fieldsInitial,
		form: props.formComponent,
		edit: !!ld.item,
		id: (ld.item as any)?.id || null,
	});
}

interface ViewScreenProps {
	viewComponent: any
}

export function ViewScreen<T>(props: ViewScreenProps) {
	let ViewComponent = props.viewComponent;
	const ld = useLoaderData<{item: T}>();
	if (!ld.item) {
		throw "invalid";
	}
	return <ViewComponent item={ld.item} />;
}


interface ViewComponentProps {
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
		<div>
			<p>
				<Link to={props.path}>{props.plural}</Link>
			</p>
			<p>
				<Link to={`${props.path}/edit/${String(props.id)}`}>Edit</Link>
			</p>
			<p>
				<Link to={`${props.path}/delete/${String(props.id)}`}>Delete</Link>
			</p>
			{props.extraActions}

			<h2>{props.singular}</h2>
			<p>ID: {String(props.id)}</p>
			{props.extraInfo}
			{props.children}
		</div>
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
		<div>
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
		</div>
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


