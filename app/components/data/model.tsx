import { Prisma } from "@prisma/client";
import { formStringData } from "~/util/httputil";

export type Data = Prisma.ItemCreateInput;

export interface Errors {
	field1?: string;
	field2?: string;
}

export interface DataWithErrors {
	data: Data
	errors?: Errors
}

export function ValidateFormData(formData: FormData): DataWithErrors {
	const data = formStringData(formData)
	const data2 = {
		field1: data.field1 || "",
		field2: data.field2 || "",
	}
	const errors = Validate(data2)
	return {
		errors: errors,
		data: data2
	}
}

export function Validate(data: Data){
	let errors: Errors = {} 
	if (data.field1 == ""){
		errors.field1 = "Empty field1"
	}
	if (data.field2 == ""){
		errors.field2 = "Empty field2"
	}
	if (Object.keys(errors).length == 0) {
		return undefined
  }
	return errors
}

