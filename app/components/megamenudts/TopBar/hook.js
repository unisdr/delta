import { useState, useEffect } from "react";
import { Breakpoints } from './constants';

// Function to determine the current breakpoint
const getBreakpoint = (width) => {
  if (width < Breakpoints.MOBILE) return 'mobile'; // Small devices (mobile)
  else if (width < Breakpoints.TABLET) return 'mobilelandscape'; // Medium devices (mobile)
  else if (width < Breakpoints.LAPTOP) return 'tablet'; // Medium devices (tablet)
  else if (width < Breakpoints.DESKTOP) return 'laptop'; // Large devices (laptop)
  else if (width < Breakpoints.DESKTOPWIDE) return 'desktop'; // Large devices (desktop)
  else return 'desktopwide' // Extra large devices (desktop)
};


// useBreakpoint hook
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState(getBreakpoint(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};
