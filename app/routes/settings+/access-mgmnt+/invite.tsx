import {
	json,
} from "@remix-run/node";

import {
	useLoaderData,
	useActionData,
	Link
} from "@remix-run/react";
import {useState} from "react";

import {
	adminInviteUser,
	AdminInviteUserFields,
	adminInviteUserFieldsFromMap,
} from "~/backend.server/models/user";

import {
	Form,
	Field,
	FormResponse,
	FieldErrors,
	SubmitButton
} from "~/frontend/form";
import {ValidRoles} from "~/frontend/user/roles";

import {
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/util/auth";

import {formStringData} from "~/util/httputil";
import {redirectWithMessage} from "~/util/session";
import {NavSettings} from "~/routes/settings/nav";
import {MainContainer} from "~/frontend/container";

export const loader = authLoaderWithPerm("InviteUsers", async () => {
	return {
		data: adminInviteUserFieldsFromMap({})
	}
})

type ActionResponse = FormResponse<AdminInviteUserFields>

export const action = authActionWithPerm("InviteUsers", async (actionArgs) => {
	const {request} = actionArgs;
	const formData = formStringData(await request.formData());
	const data = adminInviteUserFieldsFromMap(formData);
	const res = await adminInviteUser(data);

	if (!res.ok) {
		return json<ActionResponse>({
			ok: false,
			data: data,
			errors: res.errors
		})
	}
	return redirectWithMessage(request, "/users", {type: "info", text: "New record created"})
});

export default function Screen() {
	let fields: AdminInviteUserFields
	const loaderData = useLoaderData<typeof loader>();
	fields = loaderData.data;
	let errors = {};
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			errors = actionData.errors;
		}
	}

	const [selectedRole, setSelectedRole] = useState(fields.role);

	const roleDesc = ValidRoles.find((role) => role.id === selectedRole)?.desc || "";

	return (<MainContainer
		title="Access management"
		headerExtra={<NavSettings />}
	>
		<>
			<h2>Add User</h2>
			<Form errors={errors}>
				<Field label="First Name">
					<input type="text" name="firstName" defaultValue={fields.firstName} />
					<FieldErrors errors={errors} field="firstName"></FieldErrors>
				</Field>
				<Field label="Last Name">
					<input type="text" name="lastName" defaultValue={fields.lastName} />
					<FieldErrors errors={errors} field="lastName"></FieldErrors>
				</Field>
				<Field label="Email">
					<input type="email" name="email" defaultValue={fields.email} />
					<FieldErrors errors={errors} field="email"></FieldErrors>
				</Field>
				<Field label="Organization">
					<input type="text" name="organization" defaultValue={fields.organization} />
					<FieldErrors errors={errors} field="organization"></FieldErrors>
				</Field>
				<Field label="Hydro-met CHE user">
					<input type="checkbox" name="hydrometCheUser" defaultChecked={fields.hydrometCheUser} />
					<FieldErrors errors={errors} field="hydrometCheUser"></FieldErrors>
				</Field>
				<Field label="Role">
					<select
						name="role"
						value={selectedRole}
						onChange={(e) => setSelectedRole(e.target.value)}
					>
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

				<div>
					<p>You have selected: {selectedRole || "No role selected"}</p>
					{roleDesc && <p>{roleDesc}</p>}
				</div>

				<SubmitButton className="mg-button mg-button-primary" label="Add user" />
			</Form>
			<Link to="/settings/access-mgmnt">Discard</Link>

		</>
	</MainContainer>)
}

