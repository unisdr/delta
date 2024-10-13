import { Prisma, User } from "@prisma/client";
import { formStringData } from "~/util/httputil";
import bcrypt from 'bcryptjs';


import fs from 'fs';
import path from 'path';

export type Data = Prisma.ItemCreateInput;

import {
	Errors,
	hasErrors,
} from "~/components/form"

import { prisma } from "~/db.server";
import { sendEmail } from "~/util/email";
import { addHours } from "~/util/time";

import { randomBytes } from 'crypto';

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

export async function resetPasswordSilentIfNotFound(email: string) {
	const user = await prisma.user.findUnique({
		where: { email: email },
	});
	if (!user) {
		console.log("reset password, user not found", "email", email)
		return
	}

	const resetToken = randomBytes(32).toString("hex");

	const expiresAt = addHours(new Date(), 1);

	await prisma.user.update({
		where: { email: email },
		data: {
			resetPasswordToken: resetToken,
			resetPasswordExpiresAt: expiresAt,
		},
	});

	if (!process.env.WEBSITE_URL){
		throw "provide WEBSITE_URL in env"
	}

	const resetURL = `${process.env.WEBSITE_URL}/user/reset_password?token=${resetToken}&email=${encodeURIComponent(email)}`;

	const subject =  "Password Reset Request"
	const text = `You requested a password reset. Click the link to reset your password: ${resetURL}`
	const html = `<p>You requested a password reset. Click the link below to reset your password:</p>
<a href="${resetURL}">${resetURL}</a>
<p>This link will expire in 1 hour.</p>`

	await sendEmail(user.email, subject, text, html);
}

export async function resetPassword(email: string, token: string, newPassword: string){
	const user = await prisma.user.findUnique({
		where: { email: email },
	});
	if (!user) {
		return { ok: false, error: "User not found" };
	}
	if (user.resetPasswordToken !== token) {
		return { ok: false, error: "Invalid or expired token" };
	}
	const now = new Date();
	if (user.resetPasswordExpiresAt && user.resetPasswordExpiresAt < now) {
		return { ok: false, error: "Token has expired" };
	}
	if (!newPassword){
		return { ok: false, error: "Empty password" };
	}
	const hashedPassword = passwordHash(newPassword)
	await prisma.user.update({
		where: { email: email },
		data: {
			password: hashedPassword,
			resetPasswordToken: "",
		},
	});

	return { ok: true };
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
	| { ok: true; userId: number}
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

	let user

	try {
	user = await prisma.user.create({
		data: {
			email: fields.email,
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
		}
	})
} catch (e) {
		if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		// Handle any other unexpected errors
		throw e;
	}

	console.log("setupAdminAccount", user)

	sendEmailVerification(user)

	return { ok: true, userId: user.id }
}


function generateVerificationCode(digits: number): string {
	const min = Math.pow(10, digits - 1);
	const max = Math.pow(10, digits) - 1;
	return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

const digitsInVerificationCode = 6

export async function sendEmailVerification(user: User) {
	const verificationCode = generateVerificationCode(digitsInVerificationCode);
	const expirationTime = addHours(new Date(), 24);

	await prisma.user.update({
		where: { id: user.id },
		data: {
			emailVerificationSentAt: new Date(),
			emailVerificationCode: verificationCode,
			emailVerificationExpiresAt: expirationTime,
		},
	});

	const subject = "Verify Your Email";
	const text = `Your verification code is ${verificationCode}. It expires in 24 hours.`;
	const html = `<p>Your verification code is <strong>${verificationCode}</strong>. It expires in 24 hours.</p>`;

	await sendEmail(user.email, subject, text, html);
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
