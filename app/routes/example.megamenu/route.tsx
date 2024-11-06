// Some code in this file is based on:
// https://github.com/undp/design-system
// Licensed under MIT license.

import {
	json,
} from "@remix-run/node";
import {
	useLoaderData,
	Link,
} from "@remix-run/react";
import {
	authLoader,
	authLoaderGetAuth
} from "~/util/auth";

import MegaMenuDts from '~/components/megamenudts/MegaMenuDts';

import { useState, useEffect } from "react";

export const loader = authLoader(async () => {
	return json(null);
});

export const sections = () => ([
    {
      title: 'Section 1',
      bannerHeading: 'Analytics by country',
      bannerDescription: 'Gaze upon statistics in wonder...',
      items: [
        {
          title: 'Item 1',
          subItems: Array(30).fill({ title: 'Sub-item 1', url: '#'})
        },
        {
          title: 'Item 2',
          subItems: Array(20).fill({ title: 'Sub-item 2', url: '#'})
        }
      ]
    },
  {
      title: 'Section 2',
      bannerHeading: 'Analytics by region',
      bannerDescription: 'Gaze upon statistics in wonder...',
      items: [
        {
          title: 'Item 1',
          subItems: Array(20).fill({ title: 'Sub-item 1', url: '#'})
        },
        {
          title: 'Item 2',
          subItems: Array(15).fill({ title: 'Sub-item 2', url: '#'})
        }
      ]
    }
  ])


export default function Screen(){
	// only render in the browser, not server
	// since it uses window breakpoints to know the sizing
	const [isClient, setIsClient] = useState(false);
	useEffect(() => {
		setIsClient(true);
	}, []);
	if (!isClient) return null;

	return (
		<>
			<MegaMenuDts delay={600} sections={sections()} />
		</>
	)
}
