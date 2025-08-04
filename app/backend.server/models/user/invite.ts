import { dr, Tx } from "~/db.server";
import { eq } from "drizzle-orm";

import { userTable, SelectUser } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { sendEmail } from "~/util/email";
import { addHours } from "~/util/time";

import { randomBytes } from "crypto";

import { validateName, validatePassword } from "./user_utils";
import { passwordHash } from "./password";
import { createUserCountryAccounts, doesUserCountryAccountExistByEmailAndCountryAccountsId } from "~/db/queries/userCountryAccounts";
import { createUser, getUserByEmail } from "~/db/queries/user";

type AdminInviteUserResult =
	| { ok: true }
	| { ok: false; errors: Errors<AdminInviteUserFields> };

export interface AdminInviteUserFields {
	firstName: string;
	lastName: string;
	email: string;
	organization: string;
	hydrometCheUser: boolean;
	role: string;
}

export function adminInviteUserFieldsFromMap(data: {
	[key: string]: string;
}): AdminInviteUserFields {
	const fields: (keyof AdminInviteUserFields)[] = [
		"email",
		"firstName",
		"lastName",
		"organization",
		"role",
	];
	let res = Object.fromEntries(
		fields.map((field) => [field, data[field] || ""])
	) as Omit<AdminInviteUserFields, "hydrometCheUser">;
	const result: AdminInviteUserFields = {
		...res,
		hydrometCheUser: data.hydrometCheUser === "on",
	};
	return result;
}

export async function adminInviteUser(
	fields: AdminInviteUserFields,
	countryAccountsId: string,
	baseUrl: string,
	siteName: string
): Promise<AdminInviteUserResult> {
	let errors: Errors<AdminInviteUserFields> = {};
	errors.form = [];
	errors.fields = {};

	if (!fields.firstName || fields.firstName.trim() === "") {
		errors.fields.firstName = ["First name is required"];
	}
	if (!fields.email || fields.email.trim() === "") {
		errors.fields.email = ["Email is required"];
	}
	if (fields.role == "") {
		errors.fields.role = ["Role is required"];
	}
	if (!fields.organization || fields.organization.trim() === "") {
		errors.fields.organization = ["Organisation is required"];
	}

	const emailAndCountryIdExist = await doesUserCountryAccountExistByEmailAndCountryAccountsId(
		fields.email,
		countryAccountsId
	);

	if (emailAndCountryIdExist) {
		errors.fields.email = ["A user with this email already exists"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const user = await getUserByEmail(fields.email);
	if(!user){
		//create new user
		//create new user country account with it
		//send invitation for new user
		dr.transaction(async (tx) => {
			const newUser =	await createUser(fields.email, tx)
			await createUserCountryAccounts(newUser.id,countryAccountsId,fields.role,false,tx);
			await sendInviteForNewUser(newUser, baseUrl,siteName,fields.role,tx);
		});
	}else{
		//create new user country accounts associate to it
		//send invitation for existing user
		dr.transaction(async (tx) => {
			await createUserCountryAccounts(user.id,countryAccountsId,fields.role,false,tx);
			await sendInviteForExistingUser(user,baseUrl,siteName,fields.role);
		});
	}

	return { ok: true };
}

export async function sendInviteForNewUser(
	user: SelectUser,
	siteUrl: string,
	siteName: string,
	role: string,
	tx?: Tx
) {
	const inviteCode = randomBytes(32).toString("hex");
	const expirationTime = addHours(new Date(), 7 * 24);

	const db = tx || dr;
	await db
		.update(userTable)
		.set({
			inviteSentAt: new Date(),
			inviteCode: inviteCode,
			inviteExpiresAt: expirationTime,
		})
		.where(eq(userTable.id, user.id));

	const inviteURL =
		siteUrl + "/user/accept-invite-welcome?inviteCode=" + inviteCode;
	const subject = `Invitation to join DTS ${siteName}`;
	const html = `<p>You have been invited to join the DTS ${siteName} system as 
                   a ${role} user.
                </p>
                <p>Click on the link below to create your account.</p>
                <p>
                  <a href="${inviteURL}" 
                    style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; 
                    background-color: #007BFF; text-decoration: none; border-radius: 5px;">
                    Set up account
                  </a>
                </p>
                <p><a href="${inviteURL}">${inviteURL}</a></p>`;

	const text = `You have been invited to join the DTS ${siteName} system as 
                a ${role} user. 
                Copy and paste the following link into your browser url to create your account:
                ${inviteURL}`;
	await sendEmail(user.email, subject, text, html);
}

export async function sendInviteForExistingUser(
	user: SelectUser,
	siteUrl: string,
	siteName: string,
	role: string,
) {
	
	const subject = `Invitation to join DTS ${siteName}`;
	const html = `<p>You have been invited to join the DTS ${siteName} system as 
                   a ${role} user.
                </p>
                <p>Click on the link below to login to your account.</p>
                <p>
                  <a href="${siteUrl}" 
                    style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; 
                    background-color: #007BFF; text-decoration: none; border-radius: 5px;">
                    Login in
                  </a>
                </p>
                <p><a href="${siteUrl}">${siteUrl}</a></p>`;

	const text = `You have been invited to join the DTS ${siteName} system as 
                a ${role} user. 
                Copy and paste the following link into your browser url to login to your account:
                ${siteUrl}`;
	await sendEmail(user.email, subject, text, html);
}

type ValidateInviteCodeResult =
	| { ok: true; userId: number; email: string }
	| { ok: false; error: string };

export async function validateInviteCode(
	code: string
): Promise<ValidateInviteCodeResult> {
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
		email: user.email,
	};
}

type AcceptInviteResult =
	| { ok: true; userId: number }
	| { ok: false; errors: Errors<AcceptInviteFields> };

interface AcceptInviteFields {
	firstName: string;
	lastName: string;
	password: string;
	passwordRepeat: string;
}

export function AcceptInviteFieldsFromMap(data: {
	[key: string]: string;
}): AcceptInviteFields {
	const fields: (keyof AcceptInviteFields)[] = [
		"firstName",
		"lastName",
		"password",
		"passwordRepeat",
	];
	return Object.fromEntries(
		fields.map((field) => [field, data[field] || ""])
	) as unknown as AcceptInviteFields;
}

export async function acceptInvite(
	inviteCode: string,
	fields: AcceptInviteFields,
	siteUrl: string,
	siteName: string
): Promise<AcceptInviteResult> {
	let errors: Errors<AcceptInviteFields> = {};
	errors.form = [];
	errors.fields = {};

	const codeRes = await validateInviteCode(inviteCode);
	if (!codeRes.ok) {
		errors.form = [codeRes.error];
		return { ok: false, errors };
	}

	const userId = codeRes.userId;

	validateName(fields, errors);
	validatePassword(fields, errors);

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	let user: SelectUser;

	const res = await dr
		.update(userTable)
		.set({
			inviteCode: "",
			password: passwordHash(fields.password),
			firstName: fields.firstName,
			lastName: fields.lastName,
			emailVerified: true,
		})
		.where(eq(userTable.id, userId))
		.returning();

	if (res.length === 0) {
		errors.form = ["Application Error. User not found"];
		return { ok: false, errors };
	}

	user = res[0];

	const accessAccountURL = siteUrl + "/user/settings/";
	const subject = `Welcome to DTS ${siteName}`;
	const html = `<p>Dear ${user.firstName} ${user.lastName},</p>

			<p>Welcome to the DTS ${siteName} system. Your user account has been successfully created.</p>

			<p>Click the link below to access your account.</p>

			<p><a href="${accessAccountURL}" 
				style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #ffffff; 
				background-color: #000000; text-decoration: none; border-radius: 5px;">Access account</a></p>`;

	const text = `Dear ${user.firstName} ${user.lastName},

			Welcome to the DTS ${siteName} system. Your user account has been successfully created.

			Click the link below to access your account.

			${accessAccountURL}`;

	await sendEmail(user.email, subject, text, html);

	return { ok: true, userId: user.id };
}
