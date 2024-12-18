import {
	ResourceRepoView,
} from "~/frontend/resource-repo/form";

import {
	createViewLoaderPublicApproved,
} from "~/backend.server/handlers/form";

import {
	ViewScreenPublicApproved
} from "~/frontend/form";
import {resourceRepoById} from "~/backend.server/models/resource_repo";

export const loader = createViewLoaderPublicApproved({
	getById: resourceRepoById
});

export default function Screen() {
	return ViewScreenPublicApproved({
		viewComponent: ResourceRepoView
	})
}
