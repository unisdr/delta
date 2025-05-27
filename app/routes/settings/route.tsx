import {
	redirect
} from "@remix-run/node";

import { 
    Outlet,
	useLocation
 } from "@remix-run/react";

 import {
	authLoader
} from "~/util/auth";
import { NavSettings } from "./nav";




export const loader = authLoader(async ( request ) => {
	const url = new URL(request.request.url);

	if ( url.pathname === "/settings" || url.pathname === "/settings/" ) {
		return redirect("/settings/system", 303);
	}

	return {  };
});

export default function SettingsLayout() {
  const location = useLocation();

  // Check if we're on a settings page that is not a sub-page of settings
  const isSettingsPage = location.pathname.startsWith("/settings") && !location.pathname.startsWith("/settings/");

  return (
	<>
	  {/* Render NavSettings dynamically */}
	  {isSettingsPage && <NavSettings />}
	  <Outlet />
	</>
  );
}