export default {
  supportedLngs: ['en', 'ar', 'ru'],
  fallbackLng: 'en',
  defaultNS: 'common',
  // Disable react-i18next's Suspense integration for Remix
  react: { useSuspense: false },
};