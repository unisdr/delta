import {
	json,
} from "@remix-run/node";

import {
		useLoaderData,
		useActionData,
} from "@remix-run/react";

import {
	FormResponse
} from "~/components/form";

import {
	DataFields,
	dataUpdate
} from "~/backend.server/models/item";

import {
	DataForm,
	dataFieldsFromMap
} from "~/components/data/form";

import { prisma } from "~/db.server";

import {
	authLoaderWithRole,
	authActionWithRole,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";

export const loader = authLoaderWithRole("EditData", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}
	const item = await prisma.item.findUnique({
		where: { id: Number(id) },
	});
	if (!item) {
		throw new Response("Item not found", { status: 404 });
	}
	return json({
		data: {
			id: item.id,
			field1: item.field1,
			field2: item.field2,
		},
	});
})

type ActionResponse = FormResponse<DataFields>

export const action = authActionWithRole("EditData", async (actionArgs) => {
	const { request, params } = actionArgs;
	const id = Number(params.id);
	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}
	const formData = formStringData(await request.formData());
	const data = dataFieldsFromMap(formData);
	const res = await dataUpdate(id, data);

	if (!res.ok){
		return json<ActionResponse>({
			ok: false,
			data: data,
			errors: res.errors
		})
	}
	return json<ActionResponse>({
		ok: true,
		data: data,
	})
});

export default function Screen() {
	let fields: DataFields
	const loaderData = useLoaderData<typeof loader>();
	fields = loaderData.data;
	let errors = {};
	let changed = false;
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok){
			errors = actionData.errors;
		} else {
			changed = true;
		}
	}

	const dataForm = DataForm({
		edit: true,
		fields: fields,
		errors: errors
	})

	return (
		<>
		{changed ? <p>The data was updated.</p> : null}
		{dataForm}
		</>
	)

}

