import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import {resourceRepoLoader} from "~/backend.server/handlers/resourcerepo";
import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
  return resourceRepoLoader({loaderArgs})
})

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Support - DTS" },
    {
      name: "description",
      content: "Support page under DTS.",
    },
  ];
};

// React component for Support page
export default function Support() {
  return (
    <MainContainer title="Support" headerExtra={<NavSettings />}>
      <p className="wip-message">
        <section>
          <h2>Support</h2>
          <p>
            If you need support, please contact your ICT administrator or
            programme focal point for assistance.
            <br></br>
            <br></br>For technical issues, system access requests, or general
            inquiries, your ICT administrator will be able to guide you.{" "}
            <br></br>
            <br></br>For questions related to content, permissions, or
            programme-specific details, please reach out to your designated
            programme focal point.
          </p>
        </section>
      </p>
    </MainContainer>
  );
}
