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
        <section>
          <h2>Partners</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Consequuntur, assumenda animi fugit itaque libero minima maxime,
            cupiditate non, a eligendi veniam esse excepturi. Ratione vero
            voluptas omnis illo impedit soluta autem facilis enim asperiores
            corporis quo, cum voluptates expedita distinctio, nobis natus magni
            quas dolor praesentium pariatur perspiciatis. Repudiandae accusamus
            laboriosam perspiciatis repellendus tempora rerum unde facere sequi
            laudantium nostrum, quod nulla mollitia obcaecati optio asperiores.
            Nobis mollitia vitae nemo nam optio ex aut! Dicta saepe tempora,
            corporis magni doloremque eveniet itaque deserunt voluptatem quae
            ipsum architecto quaerat, sed sunt iusto temporibus. Nihil animi in
            consectetur ratione? Optio, eius omnis?
          </p>
        </section>
      </p>
    </MainContainer>
  );
}
