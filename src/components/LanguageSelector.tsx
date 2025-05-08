import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Language } from '../types';

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: Language;
  onChange: (language: Language) => void;
  label: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  languages,
  selectedLanguage,
  onChange,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <button
        type="button"
        className="relative w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-left cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          <span className="block truncate">{selectedLanguage.nativeName} ({selectedLanguage.name})</span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
        >
          {languages.map((language) => (
            <button
              key={language.code}
              className={`relative cursor-pointer select-none py-2 pl-3 pr-9 w-full text-left ${
                language.code === selectedLanguage.code
                  ? 'bg-primary-100 text-primary-900'
                  : 'text-gray-900 hover:bg-gray-100'
              }`}
              onClick={() => {
                onChange(language);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={language.code === selectedLanguage.code}
            >
              <span className="block truncate">
                {language.nativeName} ({language.name})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;