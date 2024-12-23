import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth } from "~/util/auth";
import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

// Loader for authentication and user data
export const loader = authLoader(async (loaderArgs) => {
  const { user } = authLoaderGetAuth(loaderArgs);

  return { message: `Hello ${user.email}` };
});

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Partners - DTS" },
    {
      name: "description",
      content: "Partners page under DTS.",
    },
  ];
};

// React component for Partners page
export default function Partners() {
  return (
    <MainContainer title="Partners" headerExtra={<NavSettings />}>
      <p className="wip-message">
        🚧 Work In Progress! This page is under construction.
      </p>
    </MainContainer>
  );
}
