import {
  Links,
  Meta,
  Outlet,
  Scripts,
} from "@remix-run/react";

import type {LinksFunction} from "@remix-run/node";


import { NavLink } from "react-router-dom";

import appStylesHref from "./app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: appStylesHref },
];

function Nav() {
	const menu = [
		{link: "data", text: "Data"},
		{link: "analytics", text: "Analytics"},
		{link: "settings", text: "Settings"},
	]
  return (
    <nav>
      {menu.map((item, index) => (
        <NavLink
          key={index}
          to={`/${item.link}`}
          className={({ isActive, isPending }) =>
            isActive ? "active" : isPending ? "pending" : ""
          }
        >
        {item.text}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <html>
      <head>
        <link
          rel="icon"
          href="data:image/x-icon;base64,AA"
        />
        <Meta />
        <Links />
      </head>
      <body>
				<div className="top-nav">
				<Nav />
				</div>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}

