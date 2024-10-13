import {
	ActionFunctionArgs,
	json,
	redirect
} from "@remix-run/node";
import {
	useActionData,
} from "@remix-run/react";
import {
	Form,
	Field,
	Errors as FormErrors,
	SubmitButton,
	FieldErrors,
	FormMessage
} from "~/components/form"
import { login } from "~/util/auth"
import { formStringData } from "~/util/httputil";
import { resetPasswordSilentIfNotFound } from "~/components/user/model";

interface FormFields {
	email: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = formStringData(await request.formData());
	let data: FormFields = {
		email: formData.email || ""
	}

	let errors: FormErrors<FormFields> = {}

	if (!data.email){
		errors = {
		fields: {
			email: ["Email is required"],
		}
	}
	return json({ data, errors })
	}


	// do not show an error message if the email is not found in the database
	await resetPasswordSilentIfNotFound(data.email);


	return json({ data, errors });
};

export const loader = async () => {
	return json(null);
};

export default function Screen() {
	const actionData = useActionData<typeof action>();
	const errors = actionData?.errors
	const data = actionData?.data

	return (
		<>
			<Form errors={errors}>

			{data?.email ? (
				<FormMessage>
				<p>Password reminder sent to {data.email}</p>
				</FormMessage>
			) : null}

				<Field label="Email">
					<input type="email" name="email"></input>
					<FieldErrors errors={errors} field="email"></FieldErrors>
				</Field>
				<SubmitButton label="Reset Password"></SubmitButton>
			</Form>
		</>
	);
}
