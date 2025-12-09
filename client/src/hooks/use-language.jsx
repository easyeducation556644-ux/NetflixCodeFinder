import { createContext, useContext, useState, useEffect } from "react";
import { getTranslations, detectLanguageFromCountry, detectCountry, LANGUAGES } from "@/lib/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('preferred-language') || 'en';
    }
    return 'en';
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const savedLang = localStorage.getItem('preferred-language');
      if (savedLang) {
        setLanguage(savedLang);
        setIsLoading(false);
        return;
      }

      const country = await detectCountry();
      if (country) {
        const detectedLang = detectLanguageFromCountry(country);
        setLanguage(detectedLang);
        localStorage.setItem('preferred-language', detectedLang);
      }
      setIsLoading(false);
    }

    init();
  }, []);

  const changeLanguage = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('preferred-language', langCode);
  };

  const t = getTranslations(language);
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ 
      language, 
      changeLanguage, 
      t, 
      currentLang, 
      languages: LANGUAGES,
      isLoading 
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
