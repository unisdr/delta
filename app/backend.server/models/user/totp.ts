import { SelectUser } from "~/drizzle/schema";

import * as OTPAuth from "otpauth";
import { loginTotp } from "./auth";
import { getUserById, updateUserById } from "~/db/queries/user";

type GenerateTotpResult =
	| { ok: true; secret: string; secretUrl: string }
	| { ok: false; error: string };

const totpSecretSize = 16;

export async function generateTotpIfNotSet(
	userId: string,
	totpIssuer: string
): Promise<GenerateTotpResult> {
	const user = await getUserById(userId);

	if (!user) {
		throw "User not found";
	}

	if (user.totpEnabled) {
		return { ok: false, error: "TOTP already enabled" };
	}

	if (user.totpSecret) {
		return { ok: true, secret: user.totpSecret, secretUrl: user.totpSecretUrl };
	}

	const secret = new OTPAuth.Secret({ size: totpSecretSize }).base32;
	const totp = new OTPAuth.TOTP({
		issuer: totpIssuer,
		label: user.email,
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: secret,
	});

	if (!secret) {
		throw "Application Error";
	}

	// url with secret and params
	const secretUrl = totp.toString();
	updateUserById(userId, {
		totpSecret: secret,
		totpSecretUrl: secretUrl,
	});

	return {
		ok: true,
		secret,
		secretUrl,
	};
}

export async function isValidTotp(
	user: SelectUser,
	token: string,
	totpIssuer: string
): Promise<boolean> {
	if (!user.totpSecret) {
		throw "TOTP secret not set";
	}
	if (!token) {
		return false;
	}

	if (!user.totpSecret) {
		throw "provide secret";
	}
	const totp = new OTPAuth.TOTP({
		issuer: totpIssuer,
		label: user.email,
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: user.totpSecret,
	});

	let delta = totp.validate({ token, window: 1 });
	if (delta === null) {
		return false;
	}
	return true;
}

type SetTotpEnabledResult = { ok: true } | { ok: false; error: string };

export async function setTotpEnabled(
	userId: string,
	token: string,
	enabled: boolean,
	totpIssuer: string
): Promise<SetTotpEnabledResult> {
	const user = await getUserById(userId);

	if (!user) {
		throw "User not found";
	}

	if (!token) {
		return { ok: false, error: "Empty token" };
	}

	const isValid = await isValidTotp(user, token, totpIssuer);

	if (!isValid) {
		return { ok: false, error: "Invalid token" };
	}

	let data;

	if (enabled) {
		data = {
			totpEnabled: enabled,
		};
	} else {
		data = {
			totpEnabled: enabled,
			totpSecret: "",
			totpSecretUrl: "",
		};
	}

	updateUserById(userId, data);

	if (enabled) {
		return await loginTotp(userId, token, totpIssuer);
	}

	return { ok: true };
}
