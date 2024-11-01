import { dr } from "~/db.server";
import {
	InferSelectModel,
	eq,
	and
} from "drizzle-orm";

import {
	userTable,
	User,
	ItemInsert
} from '~/drizzle/schema';

import { formStringData } from "~/util/httputil";
import bcrypt from 'bcryptjs';

import {
	Errors,
	hasErrors,
	initErrorField,
} from "~/components/form"

import { sendEmail } from "~/util/email";
import { addHours } from "~/util/time";
import { errorIsNotUnique } from "~/util/db";

import { randomBytes } from 'crypto';

import * as OTPAuth from "otpauth";
import {configSiteURL} from "~/util/config";

// rounds=10: ~10 hashes/sec
// this measurements is from another implementation
// https://github.com/kelektiv/node.bcrypt.js#readme
const bcryptRounds = 10

function passwordHash(password: string): string {
	return bcrypt.hashSync(password, bcryptRounds);
}

async function passwordHashCompare(password: string, passwordHash: string){
	if (password == "" || passwordHash == ""){
		return false
	}
	return await bcrypt.compare(password, passwordHash);
}

export type LoginResult = 
	| { ok: true, userId: number}
	| { ok: false };

export async function login(email: string, password: string): Promise<LoginResult> {
	const res = await dr.select().from(userTable).where(eq(userTable.email, email));
	if (res.length == 0){
		return {ok: false}
	}
	const user = res[0]
	const isPasswordValid = await passwordHashCompare(password, user.password);
	if (isPasswordValid) {
		return { ok: true, userId: user.id};
	}

	return { ok: false}
}

export type LoginAzureB2CResult = 
	| { ok: true, userId: number}
	| { ok: false, error: string };

export async function loginAzureB2C(pEmail: string, pFirstName: string, pLastName: string): Promise<LoginAzureB2CResult> {
	const res = await dr.select().from(userTable).where(
		and(
			eq(userTable.email, pEmail),
			eq(userTable.authType, 'sso_azure_b2c')
		)
	);

	if (!res || res.length === 0) {
		return { ok: true, userId: 0};
	}
	if (!pFirstName || pFirstName.length === 0) {
		return { ok: false, error: "User first name is required"};
	}
	const user = res[0];

	console.log(user);

	if (user.emailVerified == false) {
		return { ok: false, error: "Email address is not yet verified."};
	}

	await dr
	.update(userTable)
	.set({
		firstName: pFirstName,
		lastName: pLastName,
	})
	.where(eq(userTable.email, pEmail));

	return { ok: true, userId: user.id};
}


export type LoginTotpResult = 
	| { ok: true}
	| { ok: false, error: string };

export async function loginTotp(userId: number, token: string): Promise<LoginTotpResult> {
	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));
	if (res.length == 0){
		return {ok: false, error: "Application error. User not found."}
	}
	const user = res[0];

	if (!user.totpEnabled){
		return {ok: false, error: "Application error. TOTP not enabled for user."}
	}

	const isValid = await isValidTotp(user, token)

	if (!isValid){
		return {ok: false, error: "TOTP token not correct."}
	}


	return {ok: true}
}


export async function resetPasswordSilentIfNotFound(email: string) {
	const res = await dr.select().from(userTable).where(eq(userTable.email, email));

	if (!res || res.length === 0) {
	console.log("reset password, user not found", "email", email);
	return;
}
	const user = res[0];

	const resetToken = randomBytes(32).toString("hex");

	const expiresAt = addHours(new Date(), 1);

	await dr
	.update(userTable)
	.set({
		resetPasswordToken: resetToken,
		resetPasswordExpiresAt: expiresAt,
	})
	.where(eq(userTable.email, email));

	const resetURL = `${configSiteURL()}/user/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

	const subject =  "Password Reset Request"
	const text = `You requested a password reset. Click the link to reset your password: ${resetURL}`
	const html = `<p>You requested a password reset. Click the link below to reset your password:</p>
<a href="${resetURL}">${resetURL}</a>
<p>This link will expire in 1 hour.</p>`

	await sendEmail(user.email, subject, text, html);
}
export async function resetPassword(email: string, token: string, newPassword: string){
		const res = await dr.select().from(userTable).where(eq(userTable.email, email));

	if (!res || res.length === 0) {
		return { ok: false, error: "User not found" };
	}

	const user = res[0];
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
	await dr
	.update(userTable)
	.set({
		password: hashedPassword,
		resetPasswordToken: "",
	})
	.where(eq(userTable.email, email));

	return { ok: true };
}

export interface Errors2 {
	field1?: string;
	field2?: string;
}

export interface DataWithErrors {
	data: ItemInsert
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

export function Validate(data: ItemInsert){
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


interface EmailField {
	email: string;
}

function validateEmail(data: EmailField, errors: Errors<EmailField>) {
	let email = initErrorField(errors, "email")
	if (data.email == "") {
		email.push("Email is required");
	}
}

interface NameFields {
	firstName: string;
	lastName: string;
}
function validateName(data: NameFields, errors: Errors<NameFields>) {
	let firstName = initErrorField(errors, "firstName")
	if (data.firstName == "") {
		firstName.push("First name is required");
	}
}

interface PasswordFields {
	password: string;
	passwordRepeat: string;
}

function validatePassword(data: PasswordFields, errors: Errors<PasswordFields>) {
	let password = initErrorField(errors, "password")
	let passwordRepeat = initErrorField(errors, "passwordRepeat")
	errors.form = errors.form || [];
	if (data.password == "") {
		password.push("Password is empty");
	} 
	if (data.passwordRepeat == "") {
		passwordRepeat.push("Please repeat password");
	} 
	if (data.password != "" && data.passwordRepeat != "" && data.password != data.passwordRepeat) {
		const msg = "Passwords do not match";
		errors.form.push(msg);
		password.push(msg);
		passwordRepeat.push(msg);
	}
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

	validateEmail(fields, errors);
	validateName(fields, errors);
	validatePassword(fields, errors);

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	let user: User

	try {
		const res = await dr.insert(userTable).values({
			role: "admin",
			email: fields.email,
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
		}).returning()
		user = res[0]
	} catch (e: any) {
		if (errorIsNotUnique(e, "user", "email")) {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		throw e;
	}

	sendEmailVerification(user)

	return { ok: true, userId: user.id }
}

export async function setupAdminAccountSSOAzureB2C(fields: SetupAdminAccountFields): Promise<SetupAdminAccountResult> {
	let errors: Errors<SetupAdminAccountFields> = {}
	errors.form = []
	errors.fields = {}
	if (fields.email == "") {
		errors.fields.email = ["Email is empty"]
	}
	if (fields.firstName == ""){
		errors.fields.firstName = ["First name is empty"]
	}

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	let user: User

	try {
		const res = await dr.insert(userTable).values({
			role: "admin",
			authType: 'sso_azure_b2c',
			email: fields.email,
			password: '',
			firstName: fields.firstName,
			lastName: fields.lastName,
		}).returning()
		user = res[0]
	} catch (e: any) {
		if (errorIsNotUnique(e, "user", "email")) {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		throw e;
	}

	sendEmailVerification(user)

	return { ok: true, userId: user.id }
}


function generateVerificationCode(digits: number): string {
	const min = Math.pow(10, digits - 1);
	const max = Math.pow(10, digits) - 1;
	return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

const digitsInVerificationCode = 6

export async function sendEmailVerification(user: InferSelectModel<typeof userTable>) {
	const verificationCode = generateVerificationCode(digitsInVerificationCode);
	const expirationTime = addHours(new Date(), 24);

	await dr
	.update(userTable)
	.set({
		emailVerificationSentAt: new Date(),
		emailVerificationCode: verificationCode,
		emailVerificationExpiresAt: expirationTime,
	})
	.where(eq(userTable.id, user.id));


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
	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

	if (!res || res.length === 0) {
		errors.form = ["Application Error. User not found"];
		return { ok: false, errors };
	}
	const user = res[0];

	if (user.emailVerificationCode !== code) {
		errors.fields.code = ["Invalid verification code"];
		return { ok: false, errors };
	}

	if (user.emailVerificationExpiresAt < new Date()) {
		errors.fields.code = ["Verification code has expired"];
		return { ok: false, errors };
	}

	await dr
	.update(userTable)
	.set({
		emailVerified: true,
		emailVerificationCode: "",
		emailVerificationExpiresAt: new Date("1970-01-01T00:00:00.000Z"),
	})
	.where(eq(userTable.id, userId));

	return { ok: true };
}

export interface ChangePasswordFields {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

type ChangePasswordResult = 
	| { ok: true; }
	| { ok: false; errors: Errors<ChangePasswordFields> };

export async function changePassword(userId: number, fields:ChangePasswordFields): Promise<ChangePasswordResult> {
	let errors: Errors<ChangePasswordFields> = {};
	errors.form = [];
	errors.fields = {};

	const { currentPassword, newPassword, confirmPassword } = fields;

	if (!currentPassword) {
		errors.fields.currentPassword = ["Current password is required"];
	}

	if (!newPassword) {
		errors.fields.newPassword = ["New password is required"];
	}

	if (newPassword && confirmPassword !== newPassword) {
		errors.fields.confirmPassword = ["New passwords do not match"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

if (!res || res.length === 0) {
	errors.form = ["Application error. User not found"];
	return { ok: false, errors };
}

const user = res[0];

	const passwordValid = await passwordHashCompare(currentPassword, user.password);
	if (!passwordValid) {
		errors.fields.currentPassword = ["Current password is incorrect"];
		return { ok: false, errors };
	}

	const hashedPassword = passwordHash(newPassword);

	await dr
	.update(userTable)
	.set({
		password: hashedPassword,
	})
	.where(eq(userTable.id, userId));


	return { ok: true };
}

function totpSettings(userEmail: string, secret: string){
	if (!secret){
		throw "provide secret"
	}

	return new OTPAuth.TOTP({
		issuer: process.env.TOTP_ISSUER || "example-app",
		label: userEmail,
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: secret
	});
}

type GenerateTotpResult = 
	| { ok: true; secret: string; secretUrl: string }
	| { ok: false; error: string };

const totpSecretSize = 16

export async function generateTotpIfNotSet(userId: number): Promise<GenerateTotpResult> {

	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

	if (!res || res.length === 0) {
		throw "User not found";
	}

	const user = res[0];

	if (user.totpEnabled){
		return {ok: false, error: "TOTP already enabled"}
	}

	if (user.totpSecret){
		return {ok: true, secret: user.totpSecret, secretUrl: user.totpSecretUrl}
	}

	const secret = new OTPAuth.Secret({ size: totpSecretSize }).base32;

	const totp = totpSettings(user.email, secret)

	if (!secret) {
		throw "Application Error";
	}

	// url with secret and params
	const secretUrl = totp.toString();

	await dr
	.update(userTable)
	.set({
		totpSecret: secret,
		totpSecretUrl: secretUrl,
	})
	.where(eq(userTable.id, userId));

	return {
		ok: true,
		secret,
		secretUrl,
	};
}

async function isValidTotp(user: User, token: string): Promise<boolean> {
	if (!user.totpSecret){
		throw "TOTP secret not set"
	}
	if (!token){
		return false
	}
	const totp = totpSettings(user.email, user.totpSecret)
	let delta = totp.validate({ token, window: 1 });
	if (delta === null){
		return false
	}
	return true
}

type SetTotpEnabledResult = 
	| { ok: true; }
	| { ok: false; error: string };

export async function setTotpEnabled(userId: number, token: string, enabled: boolean): Promise<SetTotpEnabledResult> {

	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));

	if (!res || res.length === 0) {
	throw "User not found";
	}

	const user = res[0];

	if (!token){
		return {ok: false, error: "Empty token"}
	}

	const isValid = await isValidTotp(user, token);

	if (!isValid){
		return {ok: false, error: "Invalid token"}
	}

	let data;

	if (enabled){
		data = {
			totpEnabled: enabled
		}

	} else {
		data = {
			totpEnabled: enabled,
			totpSecret: "",
			totpSecretUrl: ""
		}
	}

	await dr
	.update(userTable)
	.set(data)
	.where(eq(userTable.id, userId));

	if (enabled){
		return await loginTotp(userId, token);
	}

	return {ok: true}
}


type AdminUpdateUserResult = 
	| { ok: true; userId: number}
	| { ok: false; errors: Errors<AdminUpdateUserFields> };

export interface AdminUpdateUserFields {
	email: string
	firstName: string
	lastName: string
	role: string
}

export function adminUpdateUserFieldsFromMap(data: { [key: string]: string }): AdminUpdateUserFields {
	const fields: (keyof AdminUpdateUserFields)[] = [
		"email",
		"firstName",
		"lastName",
		"role"
	];
	 return Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as unknown as AdminUpdateUserFields;
}

export async function adminUpdateUser(id: number, fields: AdminUpdateUserFields): Promise<AdminUpdateUserResult> {
	let errors: Errors<AdminUpdateUserFields> = {}
	errors.form = []
	errors.fields = {}
	if (fields.email == "") {
		errors.fields.email = ["Email is empty"]
	}
	if (fields.firstName == ""){
		errors.fields.firstName = ["First name is empty"]
	}
	if (fields.role == ""){
		errors.fields.role = ["Role is required"]
	}

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	try {
		const res = await dr
		.update(userTable)
		.set({
			email: fields.email,
			firstName: fields.firstName,
			lastName: fields.lastName,
			role: fields.role,
		})
		.where(eq(userTable.id, id))
		.returning({ id: userTable.id });

		if (res.length == 0){
			errors.form.push("User was not found using provided ID.");
			return { ok: false, errors };
		}
} catch (e: any) {
	if (errorIsNotUnique(e, "user", "email")) {
		errors.fields.email = ["A user with this email already exists"];
	return { ok: false, errors };
	}
	throw e;
}

	// sendEmailVerification(user);

	return { ok: true, userId: id };
}


type AdminInviteUserResult = 
	| { ok: true }
	| { ok: false; errors: Errors<AdminInviteUserFields> };

export interface AdminInviteUserFields {
	firstName: string
	lastName: string
	email: string
	organization: string
	hydrometCheUser: boolean
	role: string
}

export function adminInviteUserFieldsFromMap(data: { [key: string]: string }): AdminInviteUserFields {
	const fields: (keyof AdminInviteUserFields)[] = [
		"email",
		"firstName",
		"lastName",
		"organization",
		"role",
	];
	let res = Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as Omit<AdminInviteUserFields, "hydrometCheUser">;
	const result: AdminInviteUserFields = {
		...res,
		hydrometCheUser: data.hydrometCheUser === "on",
	};
	return result;
}

export async function adminInviteUser(fields: AdminInviteUserFields): Promise<AdminInviteUserResult> {
	let errors: Errors<AdminInviteUserFields> = {};
	errors.form = [];
	errors.fields = {};

	if (fields.email == "") {
		errors.fields.email = ["Email is required"];
	}
	if (fields.firstName == "") {
		errors.fields.firstName = ["First name is required"];
	}
	if (fields.role == "") {
		errors.fields.role = ["Role is required"];
	}
	if (fields.organization == "") {
		errors.fields.organization = ["Organization is required"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	try {
		const res = await dr
			.insert(userTable)
			.values({
				email: fields.email,
				firstName: fields.firstName,
				lastName: fields.lastName,
				role: fields.role,
				organization: fields.organization,
				hydrometCheUser: fields.hydrometCheUser
			}).returning()
		const user = res[0]
		await sendInvite(user)
	} catch (e: any) {
		if (errorIsNotUnique(e, "user", "email")) {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		throw e;
	}


	return { ok: true };
}

export async function sendInvite(user: User) {
	const inviteCode = randomBytes(32).toString("hex");
	const expirationTime = addHours(new Date(), 7 * 24);

	await dr
	.update(userTable)
	.set({
		inviteSentAt: new Date(),
		inviteCode: inviteCode,
		inviteExpiresAt: expirationTime,
	})
	.where(eq(userTable.id, user.id));

	const inviteURL = configSiteURL() + "/user/accept-invite?inviteCode=" + inviteCode

	const subject = "Invite";
	const text = `${inviteURL}`;
	const html = `<p><a href="${inviteURL}">${inviteURL}</a></p>`;

	await sendEmail(user.email, subject, text, html);
}

type ValidateInviteCodeResult = 
	| { ok: true, userId: number}
	| { ok: false, error: string };

export async function validateInviteCode(code: string): Promise<ValidateInviteCodeResult> {
	if (!code) {
		return { ok: false, error: "Invite code is required" };
	}

	const res = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.inviteCode, code));

	if (!res.length) {
		return { ok: false, error: "Invalid invite code" };
	}

	const user = res[0];
	const now = new Date();

	if (user.inviteExpiresAt < now) {
		return { ok: false, error: "Invite code has expired" };
	}

	return {
		ok: true,
		userId: user.id,
	};
}


type AcceptInviteResult = 
	| { ok: true; userId: number}
	| { ok: false; errors: Errors<AcceptInviteFields> };

interface AcceptInviteFields {
	firstName: string
	lastName: string
	password: string
	passwordRepeat: string
}

export function AcceptInviteFieldsFromMap(data: { [key: string]: string }): AcceptInviteFields {
	const fields: (keyof AcceptInviteFields)[] = [
		"firstName",
		"lastName",
		"password",
		"passwordRepeat"
	];
	 return Object.fromEntries(
		fields.map(field => [field, data[field] || ""])
	) as unknown as AcceptInviteFields;
}

export async function acceptInvite(inviteCode: string, fields: AcceptInviteFields): Promise<AcceptInviteResult> {
	let errors: Errors<AcceptInviteFields> = {}
	errors.form = []
	errors.fields = {}

	const codeRes = await validateInviteCode(inviteCode)
	if (!codeRes.ok){
		errors.form = [codeRes.error]
		return { ok: false, errors }
	}

	const userId = codeRes.userId

	validateName(fields, errors);
	validatePassword(fields, errors);

	if (hasErrors(errors)) {
		return { ok: false, errors }
	}

	let user: User

	const res = await dr
		.update(userTable)
		.set({
			inviteCode: "",
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
			emailVerified: true
		})
		.where(eq(userTable.id, userId))
		.returning()

	if (res.length === 0){
		errors.form = ["Application Error. User not found"]
		return { ok: false, errors }
	}

	user = res[0]

	return { ok: true, userId: user.id }
}

