import {dr, Tx} from "~/db.server";
import {authActionWithPerm, authLoaderWithPerm} from "~/util/auth";

import { MainContainer } from "~/frontend/container";
import type { MetaFunction } from "@remix-run/node";

import { useLocation } from 'react-router-dom';
import {
	PropRecord,
	upsertRecord,
	nonecoLossesById,
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

//#Category: Start
import { ContentPicker } from "~/components/ContentPicker";
import { contentPickerConfigCategory } from "./content-picker-config";
//#Category: End

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
	record: PropRecord;
	categoryDisplayName?: string;
	disRecId: string;
	formAction?: string;
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
	form?:PropsForm;
	showForm: boolean;
}

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs;
	const req = actionArgs.request;
	// get first level categories
	let arrayCat = await getCategories(null);
	let categoryDisplayName:string = '';

	// Parse the request URL
	const parsedUrl = new URL(req.url);

	// Extract query string parameters
	const queryParams = parsedUrl.searchParams;
	const xId = queryParams.get('id') || ''; 
	let record:any = {};
	let formAction = 'new';
	if (xId) {
		record = await nonecoLossesById(xId);
		console.log( xId );
		formAction = 'edit';
	}
	if ( record ) {
		categoryDisplayName = await contentPickerConfigCategory.selectedDisplay(dr, record.categortyId);
		console.log( record );
		console.log( categoryDisplayName );
	}

	// //#Category: This is how you get the display name of a sector. Syntax: selectedDisplay(dr object, sectorId)
	// const sectorDisplayName = await contentPickerConfigCategory.selectedDisplay(dr, "501");
	// //#Category: End

	return { 
		ok:'loader',
		record: record,
		categoryDisplayName: categoryDisplayName,
		disRecId: params.id,
		formAction: formAction,
	 };
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs;
	const req = actionArgs.request;
	const formData = await req.formData(); 
	let frmId = formData.get("id") || ''; 
	let frmCategoryId = formData.get("categoryId") || ''; 
	let frmDescription = formData.get("description") || ''; 
	let this_showForm:boolean = false;
	let intCatetoryIDforDB:number = 0;


	if (frmCategoryId && typeof frmCategoryId == 'string' && parseInt(frmCategoryId) > 0) {
		this_showForm = true;
		intCatetoryIDforDB = parseInt(frmCategoryId);
	}

	if (this_showForm && frmDescription.toString() !== '' && intCatetoryIDforDB > 0) {
		const formRecord:PropRecord = { 
			id: frmId && typeof frmId == 'string' ? frmId : undefined,
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
		showForm: this_showForm,
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

	const formAction = loaderData?.formAction || 'new';

	//#Category: Start
	const [showForm, setShowForm] = useState(false);
	useEffect(() => {
		if (actionData?.showForm !== undefined) {
		  setShowForm(actionData.showForm);
		}
	}, [actionData]);
	//#Category: End

	// console.log( 'CLIENT: ', loaderData );
	// console.log( 'CLIENT: ', loaderData.record.categortyId );
	// console.log( actionData );
	// console.log( actionData?.subcategories );
	
	
	const handleResetHiddenValues = (e: MouseEvent<HTMLAnchorElement>) => {
	  	e.preventDefault(); // prevent the default link behavior
		
		navigate(locationUrlPath); // navigate to the desired path
	};

  return (
	<MainContainer title="Disaster Records: Non-economic Losses">
	  <>


		  <a data-discover="true" href={`/disaster-record/edit/${ loaderData.disRecId }`}>Back to disaster record</a>
		<div className="dts-form__intro">
			<h2 className="dts-heading-2">Effects on Non-economic Losses</h2>
		</div>
		
			<Form className="dts-form" ref={formRef} name="frmFilter" id="frmFilter" method="post" onSubmit={(event) => submit(event.currentTarget)}>
				<input type="hidden" name="id" value={loaderData.record.id} readOnly={true} />
				<input ref={formRefHidden} type="hidden" name="action" defaultValue="" />

				{/* //#Category: Added ContentPicker */}
				<div className="mg-grid mg-grid__col-auto">
					<div className="form-field">
						<label>
							<div>
							<ContentPicker 
								{...contentPickerConfigCategory} 
								value={ 
									(loaderData.record && loaderData.record.categortyId ) ? 
									String(loaderData.record.categortyId) : '' 
								} //Assign the sector id here
								displayName={ loaderData.categoryDisplayName } //Assign the sector name here, from the loaderData > sectorDisplayName sample
								onSelect={(selectedItems: any) => {
									//This is where you can get the selected sector id

									console.log('selectedItems: ', selectedItems);
									console.log('loaderData: ', loaderData);

									setShowForm(true);
								}}
								disabledOnEdit={formAction === 'edit'}
							/>
							</div>
						</label>
					</div>
				</div>
				{/* //#Category: End */}

				{((loaderData.record && loaderData.record.id) || actionData?.showForm || showForm) &&
					<>
						<div>
							<label>
								<div className="dts-form-component__label">
								<span>* Description</span>
								</div>
								<textarea name="description" required rows={5} maxLength={3000} 
									defaultValue={ (loaderData.record && loaderData.record.id) ? loaderData.record.description : '' }
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
