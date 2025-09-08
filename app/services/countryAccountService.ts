import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import {
	sendInviteForExistingCountryAccountAdminUser,
	sendInviteForNewCountryAccountAdminUser,
} from "~/backend.server/models/user/invite";
import { dr } from "~/db.server";
import { getCountryById } from "~/db/queries/countries";
import {
	countryAccountWithTypeExists,
	createCountryAccount,
	getCountryAccountWithCountryById,
	updateCountryAccount,
} from "~/db/queries/countryAccounts";
import { createInstanceSystemSetting } from "~/db/queries/instanceSystemSetting";
import { createUser, getUserByEmail, updateUserInviteCodeAndInviteExpirationByUserId } from "~/db/queries/user";
import { createUserCountryAccounts } from "~/db/queries/userCountryAccounts";
import {
	CountryAccountStatus,
	countryAccountStatuses,
	countryAccountTypes,
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
	shortDescription: string,
	email: string,
	status: number = countryAccountStatuses.ACTIVE,
	countryAccountType: string = countryAccountTypes.OFFICIAL,
	request: Request
) {
	const errors: string[] = [];
	if (!countryId) errors.push("Country is required");
	if (status === null || status === undefined)
		errors.push("Status is required");
	if (!email || email.trim() === "") errors.push("Admin email is required");
	if (!shortDescription || shortDescription.trim() === "")
		errors.push("Short description is required");
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

	const isPrimaryAdmin = true;
	return dr.transaction(async (tx) => {
		const countryAccount = await createCountryAccount(
			countryId,
			status,
			countryAccountType,
			shortDescription,
			tx
		);
		let isNewUser = false;
		let user = await getUserByEmail(email);
		if (!user) {
			isNewUser = true;
			user = await createUser(email, tx);
		}
		const role = "admin";
		await createUserCountryAccounts(
			user.id,
			countryAccount.id,
			role,
			isPrimaryAdmin,
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
		const url = new URL(request.url);
		const baseUrl = `${url.protocol}//${url.host}`;

		if (isNewUser) {
			const inviteCode = randomBytes(32).toString("hex");
			const expirationTime = addHours(new Date(), 7 * 24);

			updateUserInviteCodeAndInviteExpirationByUserId(user.id, inviteCode,expirationTime, tx);
			await sendInviteForNewCountryAccountAdminUser(
				user,
				baseUrl,
				"Disaster Tracking System",
				role,
				country.name,
				countryAccountType,
				inviteCode
			);
		} else {
			await sendInviteForExistingCountryAccountAdminUser(
				user,
				baseUrl,
				"Disaster Tracking System",
				"Admin",
				country.name,
				countryAccountType
			);
		}
		return { countryAccount, user, instanceSystemSetting };
	});
}

export async function updateCountryAccountStatusService(
	id: string,
	status: number,
	shortDescription: string
) {
	const countryAccount = await getCountryAccountWithCountryById(id);
	if (!countryAccount) {
		throw new CountryAccountValidationError([
			`Country accounts id:${id} does not exist`,
		]);
	}
	if (
		!Object.values(countryAccountStatuses).includes(
			status as CountryAccountStatus
		)
	) {
		throw new CountryAccountValidationError([
			`Status: ${status} is not a valid value`,
		]);
	}

	const updatedCountryAccount = await updateCountryAccount(
		id,
		status,
		shortDescription
	);
	return { updatedCountryAccount };
}
