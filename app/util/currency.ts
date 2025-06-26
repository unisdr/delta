/**
 * List of systems supported currency.
 * 
  * @returns array of string
 */
export function getCurrency(): string[] {
    // below values was taken from: console.log( Intl.supportedValuesOf('currency') );
    const currency: string[] = ["AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLL", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF", "XCD", "XDR", "XOF", "XPF", "XSU", "YER", "ZAR", "ZMW", "ZWL"];

    return currency;
};

/**
 * Check if currency is in the list.
 * 
 * @param value 
 * @returns boolean either true or false
 */
export function checkValidCurrency(value: string): boolean {
    const currency = getCurrency();
    return currency.includes(value.toUpperCase());
};

export function formatNumber(value: number, locale: string = 'en-US', options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * format number without decimals
 * @param value 
 * @returns 
 */
export const formatNumberWithoutDecimals = (value: number) => {
  if (value == null || isNaN(value)) return "N/A"; 
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0, 
  }).format(value);
};


export function getCurrenciesAsListFromCommaSeparated(currencies: string): string[] {
  let value = currencies || "";
	let valueArray = [];
	let returnArray:string[] = [];
	
	// remove spaces
	value = value.replace(/\s+/g, '');
	valueArray = value.split(",");

	valueArray.forEach(function(item) { 
		if (checkValidCurrency(item)) {
			returnArray.push(item.toUpperCase());
		}
	});

	return returnArray;
};