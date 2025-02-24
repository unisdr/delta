interface CurrencyOptions {
    currency?: string;
    locale?: string;
}

export const formatCurrency = (value: string | number, options: CurrencyOptions = {}, scale: 'thousands' | 'millions' = 'thousands'): string => {
    let numValue = typeof value === 'string' ? parseFloat(value) : value;
    let suffix = '';
    if (scale === 'thousands') {
        numValue /= 1000;
        suffix = 'K'; // K denotes thousands
    } else if (scale === 'millions') {
        numValue /= 1000000;
        suffix = 'M'; // M denotes millions
    }
    return new Intl.NumberFormat(options.locale || 'en-US', {
        style: 'currency',
        currency: options.currency || 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numValue) + suffix;
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
interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    lastUpdated: Date;
}

// This will be implemented later to support real-time currency conversion
export const convertCurrency = async (
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
};
