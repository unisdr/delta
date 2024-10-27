/**
 * String to Boolean conversation.
 * 
 * @param value 
 * @returns boolean either true or false
 */
export function stringToBoolean(value: string): boolean {
    const truthyValues = ['true', '1'];
    return truthyValues.includes(value.toLowerCase());
};