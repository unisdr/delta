import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
	CountryAccountWithCountry,
	getCountryAccounts,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { requireSuperAdmin } from "~/util/auth";
import { useState } from "react";
import Dialog from "~/components/Dialog";
import { getCountries } from "~/db/queries/countries";
import { Country } from "~/drizzle/schema";

export const loader: LoaderFunction = async ({ request }) => {
	// await requireSuperAdmin(request);
	const countryAccounts = await getCountryAccounts();
	const countries = await getCountries();

	return { countryAccounts, countries };
};

export default function CountryAccounts() {
	const { countryAccounts, countries } = useLoaderData<{
		countryAccounts: CountryAccountWithCountry[];
		countries: Country[];
	}>();
	const [isAddCountryAccountDialogOpen, setIsAddCountryAccountDialogOpen] =
		useState(false);

	const footerContent = (
		<>
			<button
				type="button"
				className="mg-button mg-button-primary"
				onClick={() => console.log("Saving...")}
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
						onClick={() => setIsAddCountryAccountDialogOpen(true)}
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
				<div className="dts-form__body">
					<div className="dts-form-component">
						<label>
							<div className="dts-form-component__label">
								<span>Country</span>
							</div>
							<select>
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
							<select>
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
								aria-label="main admin's email"
								placeholder="Enter email"
							></input>
						</label>
						<label>
							<div className="dts-form-component__label">
								<span>Password</span>
							</div>
							<input
								type="password"
								aria-label="main admin's password"
								placeholder="Enter password"
							></input>
						</label>
					</div>
				</div>
			</Dialog>
		</MainContainer>
	);
}
