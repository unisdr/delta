import {
	json,
} from "@remix-run/node";

import {
		useActionData,
} from "@remix-run/react";

import {
	DataFields,
	dataCreate
} from "~/.server/models/item";

import {
	DataForm,
	dataFieldsFromMap
} from "~/components/data/form";

import {
	FormResponse
} from "~/components/form";


import {
	authActionWithRole,
	authLoaderWithRole,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";
import {redirectWithMessage} from "~/util/session";

export const loader = authLoaderWithRole("EditData", async () => {
	return json(null);
})

type ActionResponse = FormResponse<DataFields>

export const action = authActionWithRole("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const formData = formStringData(await request.formData());
	const data = dataFieldsFromMap(formData);
	const res = await dataCreate( data);

	if (!res.ok){
		return json<ActionResponse>({
			ok: false,
			data: data,
			errors: res.errors
		})
	}
	return redirectWithMessage(request, "/data", {type:"info", text: "New record created"})
});


export default function Screen() {
	let fields = dataFieldsFromMap({})
	let errors = {};
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok){
			errors = actionData.errors;
		}
	}
	return DataForm({
		edit: false,
		fields: fields,
		errors: errors
	})
}
