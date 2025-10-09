import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";
import { loadMarkdownContent } from "~/util/loadMarkdownContent";

export const loader = async () => {
	const { fullContent, appendContent } = await loadMarkdownContent("about");

	return Response.json({ fullContent, appendContent });
};

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "About the System - DTS" },
		{
			name: "description",
			content: "About the System page under DTS.",
		},
	];
};

// React component for About the System page
export default function AboutTheSystem() {
	const { fullContent, appendContent }: any = useLoaderData();
	return (
		<MainContainer title="About the System" headerExtra={<NavSettings />}>
			<div>
				<div className="wip-message">
					<h2>About DELTA Resilience</h2>
					{fullContent ? (
						<div
							className="markdown-content"
							dangerouslySetInnerHTML={{ __html: fullContent }}
						/>
					) : (
						<>
							<PreventionWebLandingPageWidget
								pageId="92272"
								activeDomain="syndication.preventionweb.net"
							/>
							{appendContent && (
								<div
									className="markdown-append-content"
									dangerouslySetInnerHTML={{ __html: appendContent }}
								/>
							)}
						</>
					)}
				</div>
			</div>
		</MainContainer>
	);
}
