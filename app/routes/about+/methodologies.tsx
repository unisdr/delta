import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { authLoaderPublicOrWithPerm } from "~/util/auth";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";

export const loader = authLoaderPublicOrWithPerm(
  "ViewData",
  async () => {

    // load .md file and its append file if exist
    const { fullContent, appendContent } = await loadMarkdownContent(
      "methodologies"
    );

    return Response.json({ fullContent, appendContent });
  }
);

// Meta function for page SEO
export const meta: MetaFunction = () => {
  return [
    { title: "Methodologies - DTS" },
    {
      name: "description",
      content: "Methodologies page under DTS.",
    },
  ];
};

// React component for About the System page
export default function Methodologies() {
  const { fullContent, appendContent }: any = useLoaderData();
  return (
    <MainContainer title="Methodologies" headerExtra={<NavSettings />}>
      <div className="wip-message">
        <section>
          <h2>Methodologies</h2>
          {fullContent ? (
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: fullContent }}
            />
          ) : (
            <>
              <PreventionWebLandingPageWidget
                pageId="92282"
                activeDomain="www.preventionweb.net"
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
