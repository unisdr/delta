import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { resourceRepoLoader } from "~/backend.server/handlers/resourcerepo";
import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";

export const loader = authLoaderPublicOrWithPerm(
  "ViewData",
  async (loaderArgs) => {
    const resourceRepoData = await resourceRepoLoader({ loaderArgs });

    // load .md file and its append file if exist
    const { fullContent, appendContent } = await loadMarkdownContent(
      "support"
    );

    return Response.json({ resourceRepoData, fullContent, appendContent });
  }
);

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
  const { fullContent, appendContent }: any = useLoaderData();
  return (
    <MainContainer title="Support" headerExtra={<NavSettings />}>
      <div className="wip-message">
        <section>
          <h2>Support</h2>
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
