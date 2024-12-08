import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";
import {apiKeyDelete} from '~/backend.server/models/api_key';

import {
	route
} from "~/frontend/api_key";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: apiKeyDelete,
});

