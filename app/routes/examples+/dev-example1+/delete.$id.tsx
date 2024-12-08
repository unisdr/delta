import {
	createDeleteLoader,
} from "~/backend.server/handlers/form";
import {devExample1DeleteById} from '~/backend.server/models/dev_example1';

import {
	route
} from "~/frontend/dev_example1";

export const loader = createDeleteLoader({
	baseRoute: route,
	delete: devExample1DeleteById
});

