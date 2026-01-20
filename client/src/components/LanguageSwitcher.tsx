import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`w-8 h-6 rounded overflow-hidden transition-all transform hover:scale-110 ${i18n.language.startsWith('en') ? 'ring-2 ring-blue-500 shadow-lg scale-110' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}`}
        title="English"
      >
        <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
          <path fill="#bd3d44" d="M0 0h640v480H0" />
          <path stroke="#fff" strokeWidth="37" d="M0 55.3h640M0 129h640M0 202.8h640M0 276.5h640M0 350.3h640M0 424h640" />
          <path fill="#192f5d" d="M0 0h244.8v258.5H0" />
          <path fill="#fff" d="M265.2 55.3h374.8M265.2 202.8h374.8M265.2 350.3h374.8M265.2 129h374.8M265.2 276.5h374.8M265.2 424h374.8" />
          <g fill="#fff">
            <path d="M46.2 34l2 6.5h6.6L49.5 44l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM96.7 34l2 6.5h6.6L100 44l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM147.2 34l2 6.5h6.6L150.5 44l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM197.7 34l2 6.5h6.6L201 44l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6z" />
            <path d="M21 72l2 6.5h6.6L24.3 82l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM71.5 72l2 6.5h6.6L74.8 82l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM122 72l2 6.5h6.6L125.3 82l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM172.5 72l2 6.5h6.6L175.8 82l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6zM223 72l2 6.5h6.6L226.3 82l2 6.6-5.4-4-5.4 4 2-6.6-5.3-3.6h6.6z" />
          </g>
        </svg>
      </button>
      <button
        onClick={() => changeLanguage('it')}
        className={`w-8 h-6 rounded overflow-hidden transition-all transform hover:scale-110 ${i18n.language.startsWith('it') ? 'ring-2 ring-emerald-500 shadow-lg scale-110' : 'opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}`}
        title="Italiano"
      >
        <svg viewBox="0 0 640 480" className="w-full h-full object-cover">
          <g fillRule="evenodd" strokeWidth="1pt">
            <path fill="#fff" d="M0 0h640v480H0z" />
            <path fill="#009246" d="M0 0h213.3v480H0z" />
            <path fill="#ce2b37" d="M426.7 0H640v480H426.7z" />
          </g>
        </svg>
      </button>
    </div>
  );
}