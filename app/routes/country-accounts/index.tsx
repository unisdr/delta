import type { LoaderFunction } from "@remix-run/node";
import {
	useLoaderData,
} from "@remix-run/react";
import { getCountries } from "~/db/queries/countries";
import {
	getCountryAccounts,
} from "~/db/queries/countryAccounts";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";
import { requireSuperAdmin } from "~/util/auth";

export const loader: LoaderFunction = async ({ request }) => {
    await requireSuperAdmin(request);
	const countryAccounts = await getCountryAccounts();
	const countries = await getCountries();
	return { countryAccounts, countries };
};

export default function CountryAccounts() {
	const { countryAccounts, countries } = useLoaderData<typeof loader>();
    console.log(countryAccounts)
    console.log(countries)


	return (
		<MainContainer
			title="Manage Country Accounts"
			headerExtra={<NavSettings />}
		>
			<table>

            </table>
		</MainContainer>
	);
}
