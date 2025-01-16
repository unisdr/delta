declare global {
  interface Window {
    PW_Widget: {
      initialize: (config: {
        contenttype?: string;
        pageid?: string;
        includemetatags?: boolean;
        includecss?: boolean;
        langcode?: string;
        activedomain?: string;
        displaymode?: string;
        showfilters?: boolean;
        maxrows?: number;
        showpagination?: boolean;
        suffixID?: string;
        showfilters?: boolean;
        maxrows?:number;
        showpagination: boolean;
      }) => void;
    };
  }
}

export {};
