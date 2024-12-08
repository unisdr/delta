import {
	authLoaderApi
} from "~/util/auth";

export const loader = authLoaderApi(async () => {
	return {msg: "Hi"};
});


