import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY, type Language } from '../i18n/config';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === i18n.language
  ) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (language: Language) => {
    i18n.changeLanguage(language.code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language.code);
    // Update document direction for RTL languages if needed
    document.documentElement.dir = language.direction;
    document.documentElement.lang = language.code;
  };

  if (variant === 'compact') {
    return (
      <Menu as="div" className={`relative ${className}`}>
        <Menu.Button className="flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <GlobeAltIcon className="h-5 w-5" />
        </Menu.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
            <div className="py-1 max-h-80 overflow-y-auto">
              {SUPPORTED_LANGUAGES.map((language) => (
                <Menu.Item key={language.code}>
                  {({ active }) => (
                    <button
                      onClick={() => handleLanguageChange(language)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                        active ? 'bg-slate-50' : ''
                      } ${
                        currentLanguage.code === language.code
                          ? 'text-primary-600 font-medium bg-primary-50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span>{language.nativeName}</span>
                      <span className="text-xs text-slate-400">{language.name.split(' ')[0]}</span>
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    );
  }

  return (
    <Menu as="div" className={`relative ${className}`}>
      <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200">
        <GlobeAltIcon className="h-4 w-4" />
        <span className="font-medium">{currentLanguage.nativeName}</span>
        <ChevronDownIcon className="h-4 w-4 text-slate-400" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden">
          <div className="py-1 max-h-80 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((language) => (
              <Menu.Item key={language.code}>
                {({ active }) => (
                  <button
                    onClick={() => handleLanguageChange(language)}
                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${
                      active ? 'bg-slate-50' : ''
                    } ${
                      currentLanguage.code === language.code
                        ? 'text-primary-600 font-medium bg-primary-50'
                        : 'text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{language.nativeName}</span>
                      <span className="text-xs text-slate-400">{language.name}</span>
                    </div>
                    {currentLanguage.code === language.code && (
                      <svg className="h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )}
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
