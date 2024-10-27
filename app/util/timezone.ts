/**
 * References: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf
 */
export function getTimezoneOffset(timeZone: string): string {
    const now = new Date();
    const tzString = now.toLocaleString('en-US', { timeZone });
    const localString = now.toLocaleString('en-US');
    const diff = (Date.parse(localString) - Date.parse(tzString)) / 3600000;
    const offset = diff + now.getTimezoneOffset() / 60;
    const offsetNormalize = -offset;

    if (offsetNormalize < 0) {
        return offsetNormalize.toString();
    }
    else if (offsetNormalize > 0) {
        return "+" + offsetNormalize.toString();
    }
    else {
        return "0";
    }
}

export function getSupportedTimeZone(): string[] {
    return Intl.supportedValuesOf('timeZone');
}

