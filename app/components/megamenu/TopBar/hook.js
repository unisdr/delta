import { useState, useEffect } from "react";
import { Breakpoints } from './constants';

// Function to determine the current breakpoint
const getBreakpoint = (width) => {
  if (width < Breakpoints.MOBILE) return 'mobile'; // Extra small devices
  if (width < Breakpoints.TABLET) return 'tablet'; // Small devices (mobile)
  if (width < Breakpoints.DESKTOP) return 'desktop'; // Medium devices (tablet)
  return 'desktop'
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
