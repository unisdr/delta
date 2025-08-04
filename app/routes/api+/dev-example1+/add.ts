import { ActionFunctionArgs } from "@remix-run/server-runtime";
import { jsonCreate } from "~/backend.server/handlers/form/form_api";
import { apiAuth } from "~/backend.server/models/api_key";
import {
	devExample1Create,
	DevExample1Fields,
	fieldsDefApi,
} from "~/backend.server/models/dev_example1";
import { SelectDevExample1 } from "~/drizzle/schema";
import { FormInputDef } from "~/frontend/form";

export const loader = async () => {
	return Response.json("Use POST");
};

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	if (request.method !== "POST") {
		throw new Response("Method Not Allowed: Only POST requests are supported", {
			status: 405,
		});
	}

	const apiKey = await apiAuth(request);
	const countryAccountsId = apiKey.countryAccountsId;
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}

	let data: SelectDevExample1[] = await request.json();
	data = data.map((item) => ({
		...item,
		countryAccountsId: countryAccountsId,
	}));
	let fieldsDef: FormInputDef<DevExample1Fields>[] = [
		...(await fieldsDefApi()),
		{ key: "countryAccountsId", label: "", type: "text" },
	];
	const saveRes = await jsonCreate({
		data,
		fieldsDef: fieldsDef,
		create: devExample1Create,
	});

	return Response.json(saveRes);
};
