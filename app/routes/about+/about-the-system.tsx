import type { MetaFunction } from "@remix-run/node";

import { NavSettings } from "~/routes/settings/nav";
import { MainContainer } from "~/frontend/container";
import {resourceRepoLoader} from "~/backend.server/handlers/resourcerepo";
import {
	authLoaderPublicOrWithPerm,
} from "~/util/auth";


export const loader = authLoaderPublicOrWithPerm("ViewData", async (loaderArgs) => {
  return resourceRepoLoader({loaderArgs})
})

// Meta function for page SEO
export const meta: MetaFunction = ({ data }) => {
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
  return (
    <MainContainer title="About the System" headerExtra={<NavSettings />}>
      <p className="wip-message">
        <section>
          <h2>About the Disaster Tracking System</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Perspiciatis, fugiat ullam? Harum exercitationem molestiae eveniet
            tenetur. Officiis, hic ducimus nostrum quae sunt odit inventore,
            obcaecati quis amet aspernatur maxime molestias facere sint ipsam,
            cum tenetur! Qui expedita voluptatibus, eos saepe fugit in libero
            optio. Sequi, porro architecto? Quidem earum nemo ipsam quibusdam
            nisi debitis dolor libero enim minima aspernatur numquam porro
            blanditiis assumenda asperiores fuga esse quos quis iste veniam quam
            tempore, laudantium pariatur quia. Recusandae eius, nemo vitae,
            alias nihil nobis, dicta non nisi perspiciatis iure dignissimos odit
            quaerat id voluptas molestias enim amet hic? Debitis fugiat
            voluptatem maxime.
          </p>
        </section>
        <section>
          <h2>Terminologies</h2>
          <p>
            Lorem ipsum dolor sit amet consectetur, adipisicing elit. Magnam ab
            fuga voluptatum, dolore alias, aliquid assumenda error omnis tenetur
            odit quia perspiciatis aperiam maxime itaque ipsam inventore
            praesentium a odio quod officia optio iste eligendi perferendis.
            Neque officiis, voluptate et eos officia nihil vel minima eligendi
            aspernatur molestias reiciendis laborum ea, maxime accusantium.
            Fugiat odit, sint laudantium soluta fuga alias voluptates nobis
            autem eos sapiente praesentium iste odio laboriosam, inventore
            deserunt porro in magni voluptas veritatis itaque tempora hic.
            Repellat soluta unde ut dicta sapiente veniam officiis quasi, alias
            rerum, beatae commodi id. Molestias ab deserunt, pariatur similique
            enim distinctio.
          </p>
        </section>
      </p>
    </MainContainer>
  );
}
