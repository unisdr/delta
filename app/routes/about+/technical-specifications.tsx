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
            <h2>1. System Requirements</h2>
            <p>
              <ul>
                <li>
                  <strong>Hardware Requirements:</strong> Minimum 4-core CPU,
                  8GB RAM, 100GB storage.
                </li>
                <li>
                  <strong>Operating Systems:</strong> Supported platforms (e.g.,
                  Windows, Linux, macOS, Android, iOS).
                </li>
                <li>
                  <strong>Browser Compatibility:</strong> Modern web browsers
                  like Chrome, Firefox, or Edge.
                </li>
              </ul>
            </p>
          </section>

          <section>
            <h2>2. Technology Stack</h2>
            <ul>
              <li>
                <strong>Backend Technologies</strong>
                <ul>
                  <li>Programming Language: (Node.js)</li>
                  <li>Framework : Remix.js</li>
                  <li>
                    Database: PostgreSQL for relational data management with
                    PostGIS.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Frontend Technologies</strong>
                <ul>
                  <li>Framework/library (React).</li>
                  <li>Styling tools.</li>
                </ul>
              </li>
              <li>
                <strong>APIs and Integrations:</strong>
                <ul>
                  <li>RESTful Api, SFM.</li>
                </ul>
              </li>
              <li>
                <strong>Containerization:</strong> Docker.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. System Architecture</h2>
            <ul>
              <li>Application Architecture:</li>
              <li>Data Flow:</li>
              <li>
                Security Features:
                <ul>
                  <li>Authentication methods (e.g., OAuth2, JWT).</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Functional Capabilities</h2>
          </section>

          <section>
            <h2>5. Performance Benchmarks</h2>
            <ul>
              <li>Quick response times for real-time tracking.</li>
              <li>Load-tested to handle thousands of concurrent users.</li>
              <li>Efficient data retrieval for large datasets.</li>
            </ul>
          </section>

          <section>
            <h2>6. Security Features</h2>
            <ul>
              <li>Secure authentication methods like OAuth2.</li>
              <li>Data encryption using AES-256 and TLS protocols.</li>
              <li>Compliance with GDPR and other data protection standards.</li>
            </ul>
          </section>

          <section>
            <h2>7. Deployment</h2>
            <p>
              The system is packaged as Docker containers, making it portable
              and straightforward to deploy on any infrastructure that supports
              Docker.
            </p>
          </section>

          <section>
            <h2>8. Installation Types</h2>
            DTS offers two deployment options:
            <ul>
              <li>
                <strong>Country Instance:</strong> Hosted and managed by the
                country’s local infrastructure.
              </li>
              <li>
                <strong>UNDRR Instance:</strong> Hosted on the UN Cloud System,
                providing a centralized, secure, and globally accessible
                solution.
              </li>
            </ul>
          </section>
          <section>
            <h2>9. Installing DTS as Country Instance</h2>
            <ul>
              <li>1. Clone the repository</li>
              <li>2. Install the dependencies</li>
              <li>3. Configure the environment</li>
              <li>4. Database setup</li>
              <li>5. Build and Deploy</li>
            </ul>
          </section>
          <section>
            <h2>10. Installing DTS as UNDRR Instance</h2>
            <ul>
              <li></li>
            </ul>
          </section>

          <section>
            <h2>11. Limitations and Future Enhancements</h2>
            <p>
              Future enhancements include offline capabilities and AI-based
              disaster prediction features.
            </p>
          </section>

          <section>
            <h2>12. Support and Documentation</h2>
            <p>
              The support and maintenance will be provided in-house for the
              “UNDRR instance” and for the shared code base available for all
              countries. For country specific needs, a self-help website will be
              set up with code sharing Comprehensive user manuals.
            </p>
          </section>
        </div>
      </p>
    </MainContainer>
  );
}
