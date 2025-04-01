import {
	FormError,
} from "~/frontend/form";

import {ErrorResult} from "./form";

export function errorForForm<T>(err: FormError): ErrorResult<T> {
	return {
		ok: false,
		errors: {
			form: [err],
		},
	};
}

export function errorForField<T extends Record<string, any>>(
	field: keyof T,
	err: FormError
): ErrorResult<T> {
	return {
		ok: false,
		errors: {
			fields: createFields(field, err),
		},
	};
}

function createFields<T extends Record<string, any>>(
	field: keyof T,
	err: string | FormError
): Partial<Record<keyof T, (string | FormError)[]>> {
	return {[field]: [err]} as Partial<Record<keyof T, (string | FormError)[]>>;
}

export interface ErrorWithCode {
	code: string;
	message: string;
}

export interface RowError extends FormError {
	row: number;
}

export var updateMissingIDError = {
	code: "missingId",
	message: "Each item must be an object with a valid 'id' field.",
};

export const upsertApiImportIdMissingError: FormError = {
	code: "UpsertApiImportIdMissingError",
	message: "When using upsert apiImportId is required on each object.",
};

