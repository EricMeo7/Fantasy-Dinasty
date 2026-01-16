import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
      <button
        onClick={() => changeLanguage('it')}
        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${i18n.language.startsWith('it') ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
      >
        ITA
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${i18n.language.startsWith('en') ? 'bg-slate-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
      >
        ENG
      </button>
    </div>
  );
}