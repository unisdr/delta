import { authLoaderWithPerm} from "~/util/auth";

import {
	disRecSectorsById,
	deleteRecordsDeleteById,
} from "~/backend.server/models/disaster_record__sectors";


import {disruptionDeleteBySectorId} from "~/backend.server/models/disruption";
import {damagesDeleteBySectorId} from "~/backend.server/models/damages";
import {lossesDeleteBySectorId} from "~/backend.server/models/losses";

import { 
	redirect,
} from "@remix-run/react";

export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
	const {params} = actionArgs;
	const req = actionArgs.request;

	// Parse the request URL
	const parsedUrl = new URL(req.url);

	// Extract query string parameters
	const queryParams = parsedUrl.searchParams;
	const xId = queryParams.get('id') || ''; 

	const record = await disRecSectorsById(xId).catch(console.error);
	if  ( record ) {
		try {
			// Delete damages by sector id
			await damagesDeleteBySectorId(record.sectorId).catch(console.error);
	
			// Delete disruptions by sector id
			await disruptionDeleteBySectorId(record.sectorId).catch(console.error);
	
			// Delete losses by sector id
			await lossesDeleteBySectorId(record.sectorId).catch(console.error);
	
			await deleteRecordsDeleteById(xId).catch(console.error);
			return redirect("/disaster-record/edit/" + params.disRecId);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}
	else {
		return Response.json({ }, { status: 404 });
	}
});

