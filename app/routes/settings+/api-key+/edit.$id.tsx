import {
	apiKeyCreate,
	apiKeyUpdate,
	apiKeyById,
} from "~/backend.server/models/api_key";

import { fieldsDef, ApiKeyForm } from "~/frontend/api_key";

import { FormScreen } from "~/frontend/form";

import { createLoader, formSave } from "~/backend.server/handlers/form/form";

import { route } from "~/frontend/api_key";
import { authActionGetAuth, authActionWithPerm } from "~/util/auth";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const loader = createLoader({
	getById: apiKeyById,
});

export const action = authActionWithPerm("EditAPIKeys", async (actionArgs) => {
	const auth = authActionGetAuth(actionArgs);
	const { request } = actionArgs;

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave({
		actionArgs,
		fieldsDef: fieldsDef,
		save: async (tx, id, data) => {
			if (!id) {
				data.managedByUserId = auth.user.id;
				data.countryAccountsId = countryAccountsId
				return apiKeyCreate(tx, data);
			} else {
				return apiKeyUpdate(tx, id, data);
			}
		},
		redirectTo: (id) => `${route}/${id}`,
	});
});

export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: ApiKeyForm,
	});
}
