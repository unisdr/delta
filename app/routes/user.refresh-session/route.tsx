import { json } from "@remix-run/node";

import {
	authLoader
} from "~/util/auth";

export const loader = authLoader(async () => {
	return json(null);
});


