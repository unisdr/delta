import {
	devExample1ById,
	devExample1ByIdTx,
	devExample1Create,
	devExample1UpdateById,
	fieldsDef,
} from "~/backend.server/models/dev_example1";

import { DevExample1Form, route } from "~/frontend/dev_example1";

import { formScreen } from "~/frontend/form";

import { useLoaderData } from "@remix-run/react";
import {
	ActionFunction,
	ActionFunctionArgs,
	LoaderFunction,
	LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import { getTableName } from "drizzle-orm";
import {
	createLoader,
	createOrUpdateAction,
} from "~/backend.server/handlers/form/form";
import { devExample1Table } from "~/drizzle/schema";
import { getCountryAccountsIdFromSession } from "~/util/session";

export const action: ActionFunction = async (
	loaderArgs: ActionFunctionArgs
) => {
	const { request } = loaderArgs;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return createOrUpdateAction({
		fieldsDef,
		create: devExample1Create,
		update: devExample1UpdateById,
		getById: devExample1ByIdTx,
		redirectTo: (id) => `${route}/${id}`,
		tableName: getTableName(devExample1Table),
		action: (isCreate) =>
			isCreate ? "Create dev-example1" : "Update dev-example1",
		countryAccountsId,
	})(loaderArgs);
};

export const loader: LoaderFunction = async (args: LoaderFunctionArgs) => {
	const { request } = args;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (!countryAccountsId) {
		throw new Response("No instance selected", { status: 401 });
	}
	const result = createLoader({
		getById: devExample1ById,
		extra: async () => {
			return { fieldsDef: await fieldsDef() };
		},
	})(args);

	const item = (await result).item;
	if (item && item.countryAccountsId !== countryAccountsId) {
		throw new Response("unauthorized", { status: 401 });
	}
	return result;
};

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let fieldsInitial = ld.item ? { ...ld.item } : {};

	return formScreen({
		extraData: {
			fieldDef: ld.fieldsDef,
		},
		fieldsInitial,
		form: DevExample1Form,
		edit: !!ld.item,
		id: ld.item?.id || null,
	});
}
