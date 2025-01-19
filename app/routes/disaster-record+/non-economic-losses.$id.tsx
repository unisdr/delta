import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import {
	disasterRecordsCreate,
	disasterRecordsUpdate,
	disasterRecordsById,
} from "~/backend.server/models/disaster_record";

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
	createAction
} from "~/backend.server/handlers/form";

import { 
	useLoaderData, 
	Form, 
	redirect,
	useSubmit, 
	useNavigation,
	useActionData,
	useNavigate
  } from "@remix-run/react";

import { json, ActionFunction, LoaderFunction, } from "@remix-run/node";
import { useState, useEffect, useRef, RefObject } from 'react';

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




export const loader = async () => { 
	
	// const filteredArray = arraySubType1.filter(subCategory => subCategory.id === 20);

	// console.log(filteredArray);
	


	return { ok:'loader', categories: arrayCat, subcategories: [] };
};

// export const action = createAction({
// 	fieldsDef,
// 	create: disasterRecordsCreate,
// 	update: disasterRecordsUpdate,
// 	redirectTo: (id) => `${route}/edit/${id}`
// });

export const action: ActionFunction = async ({ request }) => {
	let formData = await request.formData(); 
	let frmType = formData.get("type"); 
	let frmSubtype = formData.get("subtype"); 
	
	console.log( formData );

	// const filteredArray:SubCategory[] = arraySubType1.filter(subCategory => subCategory.id === Number(frmType));
	const { data } = arraySubType1.find(subCategory => subCategory.id === Number(frmType)) || {}; 
	// console.log(data);

	return {
		ok: 'action', 
		subcategories: data,
	// form: formData2, 
	// categories:categories, 
	// subcategories:subcategories,
	}; 
};

interface Category { 
	id: number; 
	name: string; 
}

interface SubCategory { 
	id: number; 
	data: Category[]; 
}

type PropsLoader = { 
	ok: string; 
	categories: Category[];
};

type propsItem = { 
	id: number; 
	name: string;
};

interface PropsAction {
	ok?: string;
	error?: string;
	data?: string;
	categories?:object;
	subcategories?:SubCategory;
	form?:object;
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

const arraySubType1:SubCategory[] = [
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

export default function Screen() {
	const loaderData = useLoaderData<PropsLoader>();
	const actionData = useActionData<PropsAction>();

	const submit = useSubmit();
	const navigation = useNavigation();
	const formRef = useRef<HTMLFormElement>(null);
	const formRefHidden: RefObject<HTMLInputElement> = useRef(null);
	const formRefSubmit: RefObject<HTMLButtonElement> = useRef(null);

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

		if (e.target.value == '' && formRefSubmit.current) {
			formRefSubmit.current.style.display = 'none';
		}
		else if (e.target.value !== '' && formRefSubmit.current) {
			formRefSubmit.current.style.display = 'block';
		}
		
		
	};

	const handleSelectOnChangeCategories = (e: React.ChangeEvent<HTMLSelectElement>) => {
		console.log(e.currentTarget.value);
		console.log(e.target.value);

		if (formRefHidden.current) {
			console.log(formRefHidden.current.value = e.target.name);
		}

		// if (formRef.current) { 
		// 	formRef.current.submit(); 
		// }

		if (formRefSubmit.current) {
			formRefSubmit.current.click();
		}
		
		
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
		if (formRefSubmit.current) {
			formRefSubmit.current.style.display = 'none';
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
				<div className="mg-grid mg-grid__col-2">
					<div className="dts-form-component">
					<label>
						<div className="dts-form-component__label">
						<span><abbr title="mandatory">*</abbr>Type</span>
						</div>
						<select name="type" required onChange={handleSelectOnChangeCategories}>
							<option value="">Select a type</option>
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
								<select name="subtype" onChange={handleSelectOnChangeSubCategories}>
								<option value="">Select a sub type</option>
								{actionData?.subcategories.map(item => (
									<option key={item.id} value={item.id}>{item.name}</option>
								))}
								</select>
							</label>
						</div>
					}
				</div>


				{actionData?.subcategories &&
					<div>
						<label>
							<div className="dts-form-component__label">
							<span>* Description</span>
							</div>
							<textarea rows={5} maxLength={500} placeholder="Describe the effect of the non-economic losses to the selected criteria." style={{width:"100%", height:"500px"}}></textarea>	
						</label>
					</div>
				}

				<div className="dts-form__actions">
					
					<button ref={formRefSubmit} className="mg-button mg-button-primary" type="submit" disabled={navigation.state === "submitting"}>
						Save Changes
					</button>
				</div>

			</Form>
			
			
		






		












	  </>
	</MainContainer>
  );
}
