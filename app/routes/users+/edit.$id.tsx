import { dr } from "~/db.server";
import {
	eq,
} from "drizzle-orm";

import {
	userTable
} from '~/drizzle/schema';

import {
	json,
} from "@remix-run/node";

import {
		useLoaderData,
		useActionData,
		Link
} from "@remix-run/react";

import {
	Form,
	Field,
	SubmitButton,
	FieldErrors,
	FormResponse
} from "~/frontend/form";

import {
	AdminUpdateUserFields,
	adminUpdateUser,
	adminUpdateUserFieldsFromMap,
} from "~/backend.server/models/user";

import {
	ValidRoles
} from "~/frontend/user/roles";


import {
	authLoaderWithRole,
	authActionWithRole,
} from "~/util/auth";

import { formStringData } from "~/util/httputil";

export const loader = authLoaderWithRole("EditUsers", async (loaderArgs) => {
	const { id } = loaderArgs.params;
	if (!id) {
		throw new Response("Missing item ID", { status: 400 });
	}

		const res = await dr.select().from(userTable).where(eq(userTable.id, Number(id)));

	if (!res || res.length === 0) {
		throw new Response("Item not found", { status: 404 });
	}

	const item = res[0];

	return json({
		data: {
			id: item.id,
			email: item.email,
			firstName: item.firstName,
			lastName: item.lastName,
			role: item.role,
		},
	});
})

type ActionResponse = FormResponse<AdminUpdateUserFields>

export const action = authActionWithRole("EditUsers", async (actionArgs) => {
	const { request, params } = actionArgs;
	const id = Number(params.id);
	if (!id) {
		throw new Response("Missing ID", { status: 400 });
	}
	const formData = formStringData(await request.formData());
	const data = adminUpdateUserFieldsFromMap(formData);
	const res = await adminUpdateUser(id, data);

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
	let fields: AdminUpdateUserFields
	const loaderData = useLoaderData<typeof loader>();
	fields = loaderData.data;
	let errors = {};
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok){
			errors = actionData.errors;
		}
	}
	return (<>
		<h2>Edit User</h2>
		<Form errors={errors}>
			<Field label="Email">
				<input type="email" name="email" defaultValue={fields.email} />
				<FieldErrors errors={errors} field="email"></FieldErrors>
			</Field>
			<Field label="First Name">
				<input type="text" name="firstName" defaultValue={fields.firstName} />
				<FieldErrors errors={errors} field="firstName"></FieldErrors>
			</Field>
			<Field label="Last Name">
				<input type="text" name="lastName" defaultValue={fields.lastName} />
				<FieldErrors errors={errors} field="lastName"></FieldErrors>
			</Field>
			<Field label="Role">
				<select name="role" defaultValue={fields.role}>
					<option value="" disabled>
					Select a role
					</option>
					{ValidRoles.map((role) => (
					<option key={role.id} value={role.id}>
						{role.label}
					</option>
					))}
					
				</select>
				<FieldErrors errors={errors} field="role"></FieldErrors>
			</Field>
				<SubmitButton label="Edit User" />
		</Form>
		<Link to="/users">Back to Users</Link>
	</>)
}
