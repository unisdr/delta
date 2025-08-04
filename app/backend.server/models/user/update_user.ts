import { dr } from "~/db.server";
import { and, eq, sql } from "drizzle-orm";

import { userCountryAccounts, userTable } from "~/drizzle/schema";

import { Errors, hasErrors } from "~/frontend/form";

import { errorIsNotUnique } from "~/util/db";

import { logAudit } from "./../auditLogs";

type AdminUpdateUserResult =
	| { ok: true; userId: number }
	| { ok: false; errors: Errors<AdminUpdateUserFields> };

export interface AdminUpdateUserFields {
	generatedSystemIdentifier: string;
	activated: any;
	dateAdded: any;
	addedBy: string;
	email: string;
	emailVerified: boolean;
	firstName: string;
	lastName: string;
	organization: string;
	role: string;
}

export function adminUpdateUserFieldsFromMap(data: {
	[key: string]: string;
}): AdminUpdateUserFields {
	const fields: (keyof AdminUpdateUserFields)[] = [
		"email",
		"firstName",
		"lastName",
		"organization",
		"role",
	];
	return Object.fromEntries(
		fields.map((field) => [field, data[field] || ""])
	) as unknown as AdminUpdateUserFields;
}

export async function adminUpdateUser(
	id: number,
	fields: AdminUpdateUserFields,
	userId: number,
	countryAccountsId: string
): Promise<AdminUpdateUserResult> {
	let errors: Errors<AdminUpdateUserFields> = {};
	errors.form = [];
	errors.fields = {};
	if (fields.email == "") {
		errors.fields.email = ["Email is empty"];
	}
	if (fields.firstName == "") {
		errors.fields.firstName = ["First name is empty"];
	}
	if (fields.role == "") {
		errors.fields.role = ["Role is required"];
	}

	if (hasErrors(errors)) {
		return { ok: false, errors };
	}

	const oldRecord = await dr
		.select()
		.from(userTable)
		.where(eq(userTable.id, id));

	let updatedUser = null;
	let updatedUserCountryAccounts = null;
	try {
		await dr.transaction(async (tx) => {
			updatedUser = await tx
				.update(userTable)
				.set({
					email: fields.email,
					firstName: fields.firstName,
					lastName: fields.lastName,
					organization: fields.organization,
					updatedAt: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(userTable.id, id))
				.returning();

			updatedUserCountryAccounts = await tx
				.update(userCountryAccounts)
				.set({
					role: fields.role,
				})
				.where(
					and(
						eq(userCountryAccounts.userId, id),
						eq(userCountryAccounts.countryAccountsId, countryAccountsId)
					)
				)
				.returning();

			await logAudit({
				tableName: "user",
				recordId: oldRecord[0].id + "",
				userId: userId,
				action: "Update user data",
				oldValues: oldRecord[0],
				newValues: updatedUser[0],
				tx,
			});
		});

		if (!updatedUser) {
			errors.form.push("User was not found using provided ID.");
			return { ok: false, errors };
		}
		if (!updatedUserCountryAccounts) {
			errors.form.push("User is not assign to your country accounts.");
			return { ok: false, errors };
		}
	} catch (e: any) {
		if (errorIsNotUnique(e, "user", "email")) {
			errors.fields.email = ["A user with this email already exists"];
			return { ok: false, errors };
		}
		throw e;
	}

	return { ok: true, userId: id };
}
