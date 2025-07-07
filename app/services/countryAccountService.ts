import { sendInvite } from "~/backend.server/models/user/invite";
import { dr, Tx } from "~/db.server";
import { getCountryById } from "~/db/queries/countries";
import {
	countryAccountWithTypeExists,
	createCountryAccount,
	getCountryAccountById,
	updateCountryAccountStatus,
} from "~/db/queries/countryAccounts";
import { createInstanceSystemSetting } from "~/db/queries/instanceSystemSetting";
import { createUser, getUserByEmail } from "~/db/queries/user";
import {
	countryAccounts,
	CountryAccountStatus,
	countryAccountStatuses,
	countryAccountTypes,
	dtsSystemInfo,
} from "~/drizzle/schema";

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
	status: number = countryAccountStatuses.ACTIVE,
	countryAccountType: string = countryAccountTypes.OFFICIAL
) {
	const errors: string[] = [];
	if (!countryId) errors.push("Country is required");
	if (!status) errors.push("Status is required");
	if (!email) errors.push("Admin email is required");
	if (!countryAccountType) errors.push("Choose instance type");

	if (countryId && countryId === "-1") {
		errors.push("Please select a country");
	}

	if (status && Number(status) !== 1 && Number(status) !== 0) {
		errors.push("Please enter status valid value");
	}

	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString())) {
		errors.push("Please enter a valid email address");
	}

	if (
		countryAccountType !== countryAccountTypes.OFFICIAL &&
		countryAccountType !== countryAccountTypes.TRAINING
	) {
		errors.push("Invalide instance type");
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
		countryAccountType === countryAccountTypes.OFFICIAL &&
		(await countryAccountWithTypeExists(
			countryId,
			countryAccountTypes.OFFICIAL
		))
	) {
		errors.push("An official account already exists for this country.");
	}
	if (errors.length > 0) {
		throw new CountryAccountValidationError(errors);
	}

	// generate password
	const isPrimaryAdmin = true;
	return dr.transaction(async (tx) => {
		const countryAccount = await createCountryAccount(
			countryId,
			status,
			countryAccountType,
			tx
		);
		const adminUser = await createUser(
			email,
			"admin",
			isPrimaryAdmin,
			countryAccount.id,
			tx
		);

		const country = await getCountryById(countryId);
		if (!country) {
			errors.push(`Country with ID ${countryId} not found.`);
			throw new CountryAccountValidationError(errors);
		}
		const instanceSystemSetting = createInstanceSystemSetting(
			country.name,
			country.iso3 || "",
			countryAccount.id,
			tx
		);
		await sendInvite(adminUser, tx);
		return { countryAccount, adminUser, instanceSystemSetting };
	});
}

export async function updateCountryAccountStatusService(
	id: string,
	status: number
) {
	const countryAccount = await getCountryAccountById(id);
	if(!countryAccount){
		throw new CountryAccountValidationError([`Country accounts id:${id} does not exist`])
	}
	if(!Object.values(countryAccountStatuses).includes(status as CountryAccountStatus)){
		throw new CountryAccountValidationError([`Status: ${status} is not a valid value`])
	}

	const updatedCountryAccount = await updateCountryAccountStatus(id, status);
	return {updatedCountryAccount};
}
