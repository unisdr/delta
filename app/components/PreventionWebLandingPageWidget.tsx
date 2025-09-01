/**
 * PreventionWebLandingPageWidget Component
 *
 * This component dynamically loads and initializes the PreventionWeb widget script.
 * It is used to display a widget for specific landing pages on the PreventionWeb or UNDRR platforms.
 *
 * @param {string} pageId - The unique identifier for the landing page.
 * @param {"www.undrr.org" | "www.preventionweb.net"} activeDomain - The domain where the widget is active.
 * @param {boolean} [includeMetaTags=true] - Whether to include meta tags in the widget.
 * @param {boolean} [includeCss=true] - Whether to include the widget's CSS.
 * @param {"en" | "es"} [langCode="en"] - The language code for the widget (English or Spanish).
 *
 * @returns {JSX.Element} - A div containing the dynamically loaded widget.
 */

import { useEffect } from "react";

interface Props {
  pageId: string;
  activeDomain: "www.undrr.org" | "www.preventionweb.net" | "syndication.preventionweb.net";
  includeMetaTags?: boolean;
  includeCss?: boolean;
  langCode?: "en" | "es";
}

export default function PreventionWebLandingPageWidget({
  pageId,
  activeDomain,
  includeMetaTags = true,
  includeCss = true,
  langCode = "en",
}: Props) {
  useEffect(() => {
    // Dynamically load the script when the component mounts
    const script = document.createElement("script");
    script.id = pageId;
    script.src = `https://publish.preventionweb.net/widget.js?rand='${pageId}'`;
    script.type = "text/javascript";
    // script.integrity =
    //   "sha512-b6PolUa59uPjYAU+abyKpXNBPC7xOFXsyYG9T8uhnof3hsxc0GDbDPwx5d54Fu+TOxrSt55/tdS9DXWWB/jMcg==";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      // Initialize the widget after the script is loaded
      if (window.PW_Widget) {
        window.PW_Widget.initialize({
          contenttype: "landingpage",
          pageid: pageId,
          activedomain: activeDomain,
          includemetatags: includeMetaTags,
          includecss: includeCss,
          langcode: langCode,
          suffixID: pageId,
        });
      }
    };
    document.body.appendChild(script);

    // Cleanup the script on component unmount
    return () => {
      document.body.removeChild(script);
    };
  }, [pageId, activeDomain, includeMetaTags, includeCss, langCode]);

  return <div className={`pw-widget-${pageId}`}>Loading...</div>;
}
