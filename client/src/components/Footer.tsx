import { useTranslation } from 'react-i18next';

// Footer component

export default function Footer() {
    const { t } = useTranslation();

    return (
        <footer className="w-full border-t border-white/10 bg-slate-950/50 backdrop-blur-sm py-8 mt-auto">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0">
                <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                    <p className="text-center text-sm leading-loose text-slate-400 md:text-left">
                        {t('footer.built_for')}
                        <span className="font-bold text-emerald-400 mx-1">Fantasy Dynasty NBA</span>
                        {t('footer.managers')}
                    </p>
                </div>
                <p className="text-center text-sm text-slate-500 md:text-right">
                    {t('login.beta_version')} v0.0.0.1
                </p>
            </div>
        </footer>
    );
}
