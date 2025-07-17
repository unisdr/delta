import type {
	ActionFunction,
	LoaderFunction,
	MetaFunction,
} from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import { authLoaderWithPerm } from "~/util/auth";
import { configApplicationEmail } from "~/util/config";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { getSystemInfo, SystemInfo } from "~/db/queries/dtsSystemInfo";

import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import Dialog from "~/components/Dialog";
import { getCountrySettingsFromSession } from "~/util/session";
import { Country, InstanceSystemSettings } from "~/drizzle/schema";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { getCountryById } from "~/db/queries/countries";
import {
	SettingsValidationError,
	updateSettingsService,
} from "~/services/settingsService";
import Messages from "~/components/Messages";
import { Toast, ToastRef } from "~/components/Toast";
import { getCurrencyList } from "~/util/currency";

// Define the loader data type
interface LoaderData {
	currencyArray: string[];
	systemLanguage: string[];
	confEmailObj: {
		EMAIL_TRANSPORT: string;
		SMTP_HOST?: string;
		SMTP_PORT?: string;
		SMTP_SECURE?: string;
	};
	instanceSystemSettings: InstanceSystemSettings | null;
	dtsSystemInfo: SystemInfo | null;
	country: Country;
}

export const loader: LoaderFunction = authLoaderWithPerm(
	"ViewData",
	async (loaderArgs) => {
		const settingsSession = await getCountrySettingsFromSession(
			loaderArgs.request
		);
		const settings = await getInstanceSystemSettingsByCountryAccountId(
			settingsSession.countryAccountsId
		);
		const countryAccount = await getCountryAccountById(
			settingsSession.countryAccountsId
		);
		const country = await getCountryById(countryAccount?.country.id);
		const dtsSystemInfo = await getSystemInfo();

		let currencies: string[] = [];
		if (settings) {
			currencies.push(settings.currencyCode);
		}

		const systemLanguage: string[] = ["English"];
		const confEmailObj = configApplicationEmail();

		return Response.json({
			currencyArray: currencies,
			systemLanguage,
			confEmailObj,
			instanceSystemSettings: settings,
			dtsSystemInfo,
			country,
		});
	}
);

export const action: ActionFunction = authLoaderWithPerm(
	"EditData",
	async (args) => {
		const request = args.request;
		const formData = await request.formData();
		const id = formData.get("id") as string;
		const privacyUrl = formData.get("privacyUrl") as string;
		const termsUrl = formData.get("termsUrl") as string;
		const websiteLogoUrl = formData.get("websiteLogoUrl") as string;
		const websiteName = formData.get("websiteName") as string;
		const approvedRecordsArePublic =
			formData.get("approvedRecordsArePublic") === "true";
		const totpIssuer = formData.get("totpIssuer") as string;
		const currency = formData.get("currency") as string;

		try {
			await updateSettingsService(
				id,
				privacyUrl,
				termsUrl,
				websiteLogoUrl,
				websiteName,
				approvedRecordsArePublic,
				totpIssuer,
				currency
			);
			return { success: "ok" };
		} catch (error) {
			let errors = {};
			if (error instanceof SettingsValidationError) {
				errors = { errors: error.errors };
			} else {
				errors = { errors: ["An unexpected error occured"] };
				console.log(error);
			}
			return { ...errors };
		}
	}
);

export const meta: MetaFunction = () => {
	return [
		{ title: "System Settings - DTS" },
		{ name: "description", content: "System settings." },
	];
};

export default function Settings() {
	const loaderData = useLoaderData<LoaderData>();
	const actionData = useActionData<{
		errors?: string[];
		success?: boolean;
	}>();

	const [privacyUrl, setPrivacyUrl] = useState("");
	const [termsUrl, setTermsUrl] = useState("");
	const [websiteLogoUrl, setWebsiteLogoUrl] = useState("");
	const [websiteName, setWebsiteName] = useState("");
	const [approvedRecordsArePublic, setApprovedRecordsArePublic] =
		useState(false);
	const [currency, setCurrency] = useState("");
	const [totpIssuer, setTotpIssuer] = useState("");

	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const toast = useRef<ToastRef>(null);
	const formRef = useRef<HTMLFormElement>(null);
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
				onClick={() => setIsDialogOpen(false)}
			>
				Cancel
			</button>
		</>
	);

	function showEditSettings() {
		if (loaderData.instanceSystemSettings) {
			setPrivacyUrl(
				loaderData.instanceSystemSettings.footerUrlPrivacyPolicy || ""
			);
			setTermsUrl(
				loaderData.instanceSystemSettings.footerUrlTermsConditions || ""
			);
			setWebsiteLogoUrl(loaderData.instanceSystemSettings.websiteLogo || "");
			setWebsiteName(loaderData.instanceSystemSettings.websiteName || "");
			setApprovedRecordsArePublic(
				loaderData.instanceSystemSettings.approvedRecordsArePublic
			);
			setTotpIssuer(loaderData.instanceSystemSettings.totpIssuer || "");
			setCurrency(loaderData.instanceSystemSettings.currencyCode); 
		}
		setIsDialogOpen(true);
	}

	useEffect(() => {
		if (actionData?.success) {
			setIsDialogOpen(false);

			if (toast.current) {
				toast.current.show({
					severity: "info",
					summary: "Success",
					detail:
						"System settings updated successfully. Changes will take effect after you login again.",
				});
			}
		}
	}, [actionData]);

	return (
		<MainContainer title="System Settings" headerExtra={<NavSettings />}>
			<Toast ref={toast} />
			<div className="mg-container">
				<div className="dts-page-intro">
					<div className="dts-additional-actions">
						<button
							type="button"
							className="mg-button mg-button-primary"
							onClick={() => showEditSettings()}
						>
							Edit Settings
						</button>
					</div>
				</div>
				<div className="mg-grid mg-grid__col-3 dts-form-component">
					<label className="dts-form-component__label">
						<strong>System language</strong>{" "}
						<select
							id="system-language"
							name="systemLanguage"
							className="dts-form-component__select"
						>
							<option disabled value="">
								Select from list
							</option>
							{loaderData.systemLanguage.map((item: string, index: number) => (
								<option key={index} value={item}>
									{item}
								</option>
							))}
						</select>
					</label>
					<label className="dts-form-component__label">
						<strong>Currency</strong>{" "}
						<select
							id="currency"
							name="currency"
							className="dts-form-component__select"
						>
							<option disabled value="">
								Select from list
							</option>
							{loaderData.currencyArray.map((item: string, index: number) => (
								<option key={index} value={item}>
									{item}
								</option>
							))}
						</select>
					</label>
				</div>

				<ul style={{ paddingLeft: 20 }}>
					<li>
						<strong>Country instance:</strong>
						<ul>
							<li>
								<strong>Country:</strong> {loaderData.country.name}
							</li>
							<li>
								<strong>ISO 3:</strong>{" "}
								{loaderData.instanceSystemSettings?.dtsInstanceCtryIso3}
							</li>
							<li>
								<strong>Instance type:</strong>{" "}
								{loaderData.instanceSystemSettings?.approvedRecordsArePublic
									? "Public"
									: "Private"}
							</li>
						</ul>
					</li>
					<li>
						<strong>DTS software application version:</strong>{" "}
						{loaderData.dtsSystemInfo?.appVersionNo ?? ""}
					</li>
					<li>
						<strong>System email routing configuration:</strong>
						<ul>
							<li>
								<strong>Transport:</strong>{" "}
								{loaderData.confEmailObj.EMAIL_TRANSPORT}
							</li>
							{loaderData.confEmailObj.EMAIL_TRANSPORT === "smtp" && (
								<>
									<li>
										<strong>Host:</strong>{" "}
										{loaderData.confEmailObj.SMTP_HOST ?? "Not set"}
									</li>
									<li>
										<strong>Port:</strong>{" "}
										{loaderData.confEmailObj.SMTP_PORT ?? "Not set"}
									</li>
									<li>
										<strong>Secure:</strong>{" "}
										{loaderData.confEmailObj.SMTP_SECURE ? "Yes" : "No"}
									</li>
								</>
							)}
						</ul>
					</li>
					<li>
						<strong>Website Name:</strong>{" "}
						{loaderData.instanceSystemSettings?.websiteName}{" "}
					</li>
					<li>
						<strong>Website Logo URL:</strong>{" "}
						{loaderData.instanceSystemSettings?.websiteLogo}{" "}
					</li>
					<li>
						<strong>Page Footer for Privacy Policy URL:</strong>{" "}
						{loaderData.instanceSystemSettings?.footerUrlPrivacyPolicy}{" "}
					</li>
					<li>
						<strong>Page Footer for Terms and Conditions URL:</strong>{" "}
						{loaderData.instanceSystemSettings?.footerUrlTermsConditions}{" "}
					</li>
					<li>
						<strong>2FA/TOTP Issuer Name:</strong>{" "}
						{loaderData.instanceSystemSettings?.totpIssuer}
					</li>
					<li>
						<strong>System up to date</strong>
					</li>
				</ul>

				{/* dialog for editing system variables */}
				<Dialog
					visible={isDialogOpen}
					header="Edit Settings"
					onClose={() => setIsDialogOpen(false)}
					footer={footerContent}
				>
					<Form
						method="post"
						id="addCountryAccountForm"
						className="dts-form"
						ref={formRef}
					>
						{actionData?.errors && (
							<Messages header="Errors" messages={actionData.errors} />
						)}
						<div className="dts-form__body">
							<input
								type="hidden"
								name="id"
								value={loaderData.instanceSystemSettings?.id || ""}
							/>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>Privacy Policy URL</span>
									</div>
									<input
										type="url"
										name="privacyUrl"
										aria-label="Privacy URL"
										placeholder="https://example.com/privacy"
										value={privacyUrl}
										onChange={(e) => setPrivacyUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>Terms and Conditions URL</span>
									</div>
									<input
										type="url"
										name="termsUrl"
										aria-label="Terms and Conditions URL"
										placeholder="https://example.com/terms"
										value={termsUrl}
										onChange={(e) => setTermsUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>*Website Logo URL</span>
									</div>
									<input
										type="text"
										name="websiteLogoUrl"
										aria-label="Website Logo URL"
										placeholder="https://example.com/logo.svg"
										value={websiteLogoUrl}
										onChange={(e) => setWebsiteLogoUrl(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>*Website Name</span>
									</div>
									<input
										type="text"
										name="websiteName"
										aria-label="Website Name"
										placeholder="Enter website name"
										value={websiteName}
										onChange={(e) => setWebsiteName(e.target.value)}
									></input>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>*Approved records visibility</span>
									</div>
									<select
										name="approvedRecordsArePublic"
										value={approvedRecordsArePublic ? "true" : "false"}
										onChange={(e) => {
											console.log("e.target.value = ", e.target.value);
											console.log(typeof e.target.value);
											setApprovedRecordsArePublic(e.target.value === "true");
										}}
									>
										<option key={1} value="true">
											Public
										</option>
										<option key={2} value="false">
											Private
										</option>
									</select>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>*Currency</span>
									</div>
									<select
										name="currency"
										value={currency}
										onChange={(e) => {
											setCurrency(e.target.value);
										}}
									>
										{getCurrencyList().map((currency) => (
											<option key={currency} value={currency}>
												{currency}
											</option>
										))}
									</select>
								</label>
							</div>
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>*Totp Issuer</span>
									</div>
									<input
										type="text"
										name="totpIssuer"
										aria-label="Totp Issuer"
										placeholder="Enter Totp Issuer"
										value={totpIssuer}
										onChange={(e) => setTotpIssuer(e.target.value)}
									></input>
								</label>
							</div>
						</div>
					</Form>
				</Dialog>
			</div>
		</MainContainer>
	);
}
