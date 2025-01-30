import {dr, Tx} from "~/db.server";
import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";

import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import { useLocation } from 'react-router-dom';
import {
	NonecoLossesFields,
	nonecoLossesCreate,
	nonecoLossesUpdate,
	nonecoLossesById,
	PropRecord,
	upsertRecord,

} from "~/backend.server/models/noneco_losses";

import {
	nonecoLossesTable,
} from '~/drizzle/schema';

// import {
// 	fieldsDef,
// 	DisasterRecordsForm,
// 	route
// } from "~/frontend/disaster-record/form";

import {
	fieldsDef,
	DisasterRecordsForm,
	route
} from "~/frontend/disaster-record/form-non-economic-losses";


import {
	FormScreen
} from "~/frontend/form";

import {
	createLoader,
	createAction,
} from "~/backend.server/handlers/form";

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

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
	return [
	  { title: "Non-economic Losses - Disaster Records - DTS" },
	  { name: "description", content: "Non-economic Losses page." },
	];
 };

// export const loader = createLoader({
// 	getById: disasterRecordsById
// });


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


const arrayCat:Category[] = [
	{
		name: 'Human Life, health and livelihoods',
		id: 1,
	},
	{
		name: 'Meaningful Places',
		id: 2,
	},
	{
		name: 'Cultural heritage',
		id: 3,
	},
	{
		name: 'Social and Intrinsic values',
		id: 4,
	},
	{
		name: 'Biodiversity',
		id: 5,
	},
	{
		name: 'Ecosystem services',
		id: 6,
	},
];

const arraySubType:SubCategory[] = [
	{
		id: 1,
		data: [
			{ name: "Lives", id: 101 },
			{ name: "Health", id: 102 },
			{ name: "Wellbeing", id: 103 },
			{ name: "Livelihoods", id: 14 },
			{ name: "Food security", id: 105 },
		]
  	}, {
		id: 2,
		data: [
			{ name: "Territory", id: 201 },
			{ name: "Homes - sense of place", id: 202 },
			{ name: "Places", id: 203 },
			{ name: "Sacred sites", id: 204 },
		],
	}, {
		id: 3,
		data: [
			{ name: "Heritage", id: 301 },
			{ name: "Historical monuments", id: 302 },
			{ name: "Artefacts", id: 303 },
			{ name: "Rituals", id: 304 },
			{ name: "Traditions, ways of life", id: 305 },
			{ name: "Customs", id: 306 },
			{ name: "Culture", id: 307 },
			{ name: "Language", id: 308 },
			{ name: "Indigenous knowledge", id: 309 },
		],
	}, {
		id: 4,
		data: [
			{ name: "Dignity", id: 401},
			{ name: "Agency", id: 402},
			{ name: "Identity", id: 403},
			{ name: "Security", id: 404},
			{ name: "Social cohesion", id: 405},
			{ name: "Social capital", id: 406},
			{ name: "Social fabric", id: 407},
			{ name: "Community ( sense of)", id: 408},
			{ name: "Sovereignty", id: 409},
			{ name: "Education", id: 410},
			{ name: "(Human) Mobility", id: 411},
		]
	}, {
		id: 5,
		data: [
			{ name: "Genetic diversity", id: 501},
			{ name: "Species diversity", id: 502},
			{ name: "Ecosystems diversity", id: 503},
			{ name: "Habitats", id: 504},
			{ name: "Landscapes", id: 505},
		]
	}, {
		id: 6,
		data: [
			{ name: "Regulation and maintenance services", id: 601},
			{ name: "Provisioning services", id: 602},
			{ name: "Cultural services", id: 603},
		]
	}
];

const arrayFactor:Factor[] = [
	{
		id: 601,
		data: [
			{ name: "Biotic ( living components of an ecosystem.)", id: 60101},
			{ name: "Abiotic ( non-living physical and chemical components of an ecosystem)", id: 60102},
		]
	}, {
		id: 602,
		data: [
			{ name: "Biotic ( living components of an ecosystem.)", id: 60201},
			{ name: "Abiotic ( non-living physical and chemical components of an ecosystem)", id: 60202},
		]
	}, {
		id: 603,
		data: [
			{ name: "Biotic ( living components of an ecosystem.)", id: 60301},
			{ name: "Abiotic ( non-living physical and chemical components of an ecosystem)", id: 60302},
		]
	}
];


export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	// const filteredArray = arraySubType.filter(subCategory => subCategory.id === 20);

	// console.log(filteredArray);

	return { ok:'loader', categories: arrayCat, subcategories: [], factors: [] };
});

// export const action = createAction({
// 	fieldsDef,
// 	create: disasterRecordsCreate,
// 	update: disasterRecordsUpdate,
// 	redirectTo: (id) => `${route}/edit/${id}`
// });

// export function createAction<T>(args: CreateActionArgs<T>) {
// 	return authActionWithPerm("EditData", async (actionArgs) => {
// 		return formSave<T>({
// 			actionArgs,
// 			fieldsDef: args.fieldsDef,
// 			save: async (tx, id, data) => {
// 				if (!id) {
// 					return args.create(tx, data);
// 				} else {
// 					return args.update(tx, id, data);
// 				}
// 			},
// 			redirectTo: args.redirectTo,
// 		});
// 	});
// }



export const action = authActionWithPerm("EditData", async (actionArgs) => {
// export const action: ActionFunction = async ({ request }) => {
	const {params} = actionArgs;
	const req = actionArgs.request;
	const formData = await req.formData(); 
	let frmType = formData.get("type") || formData.get("frmType") || ''; 
	let frmSubtype = formData.get("subtype") || formData.get("frmSubtype") || ''; 
	let frmFactor = formData.get("factor") || formData.get("frmFactor") || ''; 
	let frmDescription = formData.get("description") || ''; 
	let this_showForm:boolean = false;
	let intCatetoryID:number = 0;

	const { data: subCategoryData } = arraySubType.find(subCategory => subCategory.id === Number(frmType)) || {}; 
	const { data: factorData }  = arrayFactor.find(factors => factors.id === Number(frmSubtype)) || {}; 

	if ( frmType == '6' &&  frmSubtype !== '' &&  frmFactor !== '') {
		this_showForm = true;
		intCatetoryID = typeof frmFactor === "string" ? parseInt(frmFactor) : 0;
	}
	else if (frmType != '6' && frmSubtype !== '') {
		this_showForm = true;
		intCatetoryID = typeof frmSubtype === "string" ? parseInt(frmSubtype) : 0;
	}
	
	if (this_showForm && frmDescription.toString() !== '' && intCatetoryID > 0) {

		const formRecord:PropRecord = { 
			// id: '70bc07e0-a671-4dbc-8ac8-0c21bc62a878',
			categortyId: intCatetoryID,
			disasterRecordId: String(params.id),
			description: String(frmDescription),
		};
	
		try {
			await upsertRecord(formRecord).catch(console.error);
		} catch (e) {
			console.log(e);
			throw e;
		}

		
	}


	return {
		ok: 'action', 
		subcategories: subCategoryData,
		factors: factorData,
		// form: formData2,
		showForm: this_showForm,
		frmType: frmType,
		frmSubtype: frmSubtype,
		frmFactor: frmFactor,
	// categories:categories, 
	// subcategories:subcategories,
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

	console.log( loaderData );
	console.log( actionData );
	console.log( actionData?.subcategories );
	// return (
	// 	<>
	// 		<h1>add</h1>
	// 	</>
	// );

	// return FormScreen({
	// 	fieldsDef: fieldsDef,
	// 	formComponent: DisasterRecordsForm,
	// });
	
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
				<div className="mg-grid mg-grid__col-4">
					<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
						<span><abbr title="mandatory">*</abbr>Type</span>
						</div>
						
						<select disabled={actionData?.showForm ? true : false} name="type" required onChange={handleSelectOnChangeCategories}>
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
								<select disabled={actionData?.showForm ? true : false} name="subtype" onChange={handleSelectOnChangeSubCategories}>
									<option value="">Select an option</option>
									{Array.isArray(actionData?.subcategories) && actionData.subcategories.map(item => (
										<option key={item.id} value={item.id}>{item.name}</option>
									))}
								</select>
							</label>
						</div>
					}
					{actionData?.factors &&
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
