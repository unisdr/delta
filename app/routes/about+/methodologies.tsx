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
    { title: "Methodologies - DTS" },
    {
      name: "description",
      content: "Methodologies page under DTS.",
    },
  ];
};

// React component for About the System page
export default function Methodologies() {
  return (
    <MainContainer title="Methodologies" headerExtra={<NavSettings />}>
      <p className="wip-message">
        <section>
          <h2>Methodologies</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Officiis
            minima numquam hic doloremque praesentium vero magni amet id, fugiat
            similique nostrum cum at veritatis qui earum doloribus harum, labore
            dicta consequatur repudiandae aperiam. Molestias corporis eligendi
            optio error, dicta corrupti at a omnis numquam! Numquam amet facilis
            hic, voluptatem, consectetur adipisci sapiente laudantium
            exercitationem explicabo tenetur quasi eligendi harum commodi, ad
            soluta dicta ea illum dolorum distinctio debitis velit! Itaque
            temporibus, beatae laboriosam iure in velit necessitatibus iste amet
            ad. Fugiat assumenda ea ad enim voluptate consectetur asperiores
            quos debitis sed placeat amet, minima ut recusandae, vel officia.
            Architecto, explicabo.
          </p>
        </section>
      </p>
    </MainContainer>
  );
}
