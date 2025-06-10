import { useMatches } from "@remix-run/react";

interface RootLoaderData {
    hasPublicSite: boolean;
    loggedIn: boolean;
    flashMessage?: string;
    confSiteName: string;
    confSiteLogo: string;
    confFooterURLPrivPolicy: string;
    confFooterURLTermsConds: string;
    env: {
        CURRENCY_CODES: string;
    };
}

interface CurrencyOptions {
    currency?: string;
    locale?: string;
}

export const useDefaultCurrency = (): string => {
    const matches = useMatches();
    const rootData = matches[0]?.data as RootLoaderData;
    return rootData?.env?.CURRENCY_CODES?.split(',')[0]?.trim() || 'USD';
};

export const formatCurrencyWithCode = (value: string | number, currencyCode: string, options: CurrencyOptions = {}, scale?: 'thousands' | 'millions' | 'billions'): string => {
    // Handle null, undefined, or empty string values
    if (value === null || value === undefined || value === '') {
        return `${currencyCode} 0`;
    }

    // Convert string to number if needed
    let numValue = typeof value === 'string' ? parseFloat(value) : value;

    // Handle NaN
    if (isNaN(numValue)) {
        return `${currencyCode} 0`;
    }

    let suffix = '';
    let fractionDigits = 0;  // Default fraction digits for no scaling
    let scaledValue = numValue; // Store scaled value for fractional check

    // Apply scaling based on value size and requested scale
    if (scale === 'billions' && Math.abs(numValue) >= 1_000_000_000) {
        numValue /= 1_000_000_000;
        scaledValue = numValue; // Capture scaled value for fractional check
        suffix = 'B';
        fractionDigits = 1;  // Default to 1 decimal for billions
    } else if (scale === 'millions' && Math.abs(numValue) >= 1_000_000) {
        numValue /= 1_000_000;
        scaledValue = numValue; // Capture scaled value for fractional check
        suffix = 'M';
        fractionDigits = 1;  // Default to 1 decimal for millions
    } else if (scale === 'thousands' && Math.abs(numValue) >= 1_000) {
        numValue /= 1_000;
        suffix = 'K';
    }

    // Determine if fractional digits are necessary
    if (Math.floor(scaledValue) === scaledValue) { // Check if there is no fractional part
        fractionDigits = 0; // No fractional digits needed if number is whole
    }

    // Format the number with the appropriate currency code, and use the determined number of fraction digits
    return new Intl.NumberFormat(options.locale || 'en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
    }).format(numValue) + suffix;
};



// This is a non-hook version that uses a default currency
export const formatCurrency = (value: string | number, options: CurrencyOptions = {}, scale: 'thousands' | 'millions' | 'billions' = 'thousands'): string => {
    return formatCurrencyWithCode(value, options.currency || 'USD', options, scale);
};

export const formatNumber = (value: string | number, locale: string = 'en-US'): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat(locale).format(numValue);
};

export const formatPercentage = (value: string | number, locale: string = 'en-US'): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(numValue / 100);
};

// TODO: Add exchange rate functionality
// interface ExchangeRate {
//     from: string;
//     to: string;
//     rate: number;
//     lastUpdated: Date;
// }

// This will be implemented later to support real-time currency conversion
/*export const convertCurrency = async (
    value: number,
    fromCurrency: string,
    toCurrency: string
): Promise<number> => {
    // TODO: Implement exchange rate API integration
    // 1. Check cache for recent exchange rate
    // 2. If not found or expired, fetch from API
    // 3. Store in cache
    // 4. Convert and return
    throw new Error('Currency conversion not yet implemented');
};*/
