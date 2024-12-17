import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";
import {resourceRepoDeleteById} from '~/backend.server/models/resource_repo';

import {
	route
} from "~/frontend/resource-repo/form";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: resourceRepoDeleteById
});

