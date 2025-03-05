import {
	FormInputDef,
	Errors,
	FormError,
	hasErrors,
	FormInputDefSpecific
} from "./form"


function fieldRequiredError(def: FormInputDefSpecific): FormError {
	return {def, code: "required", message: `The field "${def.label}" is required.`}
}

function unknownEnumValueError(def: FormInputDefSpecific, value: string, valid: string[]): FormError {
	return {
		def,
		code: "unknown_enum_value",
		message: `The field "${def.label}" contains an unknown enum value "${value}". Valid values are: ${valid.join(", ")}.`
	}
}

function invalidTypeError(def: FormInputDefSpecific, expectedType: string): FormError {
	return {def, code: "invalid_type", message: `The field "${def.label}" must be of type ${expectedType}.`}
}

function invalidDateFormatError(def: FormInputDefSpecific): FormError {
	return {def, code: "invalid_date_format", message: `The field "${def.label}" must be a valid RFC3339 date string.`}
}

function unknownFieldError(key: string): FormError {
	return {data: key, code: "unknown_field", message: `The field "${key}" is not recognized.`}
}

function validateShared<T>(
	data: any,
	fieldsDef: FormInputDef<T>[],
	allowPartial: boolean,
	checkUnknownFields: boolean,
	parseValue: (field: FormInputDef<T>, value: any) => any
): validateRes<T> {
	const errors: Errors<T> = {}
	errors.fields = {}

	let partial: [keyof T, any][] = []
	let full: [keyof T, any][] = []

	if (checkUnknownFields) {
		for (const key in data) {
			if (!fieldsDef.some(field => field.key === key)) {
				errors.form = errors.form || []
				errors.form.push(unknownFieldError(key))
			}
		}
	}

	for (const fieldDef of fieldsDef) {
		const key = fieldDef.key
		const value = data[key]
		let fieldValue: any
		if (value === undefined) {
			if (fieldDef.required) {
				if (allowPartial) {
					continue
				} else {
					errors.fields![key] = [fieldRequiredError(fieldDef)]
					continue
				}
			} else {
				continue
			}
		}
		try {
			fieldValue = parseValue(fieldDef, value)
		} catch (error: any) {
			if (error.code) {
				errors.fields![key] = [error as FormError]
				continue
			} else {
				throw error
			}
		}
		if (!allowPartial && fieldDef.required && (fieldValue === undefined || fieldValue === null)) {
			errors.fields![key] = [fieldRequiredError(fieldDef)]
		} else {
			if (fieldValue !== undefined) {
				partial.push([key, fieldValue])
				full.push([key, fieldValue])
			}
		}
	}

	const ok = !hasErrors(errors)
	if (!ok) {
		return {
			ok,
			data: Object.fromEntries(partial) as Partial<T>,
			errors,
		};
	}

	return {
		ok,
		data: Object.fromEntries(partial) as Partial<T>,
		resOk: Object.fromEntries(full) as T,
		errors,
	};
}


export function validateFromJsonFull<T>(
	data: Partial<Record<keyof T, any>>,
	fieldsDef: FormInputDef<T>[],
	checkUnknownFields: boolean,
): validateFullRes<T> {
	return validateFromJson(data, fieldsDef, false, checkUnknownFields) as validateFullRes<T>
}

export function validateFromMapFull<T>(
	data: {[key: string]: string},
	fieldsDef: FormInputDef<T>[],
	checkUnknownFields: boolean,
): validateFullRes<T> {
	return validateFromMap(data, fieldsDef, false, checkUnknownFields) as validateFullRes<T>
}

export interface validateFullRes<T> {
	ok: boolean
	data: Partial<T>
	resOk?: T
	errors: Errors<T>
}

export interface validateRes<T> {
	ok: boolean
	data: Partial<T>
	resOk?: Partial<T>
	errors: Errors<T>
}

export function validateFromJson<T>(
	data: Partial<Record<keyof T, any>>,
	fieldsDef: FormInputDef<T>[],
	allowPartial: boolean,
	checkUnknownFields: boolean
): validateRes<T> {
	return validateShared(data, fieldsDef, allowPartial, checkUnknownFields, (field, value) => {
		switch (field.type) {
			case "number":
				if (typeof value != "number" && value !== undefined && value !== null) {
					throw invalidTypeError(field, "number")
				}
				return value ?? null
			case "text":
			case "textarea":
			case "money":
			case "enum-flex":
				if (typeof value != "string" && value !== undefined && value !== null) {
					throw invalidTypeError(field, "string")
				}
				return value || ""
			case "date":
			case "datetime":
				if (value !== undefined && value !== null) {
					const parsedDate = new Date(value)
					if (isNaN(parsedDate.getTime())) {
						throw invalidDateFormatError(field)
					}
					return parsedDate
				}
				return null
			case "bool":
				if (typeof value !== "boolean" && value !== undefined && value !== null) {
					throw invalidTypeError(field, "boolean")
				}
				return value ?? false
			case "enum":
				if (!field.enumData?.some(e => e.key === value)) {
					throw unknownEnumValueError(field, value, field.enumData?.map(e => e.key) || [])
				}
				return value
			case "other":
				return value
			default:
				throw new Error("server error: unknown type defined: " + field.type)
		}
	});
}

export function validateFromMap<T>(
	data: {[key: string]: string},
	fieldsDef: FormInputDef<T>[],
	allowPartial: boolean,
	checkUnknownFields: boolean
): validateRes<T> {
	return validateShared(data, fieldsDef, allowPartial, checkUnknownFields, (field, value) => {
		let vs = ""

		// Handle NULL or UNDEFINED early
		if (value === undefined || value === null) {
			return undefined;
		}
		// Handle PostgreSQL JSONB fields properly
		if (field.psqlType === "jsonb") {
			try {
				// Ensure it's a valid JSON string before parsing
				if (typeof value === "string") {
					vs = value;
					if (!isValidJSONString(vs)) {
						throw new Error("Invalid JSON format");
					}
				} else if (typeof value === "object") {
					vs = JSON.stringify(value);
				} else {
					console.error(`Invalid JSONB value for field '${field.key}':`, value);
					throw invalidTypeError(field, "valid JSON");
				}

				// Parse JSON & Recursively parse nested JSON
				let parsedValue = JSON.parse(vs);
				parsedValue = recursivelyParseJSON(parsedValue, 5); // Max depth: 5
				return parsedValue;
			} catch (error) {
				console.error(`Invalid JSON format for field '${field.key}':`, error);
				throw invalidTypeError(field, "valid JSON");
			}
		}
		// If `psqlType` exists but isn't handled, return value as is
		if (field.psqlType) {
			return value;
		}
		// Handle normal form values
		if (typeof value === "string") {
			vs = value.trim();
		} else {
			throw "validateFromMap received value that is not a string, undefined, or null";
		}
		if (field.required && vs.trim() == "") {
			return undefined
		}
		let parsedValue: any;
		switch (field.type) {
			case "number":
				parsedValue = vs === "" ? null : Number(value);
				if (isNaN(parsedValue)) {
					throw invalidTypeError(field, "number");
				}
				return parsedValue
			case "money":
				if (vs === "") {
					return null
				}
				return vs
			case "text":
			case "textarea":
			case "enum-flex":
			case "date_optional_precision":
				return vs;
			case "date":
			case "datetime":
				if (vs === "") {
					return null
				}
				parsedValue = new Date(value);
				if (isNaN(parsedValue.getTime())) {
					throw invalidDateFormatError(field);
				}
				return parsedValue;
			case "bool":
				switch (vs.toLowerCase()) {
					// on for form submits, true for csv imports
					case "on":
					case "true":
						return true
					case "":
					case "off":
					case "false":
						return false
					default:
						throw invalidTypeError(field, "bool")
				}
			case "enum":
				if (!field.required && vs === "") {
					return null
				}
				if (!field.enumData?.some(e => e.key === vs)) {
					throw unknownEnumValueError(field, vs, field.enumData?.map(e => e.key) || []);
				}
				return vs;
			case "other":
				if (vs === "") {
					return null
				}
				return vs
			default:
				throw new Error("server error: unknown type defined: " + field.type)
		}
	});
}

//Helper Function to Check if a String is Valid JSON
function isValidJSONString(str: string): boolean {
	try {
		const parsed = JSON.parse(str);
		return typeof parsed === "object" && parsed !== null;
	} catch (e) {
		return false;
	}
}

//Helper Function: Recursively Parse Nested JSON (Prevents Stack Overflow)
function recursivelyParseJSON(obj: any, depth: number): any {
	if (depth <= 0) return obj; // Stop recursion if max depth reached
	if (Array.isArray(obj)) {
		return obj.map((item) => recursivelyParseJSON(item, depth - 1));
	} else if (typeof obj === "object" && obj !== null) {
		return Object.fromEntries(
			Object.entries(obj).map(([key, val]) => {
				if (typeof val === "string" && isValidJSONString(val)) {
					return [key, recursivelyParseJSON(JSON.parse(val), depth - 1)];
				}
				return [key, val];
			})
		);
	}
	return obj;
}
