import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigate,
} from "@remix-run/react";
import {
	CountryAccountWithCountry,
	getCountryAccounts,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { requireSuperAdmin } from "~/util/auth";
import { useEffect, useRef, useState } from "react";
import Dialog from "~/components/Dialog";
import { getCountries } from "~/db/queries/countries";
import { Country } from "~/drizzle/schema";
import {
	CountryAccountValidationError,
	createCountryAccountService,
} from "~/services/countryAccountService";
import Messages from "~/components/Messages";

export const loader: LoaderFunction = async ({ request }) => {
	await requireSuperAdmin(request);
	const countryAccounts = await getCountryAccounts();
	const countries = await getCountries();

	return { countryAccounts, countries };
};

export const action: ActionFunction = async ({ request }) => {
	await requireSuperAdmin(request);

	const formData = await request.formData();
	const countryId = formData.get("countryId") as string;
	const status = formData.get("status");
	const email = formData.get("email") as string;

	try {
		await createCountryAccountService(countryId, email, Number(status));
	} catch (error) {
		if (error instanceof CountryAccountValidationError) {
			return {
				errors: error.errors,
				formValues: { countryId, status, email },
			};
		}
		return {
			errors: ["An unexpected error occured"],
			formValues: { countryId, status, email },
		};
	}

	return { success: true };
};

export default function CountryAccounts() {
	const { countryAccounts, countries } = useLoaderData<{
		countryAccounts: CountryAccountWithCountry[];
		countries: Country[];
	}>();
	const actionData = useActionData<{ errors?: string[]; success?: boolean }>();
	const [isAddCountryAccountDialogOpen, setIsAddCountryAccountDialogOpen] =
		useState(false);
	const formRef = useRef<HTMLFormElement>(null);
	const navigate = useNavigate();

	function resetForm() {
		if (formRef.current) {
			formRef.current.reset();
		}
		navigate(".", { replace: true });
	}

	function addCountryAccount() {
		resetForm();
		setIsAddCountryAccountDialogOpen(true);
	}

	useEffect(() => {
		if (actionData?.success) {
			setIsAddCountryAccountDialogOpen(false);
			resetForm();
		}
	}, [actionData, navigate]);

	const footerContent = (
		<>
			<button
				type="submit"
				form="addCountryAccountForm"
				className="mg-button mg-button-primary"
			>
				Save
			</button>
			<button
				type="button"
				className="mg-button mg-button-outline"
				onClick={() => setIsAddCountryAccountDialogOpen(false)}
			>
				Cancel
			</button>
		</>
	);

	return (
		<MainContainer
			title="Manage Country Accounts"
			headerExtra={<NavSettings />}
		>
			<div className="dts-page-intro">
				<div className="dts-external-links">
					<button
						className="mg-button mg-button-secondary"
						onClick={() => addCountryAccount()}
					>
						Add Country Account
					</button>
				</div>
			</div>
			<table className="dts-table">
				<thead>
					<tr>
						<th>Country</th>
						<th>Status</th>
						<th>Created At</th>
						<th>Modified At</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{countryAccounts.map((countryAccount) => (
						<tr key={countryAccount.id}>
							<td>{countryAccount.country.name}</td>
							<td>{countryAccount.status === 1 ? "Active" : "Inactive"}</td>
							<td>{new Date(countryAccount.createdAt).toLocaleString()}</td>
							<td>
								{countryAccount.updatedAt
									? new Date(countryAccount.updatedAt).toLocaleString()
									: ""}
							</td>
							<td>
								<button
									onClick={() => {}}
									className="mg-button mg-button-table"
								>
									<svg
										aria-hidden="true"
										focusable="false"
										role="img"
										style={{ marginLeft: "4px" }}
									>
										<use href="/assets/icons/edit.svg#edit"></use>
									</svg>
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Add country accounts modal */}
			<Dialog
				visible={isAddCountryAccountDialogOpen}
				header="Create Country Account"
				onClose={() => setIsAddCountryAccountDialogOpen(false)}
				footer={footerContent}
			>
				<Form
					method="post"
					id="addCountryAccountForm"
					className="dts-form"
					ref={formRef}
				>
					{/* Add error message display here */}
					{actionData?.errors && (
						<Messages header="Errors" messages={actionData.errors} />
					)}
					<div className="dts-form__body">
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Country</span>
								</div>
								<select name="countryId">
									<option key="-1" value="-1">
										Select a country
									</option>
									{countries.map((country) => (
										<option key={country.id} value={country.id}>
											{country.name}
										</option>
									))}
								</select>
							</label>
							<label>
								<div className="dts-form-component__label">
									<span>Status</span>
								</div>
								<select name="status">
									<option key={1} value={1}>
										Active
									</option>
									<option key={0} value={0}>
										Inactive
									</option>
								</select>
							</label>
							<label>
								<div className="dts-form-component__label">
									<span>Admin's email</span>
								</div>
								<input
									type="text"
									name="email"
									aria-label="main admin's email"
									placeholder="Enter email"
								></input>
							</label>
						</div>
					</div>
				</Form>
			</Dialog>
		</MainContainer>
	);
}
