import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";

import { loadMarkdownContent } from "~/util/loadMarkdownContent";
import { useLoaderData } from "@remix-run/react";
import PreventionWebLandingPageWidget from "~/components/PreventionWebLandingPageWidget";

export const loader = async () => {
	// load .md file and its append file if exist
	const { fullContent, appendContent } = await loadMarkdownContent("support");

	return Response.json({ fullContent, appendContent });
};

// Meta function for page SEO
export const meta: MetaFunction = () => {
	return [
		{ title: "Support - DELTA Resilience" },
		{
			name: "description",
			content: "Support page under DELTA Resilience.",
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
								pageId="92283"
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
				</section>
			</div>
		</MainContainer>
	);
}
