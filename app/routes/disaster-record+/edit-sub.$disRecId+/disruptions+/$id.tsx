import {
	disruptionById,
} from "~/backend.server/models/disruption"

import {
	DisruptionView,
} from "~/frontend/disruption"

import {useLoaderData} from "@remix-run/react"
import {authLoaderWithPerm} from "~/util/auth";
import {getItem2} from "~/backend.server/handlers/view";

import {
	getFieldsDefView
} from "~/backend.server/models/disruption"

export const loader = authLoaderWithPerm("ViewData", async (loaderArgs) => {
	const {params} = loaderArgs;
	const item = await getItem2(params, disruptionById);
	if (!item) {
		throw new Response("Not Found", {status: 404});
	}
	return {item, fieldDef: await getFieldsDefView() };
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	return <DisruptionView fieldDef={ld.fieldDef} item={ld.item} />;
}


