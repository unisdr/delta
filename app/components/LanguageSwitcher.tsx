import { useTranslation } from 'react-i18next';
import { Dropdown } from 'primereact/dropdown';
import { useFetcher } from '@remix-run/react';

interface Language {
  code: string;
  label: string;
}

const languages: Language[] = [
  { code: 'en', label: 'English'},
  { code: 'ar', label: 'العربية'},
  { code: 'ru', label: 'Русский'}
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const fetcher = useFetcher();
  const isRTL = i18n.language === 'ar';

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    // Save to session via action
    fetcher.submit(
      { lng },
      { method: 'post', action: '/api/set-language' }
    );
    // Change language immediately on client
    i18n.changeLanguage(lng);
  };

  // Custom template for displaying language options
  const languageOptionTemplate = (option: Language) => {
    return (
      <div className="flex align-items-center">
        <span>{option.label}</span>
      </div>
    );
  };

  // Template for selected value
  const selectedLanguageTemplate = (option: Language | null) => {
    if (option) {
      return (
        <div className="flex align-items-center">
          <span>{option.label}</span>
        </div>
      );
    }
    return <span>Select Language</span>;
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'inline-block' }}>
      <Dropdown
        value={currentLanguage}
        options={languages}
        onChange={(e) => changeLanguage(e.value.code)}
        optionLabel="label"
        placeholder="Select Language"
        valueTemplate={selectedLanguageTemplate}
        itemTemplate={languageOptionTemplate}
      />
    </div>
  );
}