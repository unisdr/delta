import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useNavigate,
	MetaFunction,
} from "@remix-run/react";
import {
	CountryAccountWithCountryAndPrimaryAdminUser,
	getCountryAccountsWithUserCountryAccountsAndUser,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { authLoaderWithPerm, authActionWithPerm } from "~/util/auth";
import { useEffect, useRef, useState } from "react";
import Dialog from "~/components/Dialog";
import { getCountries } from "~/db/queries/countries";
import {
	SelectCountries,
	CountryAccountStatus,
	countryAccountStatuses,
	CountryAccountType,
	countryAccountTypes,
} from "~/drizzle/schema";
import {
	CountryAccountValidationError,
	createCountryAccountService,
	updateCountryAccountStatusService,
} from "~/services/countryAccountService";
import Messages from "~/components/Messages";
import { RadioButton } from "~/components/RadioButton";
import { Fieldset } from "~/components/FieldSet";
import Tag from "~/components/Tag";
import { Toast, ToastRef } from "~/components/Toast";

export const meta: MetaFunction = () => {
	return [
		{ title: "Country Accounts - Super Admin - DELTA Resilience" },
		{
			name: "description",
			content: "Super Admin Country Accounts Management.",
		},
	];
};

export const loader: LoaderFunction = authLoaderWithPerm(
	"manage_country_accounts",
	async () => {
		const countryAccounts =
			await getCountryAccountsWithUserCountryAccountsAndUser();
		const countries = await getCountries();

		return { countryAccounts, countries };
	}
);

export const action: ActionFunction = authActionWithPerm(
	"manage_country_accounts",
	async ({ request }) => {
		const formData = await request.formData();
		const countryId = formData.get("countryId") as string;
		const status = formData.get("status");
		const email = formData.get("email") as string;
		const shortDescription = formData.get("shortDescription") as string;
		const countryAccountType = formData.get("countryAccountType") as string;
		const id = formData.get("id") as string;

		try {
			if (id) {
				// Update existing account
				await updateCountryAccountStatusService(
					id,
					Number(status),
					shortDescription
				);
				return { success: true, operation: "update" };
			} else {
				// Create new account
				await createCountryAccountService(
					countryId,
					shortDescription,
					email,
					Number(status),
					countryAccountType,
					request
				);
				return { success: true, operation: "create" };
			}
		} catch (error) {
			let errors = {};
			if (error instanceof CountryAccountValidationError) {
				errors = { errors: error.errors };
			} else {
				errors = { errors: ["An unexpected error occured"] };
				console.log(error);
			}
			return {
				...errors,
				formValues: { id, countryId, status, email, countryAccountType },
			};
		}
	}
);

export default function CountryAccounts() {
	const { countryAccounts, countries } = useLoaderData<{
		countryAccounts: CountryAccountWithCountryAndPrimaryAdminUser[];
		countries: SelectCountries[];
	}>();
	const actionData = useActionData<{
		errors?: string[];
		success?: boolean;
		formValues?: {
			id?: string;
			countryId: string;
			status: string;
			email: string;
			countryAccountType: string;
		};
		operation?: string;
	}>();

	const [editingCountryAccount, setEditingCountryAccount] =
		useState<CountryAccountWithCountryAndPrimaryAdminUser | null>(null);
	const [selectedCountryId, setSelectedCountryId] = useState("-1");
	const [type, setType] = useState<CountryAccountType>(
		countryAccountTypes.OFFICIAL
	);
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<CountryAccountStatus>(
		countryAccountStatuses.ACTIVE
	);
	const [shortDescription, setShortDescription] = useState("");

	const [isAddCountryAccountDialogOpen, setIsAddCountryAccountDialogOpen] =
		useState(false);

	const formRef = useRef<HTMLFormElement>(null);
	const navigate = useNavigate();
	const toast = useRef<ToastRef>(null);

	function addCountryAccount() {
		resetForm();
		setIsAddCountryAccountDialogOpen(true);
	}

	function editCountryAccount(
		countryAccount: CountryAccountWithCountryAndPrimaryAdminUser
	) {
		if (formRef.current) {
			formRef.current.reset();
		}
		navigate(".", { replace: true });
		setEditingCountryAccount(countryAccount);
		setSelectedCountryId(countryAccount.country.id);
		setStatus(countryAccount.status as CountryAccountStatus);
		setType(countryAccount.type as CountryAccountType);
		setEmail(countryAccount.userCountryAccounts[0].user.email);
		setShortDescription(countryAccount.shortDescription);
		setIsAddCountryAccountDialogOpen(true);
	}

	function resetForm() {
		if (formRef.current) {
			formRef.current.reset();
		}
		setEditingCountryAccount(null);
		setSelectedCountryId("-1");
		setStatus(countryAccountStatuses.ACTIVE);
		setType(countryAccountTypes.OFFICIAL);
		setEmail("");
		setShortDescription("");
		navigate(".", { replace: true });
	}

	useEffect(() => {
		if (actionData?.success) {
			setIsAddCountryAccountDialogOpen(false);
			resetForm();

			if (toast.current) {
				toast.current.show({
					severity: "info",
					summary: "Success",
					detail:
						actionData.operation === "update"
							? "Country account updated successfully"
							: "Country account created successfully",
				});
			}
		}
	}, [actionData, navigate, editingCountryAccount]);

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
			title="Manage Country Accounts - Super Admin"
			headerExtra={<NavSettings />}
		>
			<div className="card flex justify-content-center">
				<Toast ref={toast} />
			</div>
			<div className="dts-page-intro" style={{ paddingRight: 0 }}>
				<div className="dts-additional-actions">
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
						<th>Short Description</th>
						<th>Status</th>
						<th>Type</th>
						<th>Primary Admin's Email</th>
						<th>Created At</th>
						<th>Modified At</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{countryAccounts.map((countryAccount) => (
						<tr key={countryAccount.id}>
							<td>{countryAccount.country.name}</td>
							<td>{countryAccount.shortDescription}</td>
							<td>
								{countryAccount.status === countryAccountStatuses.ACTIVE
									? "Active"
									: "Inactive"}
							</td>
							<td>
								{countryAccount.type === countryAccountTypes.OFFICIAL ? (
									<Tag value={countryAccount.type} />
								) : (
									<Tag value={countryAccount.type} severity="warning" />
								)}
							</td>
							<td>{countryAccount.userCountryAccounts[0].user.email}</td>
							<td>{new Date(countryAccount.createdAt).toLocaleString()}</td>
							<td>
								{countryAccount.updatedAt
									? new Date(countryAccount.updatedAt).toLocaleString()
									: ""}
							</td>
							<td>
								<button
									onClick={() => {
										editCountryAccount(countryAccount);
									}}
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

			{/* Add/Edit country accounts modal */}
			<Dialog
				visible={isAddCountryAccountDialogOpen}
				header={
					editingCountryAccount
						? "Edit Country Account"
						: "Create Country Account"
				}
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
						<input
							type="hidden"
							name="id"
							value={editingCountryAccount?.id || ""}
						/>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Country</span>
								</div>
								<select
									name="countryId"
									value={selectedCountryId}
									onChange={(e) => setSelectedCountryId(e.target.value)}
									disabled={editingCountryAccount?.id ? true : false}
								>
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
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Short Description</span>
								</div>
								<input
									type="text"
									name="shortDescription"
									aria-label="short description"
									placeholder="Max 20 characters"
									maxLength={20}
									value={shortDescription}
									onChange={(e) => setShortDescription(e.target.value)}
								></input>
							</label>
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Status</span>
								</div>
								<select
									name="status"
									value={status}
									onChange={(e) =>
										setStatus(Number(e.target.value) as CountryAccountStatus)
									}
								>
									<option
										key={countryAccountStatuses.ACTIVE}
										value={countryAccountStatuses.ACTIVE}
									>
										Active
									</option>
									<option
										key={countryAccountStatuses.INACTIVE}
										value={countryAccountStatuses.INACTIVE}
									>
										Inactive
									</option>
								</select>
							</label>
						</div>
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
									<span>Admin's email</span>
								</div>
								<input
									type="text"
									name="email"
									aria-label="main admin's email"
									placeholder="Enter email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={editingCountryAccount?.id ? true : false}
								></input>
							</label>
						</div>
						<div className="dts-form-component">
							<Fieldset
								legend="Choose Instance Type"
								disabled={editingCountryAccount?.id ? true : false}
							>
								<div className="dts-form-component__field--horizontal">
									<RadioButton
										inputId="type1"
										name="countryAccountType"
										value={countryAccountTypes.OFFICIAL}
										onChange={(e) => setType(e.value as CountryAccountType)}
										checked={
											type === countryAccountTypes.OFFICIAL ||
											editingCountryAccount?.type ===
												countryAccountTypes.OFFICIAL
										}
										label="Official"
									/>

									<RadioButton
										inputId="type2"
										name="countryAccountType"
										value={countryAccountTypes.TRAINING}
										onChange={(e) => setType(e.value as CountryAccountType)}
										checked={
											type === countryAccountTypes.TRAINING ||
											editingCountryAccount?.type ===
												countryAccountTypes.TRAINING
										}
										label="Training"
									/>
								</div>
							</Fieldset>
						</div>
					</div>
				</Form>
			</Dialog>
		</MainContainer>
	);
}
