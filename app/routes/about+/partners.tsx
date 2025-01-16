import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { resourceRepoLoader } from "~/backend.server/handlers/resourcerepo";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import path from "path";
import fs from "fs/promises";
import { marked } from "marked";
import { useLoaderData } from "@remix-run/react";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";

export const loader = authLoaderPublicOrWithPerm(
  "ViewData",
  async (loaderArgs) => {
    const resourceRepoData = await resourceRepoLoader({ loaderArgs });

    // load .md file and its append file if exist
    const { fullContent, appendContent } = await loadMarkdownContent(
      "partners"
    );

    return Response.json({ resourceRepoData, fullContent, appendContent });
  }
);

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
  const { fullContent, appendContent }: any = useLoaderData();
  return (
    <MainContainer title="Partners" headerExtra={<NavSettings />}>
      <div className="wip-message">
        <section>
          <h2>Partners</h2>
          {fullContent ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: fullContent }}
            />
          ) : (
            <>
              <PreventionWebLandingPageWidget
                pageId="16"
                activeDomain="www.undrr.org"
              />
              {appendContent && (
                <div
                  className="markdown-append-content"
                  dangerouslySetInnerHTML={{ __html: appendContent }}
                />
              )}
            </>
          )}
        </section>
      </div>
    </MainContainer>
  );
}
