import { Prisma } from "@prisma/client";
import { formStringData } from "~/util/httputil";
import bcrypt from 'bcryptjs';

export type Data = Prisma.ItemCreateInput;

import {
	Errors,
	hasErrors,
} from "~/components/form"

import { prisma } from "~/db.server";

type RegisterResult = 
  | { ok: true; }
  | { ok: false; errors: Errors<RegisterFields> };

interface RegisterFields {
	email: string
	password: string
}

// rounds=10: ~10 hashes/sec
// this measurements is from another implementation
// https://github.com/kelektiv/node.bcrypt.js#readme
const bcryptRounds = 10

export async function register({email, password}: RegisterFields): Promise<RegisterResult> {
	let errors: Errors<RegisterFields> = {}
	errors.fields = {}
	if (email == "") {
		errors.fields.email = ["Email is empty"]
	}
	if (password == "") {
		errors.fields.password = ["Password is empty"]
	}
	if (hasErrors(errors)) {
		return { ok: false, errors }
	}
	const passwordHash = bcrypt.hashSync(password, bcryptRounds);

	const user = await prisma.user.create({
		data: {
			email: email,
			password: passwordHash,
			firstName: "",
			lastName: ""
		}
	})
	console.log("created user in db", user)

	return { ok: true }
}

export type LoginResult = 
  | { ok: true, userId: number}
  | { ok: false };

export async function login(email: string, password: string): Promise<LoginResult> {
	const user = await prisma.user.findUnique({
		where: { email: email },
	})

	if (!user){
		return {ok: false}
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (isPasswordValid) {
		return { ok: true, userId: user.id};
	}

	return { ok: false}
}


export interface Errors2 {
	field1?: string;
	field2?: string;
}

export interface DataWithErrors {
	data: Data
	errors?: Errors2
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
	let errors: Errors2 = {} 
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


