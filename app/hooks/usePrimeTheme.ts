// app/hooks/usePrimeTheme.ts
import { useEffect, useState } from "react";

export function usePrimeTheme(initialTheme = "lara-light-blue") {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    const themeId = "prime-theme-link";
    let link = document.getElementById(themeId) as HTMLLinkElement | null;

    const newHref = `/public/themes/${theme}/theme.css`;

    if (link) {
      // If the link exists, update href
      link.href = newHref;
    } else {
      // Otherwise, create it
      link = document.createElement("link");
      link.id = themeId;
      link.rel = "stylesheet";
      link.href = newHref;
      document.head.appendChild(link);
    }

    return () => {
      // Optional: cleanup or revert theme
    };
  }, [theme]);

  return { theme, setTheme };
}
