import {
	generatePassword,
	passwordHash,
} from "~/backend.server/models/user/password";
import { dr } from "~/db.server";
import { getCountryById } from "~/db/queries/countries";
import {
	countryAccountExists,
	createCountryAccount,
} from "~/db/queries/countryAccounts";
import { createInstanceSystemSetting } from "~/db/queries/instanceSystemSetting";
import {
	createPrimaryAdminUserForCountryAccounts,
	getUserByEmail,
} from "~/db/queries/user";

// Create a custom error class for validation errors
export class CountryAccountValidationError extends Error {
	constructor(public errors: string[]) {
		super("Country account validation failed");
		this.name = "ValidationError";
	}
}

export async function createCountryAccountService(
	countryId: string,
	email: string,
	status: number = 1
) {
	// send email

	const errors: string[] = [];
	if (!countryId) errors.push("Country is required");
	if (!status) errors.push("Status is required");
	if (!email) errors.push("Admin email is required");

	if (countryId && countryId === "-1") {
		errors.push("Please select a country");
	}

	if (status && Number(status) !== 1 && Number(status) !== 0) {
		errors.push("Please enter status valid value");
	}

	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString())) {
		errors.push("Please enter a valid email address");
	}

	const existingUser = await getUserByEmail(email);
	if (email && existingUser !== null) {
		errors.push("Email already exist.");
	}

	if (
		countryId &&
		countryId !== "-1" &&
		(await getCountryById(countryId)) == null
	) {
		errors.push("Invalid country Id");
	}
	if (
		countryId &&
		countryId !== "-1" &&
		(await countryAccountExists(countryId))
	) {
		errors.push("Selected country already exist");
	}
	if (errors.length > 0) {
		throw new CountryAccountValidationError(errors);
	}

	// generate password
	const password = generatePassword(12);
	return dr.transaction(async (tx) => {
		const countryAccount = await createCountryAccount(countryId, status, tx);
		const adminUser = await createPrimaryAdminUserForCountryAccounts(
			email,
			"admin",
			passwordHash(password),
			countryAccount.id,
			tx
		);

		const country = await getCountryById(countryId);
		if (!country) {
			errors.push(`Country with ID ${countryId} not found.`);
			throw new CountryAccountValidationError(errors);
		}
		createInstanceSystemSetting(
			country.name,
			country.iso3 || '',
			countryAccount.id
		);
		return { countryAccount, adminUser };
	});

	//TODO send an email
}
