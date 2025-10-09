import { dr } from "~/db.server";
import { authActionWithPerm, authLoaderWithPerm } from "~/util/auth";

import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import {
	upsertRecord as disRecSectorsUpsertRecord,
	disRecSectorsById,
} from "~/backend.server/models/disaster_record__sectors";

import {
	useLoaderData,
	Form,
	redirect,
	useSubmit,
	useNavigation,
	useActionData,
} from "@remix-run/react";

import { useState, useEffect, useRef, RefObject } from "react";

//#Sector: Start
import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfigSector } from "../content-picker-config";
import { getCountrySettingsFromSession } from "~/util/session";
//#Sector: End

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: " Sectors - Disaster Records - DELTA Resilience" },
		{ name: "description", content: " Sectors page" },
	];
};

// interface Category {
// 	id: number;
// 	name: string;
// }

interface SubCategory {
	id: number;
	data: PropsItem[];
}

interface Factor {
	id: number;
	data: PropsItem[];
}

type PropsLoader = {
	ok: string;
	type: PropsItem[];
	arrayCurrency: string[];
	sectorDisplayName: string;
	record: any;
	disRecId: string;
	formAction?: string;
};

type PropsForm = {
	frmType: string;
	frmSector: string;
	frmSubSector: string;
};

type PropsItem = {
	id: number;
	sectorname: string;
};

interface PropsAction {
	ok?: string;
	error?: string;
	data?: string;
	categories?: object;
	sectors?: SubCategory;
	subsectors?: Factor;
	form?: PropsForm;
	showForm: boolean;
	frmType: string;
	frmSector: string;
	frmSubSector: string;
}

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const { params } = actionArgs;
	const req = actionArgs.request;

	const settings = await getCountrySettingsFromSession(actionArgs.request);
	var currencyCodes = [];
	if (settings) {
		currencyCodes.push(settings.currencyCode);
	}
	let sectorDisplayName: string = "";

	// Parse the request URL
	const parsedUrl = new URL(req.url);

	// Extract query string parameters
	const queryParams = parsedUrl.searchParams;
	const xId = queryParams.get("id") || "";
	let record: any = {};
	let formAction = "new";
	if (xId) {
		record = await disRecSectorsById(xId);
		formAction = "edit";
	}
	if (record) {
		sectorDisplayName = await contentPickerConfigSector.selectedDisplay(
			dr,
			record.sectorId
		);
	}

	return {
		ok: "loader",
		arrayCurrency: currencyCodes,
		record: record,
		sectorDisplayName: sectorDisplayName,
		disRecId: params.disRecId,
		formAction: formAction,
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { params } = actionArgs;
	const req = actionArgs.request;
	const formData = await req.formData();
	let frmId = formData.get("id") || "";
	let frmSectorId = formData.get("sectorId") || "";
	let frmWithDamage = formData.get("with_damage") || "";
	let frmDamageCost = formData.get("damage_cost") || "";
	let frmDamageCostCurrency = formData.get("damage_cost_currency") || "";
	let frmDamageRecoveryCost = formData.get("damage_recovery_cost") || "";
	let frmDamageRecoveryCostCurrency =
		formData.get("damage_recovery_cost_currency") || "";
	let frmWithLosses = formData.get("with_losses") || "";
	let frmLossesCost = formData.get("losses_cost") || "";
	let frmLossesCostCurrency = formData.get("losses_cost_currency") || "";
	let frmWithDisruption = formData.get("with_disruption") || "";

	let this_showForm: boolean = false;
	let intSectorIDforDB: string = "";

	if (frmSectorId && typeof frmSectorId == "string" && frmSectorId !== "") {
		this_showForm = true;
		intSectorIDforDB = frmSectorId;
	}

	if (
		this_showForm &&
		intSectorIDforDB !== "" &&
		(frmWithDamage || frmWithDisruption || frmWithLosses)
	) {
		const formRecord: any = {
			id: frmId && typeof frmId == "string" ? frmId : undefined,
			sectorId: intSectorIDforDB,
			disasterRecordId: params.disRecId,
			withDamage: frmWithDamage === "on" ? true : false,
			damageCost:
				frmWithDamage === "on" && frmDamageCost !== "" ? frmDamageCost : null,
			damageCostCurrency:
				frmWithDamage === "on" &&
				frmDamageCost !== "" &&
				frmDamageCostCurrency !== ""
					? frmDamageCostCurrency
					: null,
			damageRecoveryCost:
				frmWithDamage === "on" && frmDamageRecoveryCost !== ""
					? frmDamageRecoveryCost
					: null,
			damageRecoveryCostCurrency:
				frmWithDamage === "on" &&
				frmDamageRecoveryCost !== "" &&
				frmDamageRecoveryCostCurrency !== ""
					? frmDamageRecoveryCostCurrency
					: null,
			withDisruption: frmWithDisruption === "on" ? true : false,
			withLosses: frmWithLosses === "on" ? true : false,
			lossesCost:
				frmWithLosses === "on" && frmLossesCost !== "" ? frmLossesCost : null,
			lossesCostCurrency:
				frmWithLosses === "on" &&
				frmLossesCost !== "" &&
				frmLossesCostCurrency !== ""
					? frmLossesCostCurrency
					: null,
		};
		try {
			await disRecSectorsUpsertRecord(formRecord).catch(console.error);
			return redirect("/disaster-record/edit/" + params.disRecId);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
	return {
		ok: "action",
		showForm: this_showForm,
	};
});

export default function Screen() {
	const loaderData = useLoaderData<PropsLoader>();
	const actionData = useActionData<PropsAction>();

	const submit = useSubmit();
	const navigation = useNavigation();
	const formRef = useRef<HTMLFormElement>(null);
	const formRefHidden: RefObject<HTMLInputElement> = useRef(null);
	const formRefSubmit: RefObject<HTMLButtonElement> = useRef(null);

	const formAction = loaderData?.formAction || "new";

	//#Sector: Start
	const [showForm, setShowForm] = useState(false);
	useEffect(() => {
		if (actionData?.showForm !== undefined) {
			setShowForm(actionData.showForm);
		}
	}, [actionData]);

	return (
		<MainContainer title="Disaster Records: Sectors">
			<>
				<a
					data-discover="true"
					href={`/disaster-record/edit/${loaderData.disRecId}`}
				>
					Back to disaster record
				</a>
				<div className="dts-form__intro">
					<h2 className="dts-heading-2">Sectors</h2>
				</div>

				<Form
					className="dts-form"
					ref={formRef}
					name="frmFilter"
					id="frmFilter"
					method="post"
					onSubmit={(event) => submit(event.currentTarget)}
				>
					<input
						ref={formRefHidden}
						type="hidden"
						name="id"
						readOnly={true}
						defaultValue={
							loaderData.record && loaderData.record.id
								? loaderData.record.id
								: ""
						}
					/>

					{/* //#Sector: Added ContentPicker */}
					<div className="mg-grid mg-grid__col-auto">
						<div className="form-field">
							<label>
								<div>
									<ContentPicker
										selectAnyItem={true}
										{...contentPickerConfigSector}
										value={loaderData.record ? loaderData.record.sectorId : ""} //Assign the sector id here
										displayName={loaderData.sectorDisplayName} //Assign the sector name here, from the loaderData > sectorDisplayName sample
										onSelect={(selectedItems: any) => {
											//This is where you can get the selected sector id

											console.log("selectedItems: ", selectedItems);
											console.log("loaderData: ", loaderData);

											setShowForm(true);
										}}
										disabledOnEdit={formAction === "edit"}
									/>
								</div>
							</label>
						</div>
					</div>
					{/* //#Sector: End */}

					<input
						ref={formRefHidden}
						type="hidden"
						name="action"
						defaultValue=""
					/>

					{((loaderData.record && loaderData.record.id) ||
						actionData?.showForm ||
						showForm) && (
						<>
							<h2 className="dts-heading-3">Damage</h2>
							<div className="mg-grid mg-grid__col-3">
								<div className="dts-form-component mg-grid__col">
									<label aria-invalid="false">
										<div className="dts-form-component__label"></div>
										<div className="dts-form-component__field--horizontal">
											<input
												type="checkbox"
												name="with_damage"
												aria-describedby=""
												defaultChecked={
													loaderData.record && loaderData.record.withDamage
														? true
														: false
												}
											/>
											<span>Has Damage</span>
										</div>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Recovery Cost</span>
										</div>
										<input
											type="number"
											name="damage_recovery_cost"
											placeholder="enter the damage recovery cost"
											defaultValue={
												loaderData.record &&
												loaderData.record.damageRecoveryCost
													? loaderData.record.damageRecoveryCost
													: ""
											}
										/>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Currency</span>
										</div>
										<select
											name="damage_recovery_cost_currency"
											defaultValue={
												loaderData.record?.damageRecoveryCostCurrency || ""
											}
										>
											{Array.isArray(loaderData.arrayCurrency) &&
												loaderData.arrayCurrency.map((item, index) => (
													<option key={index} value={item}>
														{item}
													</option>
												))}
										</select>
									</label>
								</div>
							</div>
							<div className="mg-grid mg-grid__col-3">
								<div className="dts-form-component mg-grid__col">
									<label aria-invalid="false">
										<div className="dts-form-component__label"></div>
										<div className="dts-form-component__field--horizontal">
											&nbsp;
										</div>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Damage Cost</span>
										</div>
										<input
											type="number"
											name="damage_cost"
											placeholder="enter the damage cost"
											defaultValue={
												loaderData.record && loaderData.record.damageCost
													? loaderData.record.damageCost
													: ""
											}
										/>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Currency</span>
										</div>
										<select
											name="damage_cost_currency"
											defaultValue={loaderData.record?.damageCostCurrency || ""}
										>
											{Array.isArray(loaderData.arrayCurrency) &&
												loaderData.arrayCurrency.map((item, index) => (
													<option key={index} value={item}>
														{item}
													</option>
												))}
										</select>
									</label>
								</div>
							</div>
							<h2 className="dts-heading-3">Losses</h2>
							<div className="mg-grid mg-grid__col-3">
								<div className="dts-form-component mg-grid__col">
									<label aria-invalid="false">
										<div className="dts-form-component__label"></div>
										<div className="dts-form-component__field--horizontal">
											<input
												type="checkbox"
												name="with_losses"
												aria-describedby=""
												defaultChecked={
													loaderData.record && loaderData.record.withLosses
														? true
														: false
												}
											/>
											<span>Has Losses</span>
										</div>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Losses Cost</span>
										</div>
										<input
											type="number"
											name="losses_cost"
											placeholder="enter the losses cost"
											defaultValue={
												loaderData.record && loaderData.record.lossesCost
													? loaderData.record.lossesCost
													: ""
											}
										/>
									</label>
								</div>
								<div className="dts-form-component mg-grid__col">
									<label>
										<div className="dts-form-component__label">
											<span>Currency</span>
										</div>
										<select
											name="losses_cost_currency"
											defaultValue={loaderData.record?.lossesCostCurrency || ""}
										>
											{Array.isArray(loaderData.arrayCurrency) &&
												loaderData.arrayCurrency.map((item, index) => (
													<option key={index} value={item}>
														{item}
													</option>
												))}
										</select>
									</label>
								</div>
							</div>
							<h2 className="dts-heading-3">Disruption</h2>
							<div className="mg-grid mg-grid__col-3">
								<div className="dts-form-component mg-grid__col">
									<label aria-invalid="false">
										<div className="dts-form-component__label"></div>
										<div className="dts-form-component__field--horizontal">
											<input
												type="checkbox"
												name="with_disruption"
												aria-describedby=""
												defaultChecked={
													loaderData.record && loaderData.record.withDisruption
														? true
														: false
												}
											/>
											<span>Has Disruption</span>
										</div>
									</label>
								</div>
							</div>
							<div className="dts-form__actions">
								<label>
									{/* <div className="dts-form-component__label">
									<span>&nbsp;</span>
								</div> */}
									<button
										name="submit_btn"
										value={"form"}
										ref={formRefSubmit}
										className="mg-button mg-button-primary"
										type="submit"
										disabled={navigation.state === "submitting"}
									>
										Save Changes
									</button>
								</label>
							</div>
						</>
					)}
				</Form>
			</>
		</MainContainer>
	);
}
