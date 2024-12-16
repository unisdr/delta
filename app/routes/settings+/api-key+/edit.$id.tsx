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
import {authActionGetAuth, authActionWithRole} from "~/util/auth";

export const loader = createLoader({
	getById: apiKeyById
});

export const action = authActionWithRole("EditData", async (actionArgs) => {
	const auth = authActionGetAuth(actionArgs);

	return formSave({
		actionArgs,
		fieldsDef: fieldsDef,
		save: async (id, data) => {
			if (!id) {
				data.managedByUserId = auth.user.id
				return apiKeyCreate(data);
			} else {
				return apiKeyUpdate(id, data);
			}
		},
		redirectTo: (id) => `${route}/${id}`
	});
});


export default function Screen() {
	const formScreen = FormScreen({
		fieldsDef: fieldsDef,
		formComponent: ApiKeyForm,
	});

	return (<>
		<div className="dts-page-header">
			<header className="dts-page-title">
				<div className="mg-container">
					<h1 className="dts-heading-1">API Keys</h1>
				</div>
			</header>
		</div>
		<section>
			<div className="mg-container">
				{formScreen}
			</div>
		</section>
	</>);
}

