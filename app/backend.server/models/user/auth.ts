import { dr } from "~/db.server";
import { eq, and } from "drizzle-orm";

import { superAdminUsers, userTable } from "~/drizzle/schema";
import { passwordHashCompare } from "./password";
import { isValidTotp } from "./totp";

export type LoginResult =
	| { ok: true; userId: string; countryAccountId?: string | null; role?:string }
	| { ok: false };

export type SuperAdminLoginResult =
	| { ok: true; superAdminId: string;}
	| { ok: false };

export async function login(
	email: string,
	password: string
): Promise<LoginResult> {
	const res = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.email, email));
	if (res.length == 0) {
		return { ok: false };
	}
	const user = res[0];
	const isPasswordValid = await passwordHashCompare(password, user.password);
	if (isPasswordValid) {
		return {
			ok: true,
			userId: user.id,
		};
	}

	return { ok: false };
}

export async function superAdminLogin(
	email: string,
	password: string
): Promise<SuperAdminLoginResult> {
	const res = await dr
		.select()
		.from(superAdminUsers)
		.where(eq(superAdminUsers.email, email));
	if (res.length == 0) {
		return { ok: false };
	}
	const superadminUser = res[0];
	const isPasswordValid = await passwordHashCompare(password, superadminUser.password);
	if (isPasswordValid) {
		return {
			ok: true,
			superAdminId: superadminUser.id,
		};
	}

	return { ok: false };
}

export type LoginAzureB2CResult =
	| { ok: true; userId: string }
	| { ok: false; error: string };

export async function registerAzureB2C(
	pEmail: string,
	pFirstName: string,
	pLastName: string
): Promise<LoginAzureB2CResult> {
	const res = await dr
		.select()
		.from(userTable)
		.where(and(eq(userTable.email, pEmail)));

	if (!res || res.length === 0) {
		return { ok: false, error: "Email address doesn't exists" };
	}
	if (!pFirstName || pFirstName.length === 0) {
		return { ok: false, error: "User first name is required" };
	}
	const user = res[0];

	await dr
		.update(userTable)
		.set({
			firstName: pFirstName,
			lastName: pLastName,
			emailVerified: true,
			authType: "sso_azure_b2c",
			inviteCode: "",
		})
		.where(eq(userTable.email, pEmail));

	return { ok: true, userId: user.id };
}

export async function loginAzureB2C(
	pEmail: string,
	pFirstName: string,
	pLastName: string
): Promise<LoginAzureB2CResult> {
	const res = await dr
		.select()
		.from(userTable)
		.where(
			and(eq(userTable.email, pEmail), eq(userTable.authType, "sso_azure_b2c"))
		);

	if (!res || res.length === 0) {
		return { ok: true, userId: "0" };
	}
	if (!pFirstName || pFirstName.length === 0) {
		return { ok: false, error: "User first name is required" };
	}
	const user = res[0];

	console.log(user);

	if (user.emailVerified == false) {
		return { ok: false, error: "Email address is not yet verified." };
	}

	await dr
		.update(userTable)
		.set({
			firstName: pFirstName,
			lastName: pLastName,
		})
		.where(eq(userTable.email, pEmail));

	return { ok: true, userId: user.id };
}

export type LoginTotpResult = { ok: true } | { ok: false; error: string };

export async function loginTotp(
	userId: string,
	token: string,
	totpIssuer: string,
): Promise<LoginTotpResult> {
	const res = await dr.select().from(userTable).where(eq(userTable.id, userId));
	if (res.length == 0) {
		return { ok: false, error: "Application error. User not found." };
	}
	const user = res[0];

	if (!user.totpEnabled) {
		return {
			ok: false,
			error: "Application error. TOTP not enabled for user.",
		};
	}

	const isValid = await isValidTotp(user, token, totpIssuer);

	if (!isValid) {
		return { ok: false, error: "TOTP token not correct." };
	}

	return { ok: true };
}
