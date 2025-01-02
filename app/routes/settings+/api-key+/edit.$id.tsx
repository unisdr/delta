import {
	apiKeyCreate,
	apiKeyUpdate,
	apiKeyById,
} from "~/backend.server/models/api_key";

import {
	fieldsDef,
	ApiKeyForm,
} from "~/frontend/api_key";

import {
	FormScreen,
} from "~/frontend/form";

import {
	createLoader,
	formSave
} from "~/backend.server/handlers/form";

import {
	route
} from "~/frontend/api_key";
import {authActionGetAuth, authActionWithPerm} from "~/util/auth";

export const loader = createLoader({
	getById: apiKeyById
});

export const action = authActionWithPerm("EditAPIKeys", async (actionArgs) => {
	const auth = authActionGetAuth(actionArgs);

	return formSave({
		actionArgs,
		fieldsDef: fieldsDef,
		save: async (tx, id, data) => {
			if (!id) {
				data.managedByUserId = auth.user.id
				return apiKeyCreate(tx, data);
			} else {
				return apiKeyUpdate(tx, id, data);
			}
		},
		redirectTo: (id) => `${route}/${id}`
	});
});


export default function Screen() {
	return FormScreen({
		fieldsDef: fieldsDef,
		formComponent: ApiKeyForm,
	});
}

