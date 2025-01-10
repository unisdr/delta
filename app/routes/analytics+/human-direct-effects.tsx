import React from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth, authLoaderPublicOrWithPerm } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

// Loader with public access or specific permission check for "ViewData"
export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs: any) => {
  // Currently, this returns the loaderArgs as is.
  // This will be replaced with actual data fetching logic for the Human Direct Effects Analysis page.
  return { loaderArgs };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Human Direct Effects - DTS" },
    { name: "description", content: "Human direct effects page under DTS." },
  ];
};

// React component for Human Direct Effects page
export default function HumanDirectEffects() {
  return (
    <MainContainer title="Human Direct Effects Analysis" headerExtra={<NavSettings />}>
      <p className="wip-message">
        🚧 Work In Progress! This page is under construction.
      </p>
    </MainContainer>
  );
}
