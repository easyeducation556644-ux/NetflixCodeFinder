import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";
import { Languages, ChevronDown } from "lucide-react";

export function LanguageSelector() {
  const { language, changeLanguage, currentLang, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[200]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white font-medium text-sm transition-all duration-300 hover:border-red-600 hover:shadow-lg hover:shadow-red-900/20"
        data-testid="button-language-selector"
      >
        <Languages className="w-5 h-5 text-red-500" />
        <span className="text-lg">{currentLang.flag}</span>
        <span>{currentLang.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div 
        className={`absolute top-full right-0 mt-2 bg-neutral-900 border border-neutral-700 rounded-xl p-2 min-w-[200px] shadow-xl shadow-black/50 transition-all duration-200 ${
          isOpen 
            ? 'opacity-100 visible translate-y-0' 
            : 'opacity-0 invisible -translate-y-2'
        }`}
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => {
              changeLanguage(lang.code);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              language === lang.code
                ? 'bg-red-600 text-white'
                : 'text-white hover:bg-neutral-800'
            }`}
            data-testid={`button-lang-${lang.code}`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
