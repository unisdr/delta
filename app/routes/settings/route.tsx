import {
	json,
	redirect
} from "@remix-run/node";

import { 
    Outlet
 } from "@remix-run/react";

 import {
	authLoader
} from "~/util/auth";




export const loader = authLoader(async ( request ) => {
	const url = new URL(request.request.url);

	if ( url.pathname === "/settings" || url.pathname === "/settings/" ) {
		return redirect("/settings/system", 303);
	}
	// console.log( url.pathname );

	return json({  });
});

export default function Settings() {
	return (
	  <div>
		<Outlet />
	  </div>
	);
}
