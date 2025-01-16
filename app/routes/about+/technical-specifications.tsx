import type { MetaFunction } from "@remix-run/node";

import { authLoader, authLoaderGetAuth } from "~/util/auth";
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
      "technical-specifications"
    );

    return Response.json({ resourceRepoData, fullContent, appendContent });
  }
);

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
  return [
    { title: "Technical Specifications - DTS" },
    {
      name: "description",
      content: "Technical Specifications page under DTS.",
    },
  ];
};

// React component for Technical Specifications page
export default function TechnicalSpecifications() {
  const { fullContent, appendContent }: any = useLoaderData();
  return (
    <MainContainer
      title="Technical Specifications"
      headerExtra={<NavSettings />}
    >
      <div className="wip-message">
        <div>
          <section>
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
      </div>
    </MainContainer>
  );
}
