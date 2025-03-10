import {authLoaderWithPerm} from "~/util/auth";

import {
    nonecoLossesById,
    nonecoLossesDeleteById,
} from "~/backend.server/models/noneco_losses";


import { 
    redirect,
} from "@remix-run/react";

import { json } from "@remix-run/node";


export const loader = authLoaderWithPerm("EditData", async (actionArgs) => {
    const {params} = actionArgs;
    const req = actionArgs.request;

    // Parse the request URL
    const parsedUrl = new URL(req.url);

    // Extract query string parameters
    const queryParams = parsedUrl.searchParams;
    const xId = queryParams.get('id') || ''; 

    console.log("xId: ", xId);

    const record = await nonecoLossesById(xId);
    if  ( record ) {
        try {
            // Delete noneco losses by id
            await nonecoLossesDeleteById(xId).catch(console.error);

            return redirect("/disaster-record/edit/" + params.id);
        } catch (e) {
            console.log(e);
            throw e;
        }
    }
    else {
        return json({ }, { status: 404 });
    }
});

