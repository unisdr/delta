import {dr, Tx} from "~/db.server";
import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";

import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import { useLocation } from 'react-router-dom';
import {
	PropRecord,
	upsertRecord,

} from "~/backend.server/models/noneco_losses";
import {getCategories, CategoryType} from "~/backend.server/models/category";

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

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
	return [
	  { title: "Non-economic Losses - Disaster Records - DTS" },
	  { name: "description", content: "Non-economic Losses page." },
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
	categories: PropsItem[];
};

type PropsForm = { 
	frmType: string; 
	frmSubtype: string;
	frmFactor: string;
};



type PropsItem = { 
	id: number; 
	name: string;
};

interface PropsAction {
	ok?: string;
	error?: string;
	data?: string;
	categories?:object;
	subcategories?:SubCategory;
	factors?:Factor;
	form?:PropsForm;
	showForm: boolean;
	frmType: string;
	frmSubType: string;
	frmFactor: string;
}

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// get first level categories
	let arrayCat = await getCategories(null);

	return { ok:'loader', categories: arrayCat, subcategories: [], factors: [] };
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs;
	const req = actionArgs.request;
	const formData = await req.formData(); 
	let frmType = formData.get("type") || formData.get("frmType") || ''; 
	let frmSubtype = formData.get("subtype") || formData.get("frmSubtype") || ''; 
	let frmFactor = formData.get("factor") || formData.get("frmFactor") || ''; 
	let frmDescription = formData.get("description") || ''; 
	let this_showForm:boolean = false;
	let intCatetoryID:number = 0;
	let intCatetorySubID:number = 0;
	let intCatetorySubTypeID:number = 0;
	let intCatetoryIDforDB:number = 0;
	let subCategoryData = {};
	let factorData = {};

	if (frmType !== '' && typeof frmType === "string" && parseInt(frmType) > 0) {
		intCatetoryID = parseInt(frmType);
		subCategoryData = await getCategories(intCatetoryID);
	}
	if (intCatetoryID > 0 && typeof frmSubtype === "string" && frmSubtype !== '' && parseInt(frmSubtype) > 0) {
		intCatetorySubID = parseInt(frmSubtype);
		intCatetoryIDforDB = intCatetorySubID;
	}
	if (intCatetoryID === 6 && intCatetorySubID > 0) {
		factorData = await getCategories(intCatetorySubID);
	}
	if (intCatetoryID === 6 && intCatetorySubID > 0 && typeof frmFactor === "string" && frmFactor !== '' && parseInt(frmFactor) > 0) {
		intCatetorySubTypeID = parseInt(frmFactor);
		intCatetoryIDforDB = intCatetorySubTypeID;
	}

	if (intCatetoryID !== 6 && intCatetorySubID > 0) {
		this_showForm = true;
	} else if (intCatetoryID === 6 && intCatetorySubID > 0 && intCatetorySubTypeID > 0) {
		this_showForm = true;
	}

	if (this_showForm && frmDescription.toString() !== '' && intCatetoryID > 0) {
		const formRecord:PropRecord = { 
			// id: '70bc07e0-a671-4dbc-8ac8-0c21bc62a878',
			categortyId: intCatetoryIDforDB,
			disasterRecordId: String(params.id),
			description: String(frmDescription),
		};
	
		try {
			await upsertRecord(formRecord).catch(console.error);
			return redirect("/disaster-record/edit/" + params.id);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}

	return {
		ok: 'action', 
		subcategories: subCategoryData,
		factors: factorData,
		showForm: this_showForm,
		frmType: frmType,
		frmSubtype: frmSubtype,
		frmFactor: frmFactor,
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
	const formRefHiddenSubType: RefObject<HTMLInputElement> = useRef(null);
	const formRefHiddenFactor: RefObject<HTMLInputElement> = useRef(null);
	const formRefSubmit: RefObject<HTMLButtonElement> = useRef(null);

	const locationUrlPath = useLocation();

	// console.log( loaderData );
	// console.log( actionData );
	// console.log( actionData?.subcategories );
	
	const handleSelectOnChangeSubCategories = (e: React.ChangeEvent<HTMLSelectElement>) => {
		console.log(e.currentTarget.value);
		console.log(e.target.value);

		if (formRefHidden.current) {
			console.log(formRefHidden.current.value = e.target.name);
		}

		if (formRefHiddenSubType.current) {
			formRefHiddenSubType.current.value = e.target.value;
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
		if (formRefHiddenFactor.current) {
			formRefHiddenFactor.current.value = e.target.value;
		}
	};

	
	const handleResetHiddenValues = (e: MouseEvent<HTMLAnchorElement>) => {
	  e.preventDefault(); // prevent the default link behavior

	  if (formRefHiddenType.current) {
		formRefHiddenType.current.value = '';
		}
		// clear the value
		if (formRefHiddenSubType.current) {
			formRefHiddenSubType.current.value = '';
		}
		if (formRefHiddenFactor.current) {
			formRefHiddenFactor.current.value = '';
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
		if (formRefHiddenSubType.current) {
			formRefHiddenSubType.current.value = '';
		}
		if (formRefHiddenFactor.current) {
			formRefHiddenFactor.current.value = '';
		}
	}, []);

  return (
	<MainContainer title="Disaster Records: Non-economic Losses">
	  <>




		<div className="dts-form__intro">
			<h2 className="dts-heading-2">Effects on Non-economic Losses</h2>
		</div>
		
			<Form className="dts-form" ref={formRef} name="frmFilter" id="frmFilter" method="post" onSubmit={(event) => submit(event.currentTarget)}>
				<input ref={formRefHidden} type="hidden" name="action" defaultValue="" />
				<input ref={formRefHiddenType} type="text" name="frmType" value={ actionData?.frmType } />
				<input ref={formRefHiddenSubType} type="text" name="frmSubtype" defaultValue={ actionData?.frmSubType } />
				<input ref={formRefHiddenFactor} type="text" name="frmFactor" defaultValue={ actionData?.frmFactor } />
				<div className="mg-grid mg-grid__col-auto">
					<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
						<span><abbr title="mandatory">*</abbr>Type</span>
						</div>
						
						<select disabled={actionData?.showForm || Array.isArray(actionData?.subcategories) ? true : false} name="type" required onChange={handleSelectOnChangeCategories}>
							<option value="">Select an option</option>
							{loaderData.categories.map(item => (
								<option key={item.id} value={item.id}>{item.name}</option>
							))}
						</select>
						
					</label>
					</div>
					{actionData?.subcategories &&
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
								<span><abbr title="mandatory">*</abbr>Sub Type</span>
								</div>
								<select disabled={actionData?.showForm || Array.isArray(actionData?.factors) ? true : false} name="subtype" onChange={handleSelectOnChangeSubCategories}>
									<option value="">Select an option</option>
									{Array.isArray(actionData?.subcategories) && actionData.subcategories.map(item => (
										<option key={item.id} value={item.id}>{item.name}</option>
									))}
								</select>
							</label>
						</div>
					}
					{actionData?.factors && Array.isArray(actionData?.factors) &&
						<div className="dts-form-component">
							<label>
								<div className="dts-form-component__label">
								<span><abbr title="mandatory">*</abbr>Factor</span>
								</div>
								<select disabled={actionData?.showForm ? true : false} name="factor" onChange={handleSelectOnChangeFactor}>
									<option value="">Select an option</option>
									{Array.isArray(actionData?.factors) && actionData.factors.map(item => (
										<option key={item.id} value={item.id}>{item.name}</option>
									))}
								</select>
							</label>
						</div>
					}
					<div className="dts-form-component" style={actionData?.showForm ? {display:'none'}: {display:'block'}}>
						<label>
							<div className="dts-form-component__label">
								<span>&nbsp;</span>
							</div>
							<button name="submit_btn" value={'filter'} className="mg-button mg-button-primary" type="submit" disabled={navigation.state === "submitting"}>
								Select
							</button>
							<Link onClick={handleResetHiddenValues} className="mg-button mg-button-secondary" to={ locationUrlPath } replace>Clear</Link>
						</label>
					</div>
				</div>


				{(actionData?.showForm) &&
					<>
						<div>
							<label>
								<div className="dts-form-component__label">
								<span>* Description</span>
								</div>
								<textarea name="description" required rows={5} maxLength={3000} 
									placeholder="Describe the effect of the non-economic losses to the selected criteria." 
									style={{width:"100%", height:"200px"}}></textarea>
							</label>
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
