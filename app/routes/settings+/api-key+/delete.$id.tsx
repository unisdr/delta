import {
	createDeleteLoaderWithPerm,
} from "~/backend.server/handlers/form";
import {apiKeyDelete} from '~/backend.server/models/api_key';

import {
	route
} from "~/frontend/api_key";

export const loader = createDeleteLoaderWithPerm("EditAPIKeys", {
	baseRoute: route,
	delete: apiKeyDelete,
});

