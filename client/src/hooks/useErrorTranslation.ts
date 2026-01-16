import { useTranslation } from 'react-i18next';

/**
 * Maps backend error codes to translated user-friendly messages
 */
export const useErrorTranslation = () => {
    const { t } = useTranslation();

    const translateError = (errorCode: string): string => {
        // Handle error codes with parameters (e.g., "BID_TOO_LOW:basePrice=5")
        const [code, paramsStr] = errorCode.split(':');
        const params: Record<string, string> = {};

        if (paramsStr) {
            paramsStr.split(',').forEach(p => {
                const [key, value] = p.split('=');
                params[key] = value;
            });
        }

        // Map error code to translation key
        const translationKey = `errors.${code.toLowerCase()}`;

        // Check if translation exists, otherwise return the code itself
        const translation = t(translationKey, params);

        // If translation not found, return original error
        if (translation === translationKey) {
            return errorCode;
        }

        return translation;
    };

    return { translateError };
};
