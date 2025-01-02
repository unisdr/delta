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
    { title: "Technical Specifications - DTS" },
    {
      name: "description",
      content: "Technical Specifications page under DTS.",
    },
  ];
};

// React component for Technical Specifications page
export default function TechnicalSpecifications() {
  return (
    <MainContainer
      title="Technical Specifications"
      headerExtra={<NavSettings />}
    >
      <p className="wip-message">
        <div>
          <section>
            <h2>Data</h2>
            <p>
              The Data section of the DLDT prototype provides functionality for
              capturing and managing disaster-related information. Users can
              enter and store data related to the effects of various hazards,
              such as damages, losses, and disruptions. The data can be
              categorized based on sectors, regions, assets, and other relevant
              parameters. This section allows users to create and manage
              records, associate effects with specific events, and track the
              cascading impact of disasters.
            </p>
          </section>
          <section>
            <h2>Analysis</h2>
            <p>
              The Analysis section of the DLDT prototype offers basic
              visualization and analysis capabilities. Users can generate charts
              and maps to explore the collected data and gain insights into the
              relationships between different variables. The prototype allows
              for the creation of custom charts and maps, empowering users to
              visualize trends and patterns based on their specific analysis
              needs.
            </p>
          </section>
          <section>
            <h2>Settings</h2>
            <p>
              The Settings section of the DLDT prototype provides options for
              configuring instance-specific settings and customization. Users
              with administrative privileges can manage map geometries, define
              region boundaries, set up translations, and manage user access and
              permissions. This section also includes options for configuring
              main menu items, instance-specific configurations, and other
              settings to tailor the DLDT prototype to specific user
              requirements.
            </p>
          </section>
        </div>
      </p>
    </MainContainer>
  );
}
