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

function passwordHash(password: string): string {
	return bcrypt.hashSync(password, bcryptRounds);
}

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
	const user = await prisma.user.create({
		data: {
			email: email,
			password: passwordHash(password),
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

type SetupAdminAccountResult = 
	| { ok: true; }
	| { ok: false; errors: Errors<SetupAdminAccountFields> };

interface SetupAdminAccountFields {
	email: string
	firstName: string
	lastName: string
	password: string
	passwordRepeat: string
}

export function setupAdminAccountFieldsFromMap(data: { [key: string]: string }): SetupAdminAccountFields {
	const fields: (keyof SetupAdminAccountFields)[] = [
		"email",
		"firstName",
		"lastName",
		"password",
		"passwordRepeat"
	];
	 return Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as unknown as SetupAdminAccountFields;
}

export async function setupAdminAccount(fields: SetupAdminAccountFields): Promise<SetupAdminAccountResult> {
	let errors: Errors<SetupAdminAccountFields> = {}
	errors.form = []
	errors.fields = {}
	if (fields.email == "") {
		errors.fields.email = ["Email is empty"]
	}
	if (fields.firstName == ""){
		errors.fields.firstName = ["First name is empty"]
	}
	if (fields.password == "") {
		errors.fields.password = ["Password is empty"]
	} else if (fields.passwordRepeat == "") {
		errors.fields.passwordRepeat = ["Please repeat password"]
	} else if (fields.password != fields.passwordRepeat){
		const msg = "Passwords do not match"
		errors.form.push(msg)
		errors.fields.password = [msg]
		errors.fields.passwordRepeat = [msg]
	}

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	const user = await prisma.user.create({
		data: {
			email: fields.email,
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
		}
	})
	console.log("setupAdminAccount", user)

	return { ok: true }
}

type VerifyEmailResult = 
	| { ok: true; }
	| { ok: false; errors: Errors<VerifyEmailFields> };

interface VerifyEmailFields {
	code: string
}

export async function verifyEmail(userId: number, code: string): Promise<VerifyEmailResult> {
	let errors: Errors<VerifyEmailFields> = {}
	errors.form = []
	errors.fields = {}
	if (!code) {
		errors.fields.code = ["Verification code is required"];
	}
	if (hasErrors(errors)) {
		return { ok: false, errors };
	}
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});
	if (!user) {
		errors.form = ["Application Error. User not found"];
		return { ok: false, errors };
	}
	if (user.emailVerificationCode !== code) {
		errors.fields.code = ["Invalid verification code"];
		return { ok: false, errors };
	}

	if (user.emailVerificationExpiresAt < new Date()) {
		errors.fields.code = ["Verification code has expired"];
		return { ok: false, errors };
	}

	await prisma.user.update({
		where: { id: userId },
		data: {
			emailVerified: true,
			emailVerificationCode: "",
			emailVerificationExpiresAt: new Date("1970-01-01T00:00:00.000Z"),
		},
	});

	return { ok: true };
}
