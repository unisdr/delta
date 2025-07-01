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

export const loader: LoaderFunction = async ({ request }) => {
	await requireSuperAdmin(request);
	const countryAccounts = await getCountryAccounts();

	return { countryAccounts };
};

export default function CountryAccounts() {
	const { countryAccounts } = useLoaderData<{
		countryAccounts: CountryAccountWithCountry[];
	}>();
	const [editingAccount, setEditingAccount] =
		useState<CountryAccountWithCountry | null>(null);
	console.log(countryAccounts);

	return (
		<MainContainer
			title="Manage Country Accounts"
			headerExtra={<NavSettings />}
		>
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
									onClick={() => setEditingAccount(countryAccount)}
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
		</MainContainer>
	);
}
