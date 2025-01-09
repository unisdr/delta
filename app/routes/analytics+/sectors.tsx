import React from "react";
import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

// Loader for public access without authentication
export const loader = async () => {
  return null; 
};


// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Sectors Analysis - DTS" },
    { name: "description", content: "Sector analysis page under DTS." },
  ];
};

// React component for Sectors Analysis page
export default function SectorsAnalysis() {
  return (
    <MainContainer title="Sectors Analysis" headerExtra={<NavSettings />}>
      <p className="wip-message">
        🚧 Work In Progress! This page is under construction.
      </p>
    </MainContainer>
  );
}
