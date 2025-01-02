import {
	useActionData,
	Link
} from "@remix-run/react";

import {MainContainer} from "~/frontend/container";

import {
	Res
} from "~/backend.server/handlers/csv_import"


interface CreateScreenArgs {
	title: string
	apiBaseUrl: string
	listUrl: string
}

export function createScreen(args: CreateScreenArgs) {
	return function () {
		let error = ""
		const actionData = useActionData<Res>();
		let submitted = false
		let imported = 0
		if (actionData) {
			submitted = true
			let res = actionData.res
			if (!res.ok) {
				if (typeof res.error == "string") {
					error = res.error
				} else if (res.error && res.error.message) {
					error = res.error.message
				} else if ('rowError' in res && res.rowError && res.rowError.message) {
					error = res.rowError.message
				} else {
					error = "Application error"
				}
			} else {
				imported = actionData.imported || 0
			}
		}

		return (
			<MainContainer
				title={args.title + " CSV Import"}
			>
				<>
					<form method="post" encType="multipart/form-data" >
						{submitted && <p>Imported or updated {imported} records </p>
						}
						{
							error ? (
								<p>{error} </p>
							) : null
						}
						<label>
							File upload < br />
							<input name="file" type="file"></input>
						</label>
						<label>
							Type < br />
							<select name="import_type" >
								<option value="upsert" > Upsert </option>
								< option value="create" > Create </option>
								< option value="update" > Update </option>
							</select>
						</label>
						<input className="mg-button mg-button-primary" type="submit" value="Submit" />
						<div>
							<Link to={args.listUrl} > Back to List </Link>
						</div>
					</form>

					<h3>Example files</h3>
					<ul>
						<li><a href={args.apiBaseUrl + "/csv-import-example?import_type=upsert"}>Upsert</a></li>
						<li><a href={args.apiBaseUrl + "/csv-import-example?import_type=create"}>Create</a></li>
						<li><a href={args.apiBaseUrl+"/csv-import-example?import_type=update"}>Update</a></li>
					</ul>
				</>
			</MainContainer>
		);
	}
}
