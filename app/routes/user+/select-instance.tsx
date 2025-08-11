import {
	ActionFunction,
	ActionFunctionArgs,
	LoaderFunction,
	redirect,
} from "@remix-run/server-runtime";
import { useRef, useState } from "react";
import { Form, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/server-runtime";

import {
	getCountryAccountsIdFromSession,
	getUserFromSession,
	sessionCookie,
} from "~/util/session";
import { getSafeRedirectTo } from "./login";
import { getUserCountryAccountsByUserId } from "~/db/queries/userCountryAccounts";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { getCountryById } from "~/db/queries/countries";
import { ListBox } from "~/components/ListBox";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";

import {
	countryAccountTypes,
	SelectCountries,
	SelectCountryAccounts,
	SelectUserCountryAccounts,
} from "~/drizzle/schema";
import Tag from "~/components/Tag";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { Toast, ToastRef } from "~/components/Toast";

type LoaderDataType = SelectUserCountryAccounts & {
	countryAccount: Partial<SelectCountryAccounts> & {
		country: Partial<SelectCountries>;
	};
};

export const loader: LoaderFunction = async ({
	request,
}: LoaderFunctionArgs) => {
	const userSession = await getUserFromSession(request);
	if (!userSession) throw redirect("/user/login");

	const url = new URL(request.url);
	const redirectTo = getSafeRedirectTo(url.searchParams.get("redirectTo"));
	const countryAccountId = await getCountryAccountsIdFromSession(request);

	if (countryAccountId) {
		return redirect(redirectTo);
	}

	const userCountryAccounts = await getUserCountryAccountsByUserId(
		userSession.user.id
	);

	if (!userCountryAccounts || userCountryAccounts.length === 0) {
		return redirect("/user/login");
	}

	const data: LoaderDataType[] = (
		await Promise.all(
			userCountryAccounts.map(async (uca) => {
				if (!uca.countryAccountsId) return;
				const countryAccount = await getCountryAccountById(
					uca.countryAccountsId
				);
				if (!countryAccount) return null;

				const country = await getCountryById(countryAccount.countryId);
				if (!country) return null;

				return {
					...uca,
					countryAccount: {
						...countryAccount,
						country,
					},
				};
			})
		)
	).filter(Boolean) as LoaderDataType[];

	return { data };
};

export const action: ActionFunction = async ({
	request,
}: ActionFunctionArgs) => {
	const formData = await request.formData();
	const countryAccountsId = formData.get("countryAccountsId");
	const userRole = formData.get("userRole");

	if (!countryAccountsId || typeof countryAccountsId !== "string") {
		return new Response("Instance not selected", { status: 400 });
	}
	const url = new URL(request.url);
	let redirectTo = url.searchParams.get("redirectTo");
	redirectTo = getSafeRedirectTo(redirectTo);

	const session = await sessionCookie().getSession(
		request.headers.get("Cookie")
	);

	const countrySettings = await getInstanceSystemSettingsByCountryAccountId(
		countryAccountsId
	);

	session.set("countryAccountsId", countryAccountsId);
	session.set("userRole", userRole);
	session.set("countrySettings", countrySettings);
	const setCookie = await sessionCookie().commitSession(session);

	return redirect(redirectTo, {
		headers: { "Set-Cookie": setCookie },
	});
};

export default function SelectInstance() {
	const { data } = useLoaderData<typeof loader>();
	const [selectedCountryAccounts, setSelectedCountryAccounts] =
		useState<LoaderDataType | null>(null);
	const toast = useRef<ToastRef>(null);

	const countryTemplate = (option: LoaderDataType) => {
		const instanceType = option.countryAccount.type;
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
				}}
			>
				<div style={{ display: "flex", alignItems: "center" }}>
					<img
						alt={option.countryAccount.country.name}
						src={option.countryAccount.country.flagUrl}
						style={{ width: "18px", marginRight: "12px" }}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							lineHeight: 1.2,
						}}
					>
						<span style={{ fontWeight: "500" }}>
							{option.countryAccount.country.name}
						</span>
						<small>{option.countryAccount.shortDescription}</small>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Tag severity="info" value={option.role} />
					<Tag
						value={instanceType}
						severity={
							instanceType === countryAccountTypes.OFFICIAL ? "info" : "warning"
						}
					/>
					<img
						alt="arrow"
						src={`/assets/icons/arrow-right.svg`}
						style={{ width: "24px" }}
					/>
				</div>
			</div>
		);
	};

	return (
		<MainContainer title="Select an instance" headerExtra={<NavSettings />}>
			<>
				<div className="card flex justify-content-center">
					<Toast ref={toast} />
				</div>
				<Form
					method="POST"
					className="dts-form"
					onSubmit={(e) => {
						if (!selectedCountryAccounts) {
							e.preventDefault();
							toast.current?.show({
								severity: "error",
								summary: "Error",
								detail: "Select an instance first.",
							});
						}
					}}
				>
					<div className="dts-form__intro">
						<h2 className="dts-heading-2">
							We found {data.length} instance(s) associated with your email ID.
							Please select the instance you want to review.
						</h2>
					</div>
					<div className="dts-form__body">
						<input
							type="hidden"
							name="countryAccountsId"
							value={selectedCountryAccounts?.countryAccountsId ?? ""}
						/>
						<input
							type="hidden"
							name="userRole"
							value={selectedCountryAccounts?.role ?? ""}
						/>
						<ListBox
							value={selectedCountryAccounts}
							onChange={(e) => setSelectedCountryAccounts(e.value)}
							options={data}
							className="w-full md:w-80"
							itemTemplate={countryTemplate}
							listStyle={{ maxHeight: "250px" }}
						/>
						<div className="dts-form__actions dts-form__actions--bottom">
							<button className="mg-button mg-button-primary" type="submit">
								Go
							</button>
						</div>
					</div>
					<div>
						Don't see the right instance? Contact your team admin to get access.
					</div>
				</Form>
			</>
		</MainContainer>
	);
}
