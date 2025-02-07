import {dr, Tx} from "~/db.server";
import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";

import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import { useLocation } from 'react-router-dom';


import {
	upsertRecord as disRecSectorsUpsertRecord,
} from "~/backend.server/models/disaster_record__sectors";


import {getSectors, SectorType} from "~/backend.server/models/sector";

import { 
	useLoaderData, 
	Form, 
	redirect,
	useSubmit, 
	useNavigation,
	useActionData,
	useNavigate,
	Link
} from "@remix-run/react";

import { json, ActionFunction, LoaderFunction, } from "@remix-run/node";
import { useState, useEffect, useRef, RefObject, MouseEvent } from 'react';
import { string } from "prop-types";
import { configCurrencies } from  "~/util/config";
import { isEmpty } from "ol/extent";

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
	return [
	  { title: " Sectors - Disaster Records - DTS" },
	  { name: "description", content: " Sectors page" },
	];
 };

interface Category { 
	id: number; 
	name: string; 
}

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
	currency: string[];
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
	categories?:object;
	sectors?:SubCategory;
	subsectors?:Factor;
	form?:PropsForm;
	showForm: boolean;
	frmType: string;
	frmSector: string;
	frmSubSector: string;
}

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// get first level categories
	let arrayType = await getSectors(null);
	let arrayCurrency = configCurrencies();

	return { ok:'loader', type: arrayType, sectors: [], subsectors: [], currency: arrayCurrency };
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs;
	const req = actionArgs.request;
	const formData = await req.formData(); 
	let frmType = formData.get("type") || formData.get("frmType") || ''; 
	let frmSector = formData.get("sector") || formData.get("frmSector") || ''; 
	let frmSubSector = formData.get("subsector") || formData.get("frmSubSector") || ''; 

	let frmWithDamage = formData.get("with_damage") || ''; 
	let frmWithLosses = formData.get("with_losses") || ''; 
	let frmWithDisruption = formData.get("with_disruption") || ''; 
	let frmDisruptionResponseCost = formData.get("disruption_response_cost") || ''; 
	let frmDisruptionResponseCostCurrency = formData.get("disruption_response_cost_currency") || ''; 

	let this_showForm:boolean = false;
	let intTypeID:number = 0;
	let intSectorID:number = 0;
	let intSubSectorID:number = 0;
	let intSectorIDforDB:number = 0;
	let sectorData = {};
	let subSectorData = {};

	if (frmType !== '' && typeof frmType === "string" && parseInt(frmType) > 0) {
		intTypeID = parseInt(frmType);
		sectorData = await getSectors(intTypeID);
	}
	if (intTypeID > 0 && typeof frmSector === "string" && frmSector !== '' && parseInt(frmSector) > 0) {
		intSectorID = parseInt(frmSector);
		subSectorData = await getSectors(intSectorID);
	}
	if (intSectorID > 0 && typeof frmSubSector === "string" && frmSubSector !== '' && parseInt(frmSubSector) > 0) {
		intSubSectorID = parseInt(frmSubSector);
		intSectorIDforDB = intSubSectorID;
		this_showForm = true;
	}

	if (this_showForm && intSectorID > 0 && (frmWithDamage || frmWithDisruption || frmWithLosses)) {
		const formRecord:any = { 
			// id: '70bc07e0-a671-4dbc-8ac8-0c21bc62a878',
			sectorId: intSectorIDforDB,
			disasterRecordId: params.disRecId,
			withDamage: frmWithDamage === 'on' ? true : false,
			withDisruption: frmWithDisruption === 'on' ? true : false,
			disruptionResponseCost: frmWithDisruption === 'on' && frmDisruptionResponseCost !== '' ? frmDisruptionResponseCost : null,
			disruptionResponseCostCurrency: frmWithDisruption === 'on' && frmDisruptionResponseCost !== '' && frmDisruptionResponseCostCurrency !== '' ? frmDisruptionResponseCostCurrency : null,
			withLosses: frmWithLosses === 'on' ? true : false,
		};
	
		try {
			await disRecSectorsUpsertRecord(formRecord).catch(console.error);
			return redirect("/disaster-record/edit/" + params.disRecId);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}

	// console.log( formData );
	// console.log( params );

	return {
		ok: 'action', 
		sectors: sectorData,
		subsectors: subSectorData,
		showForm: this_showForm,
		frmType: frmType,
		frmSector: frmSector,
		frmSubSector: frmSubSector,
	}; 
});

export default function Screen() {
	const loaderData = useLoaderData<PropsLoader>();
	const actionData = useActionData<PropsAction>();
	const navigate = useNavigate();

	const submit = useSubmit();
	const navigation = useNavigation();
	const formRef = useRef<HTMLFormElement>(null);
	const formRefHidden: RefObject<HTMLInputElement> = useRef(null);
	const formRefHiddenType: RefObject<HTMLInputElement> = useRef(null);
	const formRefHiddenSector: RefObject<HTMLInputElement> = useRef(null);
	const formRefHiddenSubSector: RefObject<HTMLInputElement> = useRef(null);
	const formRefSubmit: RefObject<HTMLButtonElement> = useRef(null);

	const locationUrlPath = useLocation();

	// console.log( loaderData );
	// console.log( actionData );
	// console.log( actionData?.sectors );
	
	const handleSelectOnChangeSubCategories = (e: React.ChangeEvent<HTMLSelectElement>) => {
		console.log(e.currentTarget.value);
		console.log(e.target.value);

		if (formRefHidden.current) {
			console.log(formRefHidden.current.value = e.target.name);
		}

		if (formRefHiddenSector.current) {
			formRefHiddenSector.current.value = e.target.value;
		}

		// if (e.target.value == '' && formRefSubmit.current) {
		// 	formRefSubmit.current.style.display = 'none';
		// }
		// else if (e.target.value !== '' && formRefSubmit.current) {
		// 	formRefSubmit.current.style.display = 'block';
		// }
		
		
	};

	const handleSelectOnChangeCategories = (e: React.ChangeEvent<HTMLSelectElement>) => {
		console.log(e.currentTarget.value);
		console.log(e.target.value);

		if (formRefHidden.current) {
			console.log(formRefHidden.current.value = e.target.name);
		}

		if (formRefHiddenType.current) {
			formRefHiddenType.current.value = e.target.value;
		}
	};

	const handleSelectOnChangeFactor = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (formRefHiddenSubSector.current) {
			formRefHiddenSubSector.current.value = e.target.value;
		}
	};

	
	const handleResetHiddenValues = (e: MouseEvent<HTMLAnchorElement>) => {
	  e.preventDefault(); // prevent the default link behavior

	  if (formRefHiddenType.current) {
		formRefHiddenType.current.value = '';
		}
		// clear the value
		if (formRefHiddenSector.current) {
			formRefHiddenSector.current.value = '';
		}
		if (formRefHiddenSubSector.current) {
			formRefHiddenSubSector.current.value = '';
		}
		navigate(locationUrlPath); // navigate to the desired path
	};

	const handleAutoSubmit = () => { 
		// const form = document.getElementById("frmFilter") as HTMLFormElement; 
		// if (form) { 
		// 	form.submit(); 
		// } 
		if (formRefSubmit.current) {
			formRefSubmit.current.click();
		}

	};

	useEffect(() => {
		// if (formRefSubmit.current) {
		// 	formRefSubmit.current.style.display = 'none';
		// }
		if (formRefHiddenType.current) {
			formRefHiddenType.current.value = '';
		}
		if (formRefHiddenSector.current) {
			formRefHiddenSector.current.value = '';
		}
		if (formRefHiddenSubSector.current) {
			formRefHiddenSubSector.current.value = '';
		}
	}, []);

  return (
	<MainContainer title="Disaster Records: Sectors">
	  <>




		<div className="dts-form__intro">
			<h2 className="dts-heading-2">Sectors</h2>
		</div>
		
			<Form className="dts-form" ref={formRef} name="frmFilter" id="frmFilter" method="post" onSubmit={(event) => submit(event.currentTarget)}>
				<input ref={formRefHidden} type="hidden" name="action" defaultValue="" />
				<input ref={formRefHiddenType} type="text" name="frmType" value={ actionData?.frmType } />
				<input ref={formRefHiddenSector} type="text" name="frmSector" defaultValue={ actionData?.frmSector } />
				<input ref={formRefHiddenSubSector} type="text" name="frmSubSector" defaultValue={ actionData?.frmSubSector } />
				<div className="mg-grid mg-grid__col-auto">
					<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
						<span><abbr title="mandatory">*</abbr>Type</span>
						</div>

						<select disabled={actionData?.showForm || Array.isArray(actionData?.sectors) ? true : false} name="type" required onChange={handleSelectOnChangeCategories}>
							<option value="">Select an option</option>
							{loaderData.type.map(item => (
								<option key={item.id} value={item.id}>{item.sectorname}</option>
							))}
						</select>
					</label>
					</div>
					{actionData?.sectors &&
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
								<span><abbr title="mandatory">*</abbr>Sector</span>
								</div>
								<select disabled={actionData?.showForm || Array.isArray(actionData?.subsectors) ? true : false} name="sector" onChange={handleSelectOnChangeSubCategories}>
									<option value="">Select an option</option>
									{Array.isArray(actionData?.sectors) && actionData.sectors.map(item => (
										<option key={item.id} value={item.id}>{item.sectorname}</option>
									))}
								</select>
							</label>
						</div>
					}
					{actionData?.subsectors && Array.isArray(actionData?.subsectors) &&
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
								<span><abbr title="mandatory">*</abbr>Sub Sector</span>
								</div>
								<select disabled={actionData?.showForm ? true : false} name="subsector" onChange={handleSelectOnChangeFactor}>
									<option value="">Select an option</option>
									{Array.isArray(actionData?.subsectors) && actionData.subsectors.map(item => (
										<option key={item.id} value={item.id}>{item.sectorname}</option>
									))}
								</select>
							</label>
						</div>
					}
				</div>
				<div className="form__actions" style={actionData?.showForm ? {display:'none'}: {display:'block'}}>
					<label>
						<div className="dts-form-component__label">
							<span>&nbsp;</span>
						</div>
						<Link onClick={handleResetHiddenValues} className="mg-button mg-button-secondary" to={ locationUrlPath } replace>Clear</Link>
						&nbsp;
						<button name="submit_btn" value={'filter'} className="mg-button mg-button-primary" type="submit" disabled={navigation.state === "submitting"}>
							Select
						</button>
					</label>
				</div>


				{(actionData?.showForm) &&
					<>
						<h2 className="dts-heading-3">Damage</h2>
						<div className="mg-grid mg-grid__col-3">
							<div className="dts-form-component">
								<label aria-invalid="false">
									<div className="dts-form-component__label"></div>
									<div className="dts-form-component__field--horizontal">
										<input type="checkbox" name="with_damage" aria-describedby="" />
										<span>Has Damage</span>
									</div>
								</label>					
							</div>
						</div>
						<h2 className="dts-heading-3">Losses</h2>
						<div className="mg-grid mg-grid__col-3">
							<div className="dts-form-component">
								<label aria-invalid="false">
									<div className="dts-form-component__label"></div>
									<div className="dts-form-component__field--horizontal">
										<input type="checkbox" name="with_losses" aria-describedby="" />
										<span>Has Lossses</span>
									</div>
								</label>					
							</div>
						</div>
						<h2 className="dts-heading-3">Disruption</h2>
						<div className="mg-grid mg-grid__col-3">
							<div className="dts-form-component mg-grid__col">
								<label aria-invalid="false">
									<div className="dts-form-component__label"></div>
									<div className="dts-form-component__field--horizontal">
										<input type="checkbox" name="with_disruption" aria-describedby="" />
										<span>Has Disruption</span>
									</div>
								</label>					
							</div>
							<div className="dts-form-component mg-grid__col">
								<label>
								<div className="dts-form-component__label">
									<span>Response Cost</span>
								</div>
								<input type="number" name="disruption_response_cost" placeholder="enter disruption response cost" />
								</label>
							</div>
							<div className="dts-form-component mg-grid__col">
								<label>
								<div className="dts-form-component__label">
									<span>Currency</span>
								</div>
								<select name="disruption_response_cost_currency">
									{
										Array.isArray(loaderData.currency) && loaderData.currency.map((item, index) => (
											<option key={index} value={item}>{item}</option>
										))
									}
								</select>
								</label>
							</div>
						</div>
						<div className="dts-form__actions">
							<label>
								<div className="dts-form-component__label">
									<span>&nbsp;</span>
								</div>
								<Link onClick={handleResetHiddenValues} className="mg-button mg-button-secondary" to={ locationUrlPath }>Clear</Link>
								&nbsp;
								<button name="submit_btn" value={'form'} ref={formRefSubmit}  className="mg-button mg-button-primary" type="submit" disabled={navigation.state === "submitting"}>
									Save Changes
								</button>
							</label>
						</div>
					</>
				}

				

			</Form>
			
			
		






		












	  </>
	</MainContainer>
  );
}
