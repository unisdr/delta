import { useActionData, Link } from "@remix-run/react";

import { MainContainer } from "~/frontend/container";

import { Res } from "~/backend.server/handlers/form/csv_import";

interface CreateScreenArgs {
	title: string;
	apiBaseUrl: string;
	listUrl: string;
}

export function createScreen(args: CreateScreenArgs) {
	return function () {
		let error = "";
		const actionData = useActionData<Res>();
		let submitted = false;
		let imported = 0;
		if (actionData) {
			submitted = true;
			let res = actionData.res;
			if (!res.ok) {
				if (typeof res.error == "string") {
					error = res.error;
				} else if (res.error && res.error.message) {
					error = res.error.message;
				} else if ("rowError" in res && res.rowError && res.rowError.message) {
					error = res.rowError.message;
				} else {
					error = "Application error";
				}
			} else {
				imported = actionData.imported || 0;
			}
		}

		return (
			<MainContainer title={args.title + " CSV Import"}>
				<>
					<div className="mg-container">
						<form
							method="post"
							encType="multipart/form-data"
							className="dts-form"
						>
							{submitted && <p>Imported or updated {imported} records </p>}
							{error ? <p>{error} </p> : null}
							<div className="dts-form-component">
								<label>
									<div className="dts-form-component__label">
										<span>File upload</span>
									</div>
									<input type="file" name="file" />
								</label>
							</div>

							<div className="dts-form-component mg-grid mg-grid__col-6">
								<label>
									<div className="dts-form-component__label">
										<span>Type</span>
									</div>
									<select name="import_type">
										<option value="update"> Update </option>
										<option value="create"> Create </option>
										<option value="upsert"> Upsert </option>
									</select>
								</label>
							</div>

							<input
								className="mg-button mg-button-primary"
								type="submit"
								value="Submit"
							/>
						</form>

						<br/>
						<div>
							<Link to={args.listUrl}> Back to List </Link>
						</div>

						<br/>
						<h3>Example files</h3>
						<ul>
							<li>
								<a
									href={
										args.apiBaseUrl + "/csv-import-example?import_type=upsert"
									}
								>
									Upsert
								</a>
							</li>
							<li>
								<a
									href={
										args.apiBaseUrl + "/csv-import-example?import_type=create"
									}
								>
									Create
								</a>
							</li>
							<li>
								<a
									href={
										args.apiBaseUrl + "/csv-import-example?import_type=update"
									}
								>
									Update
								</a>
							</li>
						</ul>
					</div>
				</>
			</MainContainer>
		);
	};
}
