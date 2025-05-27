import {
	authLoader
} from "~/util/auth";

export const loader = authLoader(async () => {
	return null;
});


