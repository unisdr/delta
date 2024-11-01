import { Form as ReactForm } from "@remix-run/react";

export type FormResponse<T> =
	| { ok: true; data: T}
	| { ok: false; data: T, errors: Errors<T> };

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

export function FormMessage({children}:FormMessageProps){
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

export function Field({children, label}:FieldProps){
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

export function FieldErrors<T>({errors, field}:FieldErrorsProps<T>) {
	if (!errors || !errors.fields){
		return null;
	}
	const fieldErrors = errors.fields[field];
	if (!fieldErrors || fieldErrors.length == 0){
		return null;
	}

	return (
		<ul className="form-field-errors">
			{fieldErrors?.map((error, index) => (
				<li key={index}>{error}</li>
			))}
		</ul>
	);
}

interface SubmitButtonProps {
	label: string
}

export function SubmitButton({label}: SubmitButtonProps){
	return (
		<div className="form-buttons">
			<button>{label}</button>
		</div>
	)
}

interface FormProps<T> {
	children: React.ReactNode;
	errors?: Errors<T>
}

export function Form<T>({children, errors}: FormProps<T>){
	errors = errors || {};
	errors.form = errors.form || [];

	return (
		<ReactForm method="post">
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


