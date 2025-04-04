import { SQL, sql } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

/**
 * Parse and validate a flexible date string for database filtering
 * @param dateStr Date string in YYYY, YYYY-MM, or YYYY-MM-DD format
 * @returns Validated date string or null if invalid
 */
export const parseFlexibleDate = (dateStr: string | null | undefined): string | null => {
  if (!dateStr) return null;

  // Validate date formats
  const dateFormats = {
    year: /^\d{4}$/,
    month: /^\d{4}-\d{2}$/,
    day: /^\d{4}-\d{2}-\d{2}$/
  };

  if (!Object.values(dateFormats).some(format => format.test(dateStr))) {
    return null;
  }

  try {
    // For YYYY format, validate year is reasonable
    if (dateFormats.year.test(dateStr)) {
      const year = parseInt(dateStr);
      if (year < 1900 || year > 2100) return null;
    }

    // For YYYY-MM and YYYY-MM-DD, validate using Date
    if (dateFormats.month.test(dateStr) || dateFormats.day.test(dateStr)) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
    }

    return dateStr;
  } catch {
    return null;
  }
};

/**
 * Create SQL condition for flexible date comparison
 * @param column Database column to compare
 * @param dateStr Date string to compare against
 * @param operator 'gte' for >= or 'lte' for <=
 */
export const createDateCondition = (
  column: PgColumn,
  dateStr: string,
  operator: 'gte' | 'lte'
): SQL => {
  const op = operator === 'gte' ? '>=' : '<=';

  return sql`
    ${column} IS NOT NULL AND 
    CASE 
      WHEN ${column} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
      THEN ${column}::date ${sql.raw(op)} ${dateStr}::date
      WHEN ${column} ~ '^[0-9]{4}-[0-9]{2}' 
      THEN ${column}::date ${sql.raw(op)} ${operator === 'gte'
      ? sql`date_trunc('month', ${dateStr}::date)`
      : sql`(date_trunc('month', ${dateStr}::date) + interval '1 month - 1 day')`
    }
      WHEN ${column} ~ '^[0-9]{4}' 
      THEN ${column}::date ${sql.raw(op)} ${operator === 'gte'
      ? sql`date_trunc('year', ${dateStr}::date)`
      : sql`(date_trunc('year', ${dateStr}::date) + interval '1 year - 1 day')`
    }
      ELSE false
    END
  `;
};

/**
 * Extract year from a date column with robust format handling
 * Handles multiple date formats and edge cases:
 * - YYYY (year only)
 * - YYYY-MM (year-month)
 * - YYYY-MM-DD (full date)
 * - Malformed dates (extracts year portion)
 * - Empty strings or NULL values
 * - Invalid date formats
 * 
 * @param dateColumn Database column containing date values
 * @returns SQL expression that extracts the year as a number
 */
export const extractYearFromDate = (dateColumn: PgColumn): SQL<number> => {
  const currentYear = new Date().getFullYear();

  // Use a simpler SQL expression that won't cause GROUP BY issues
  return sql<number>`
    COALESCE(
      CASE
        /* Handle NULL values and empty strings */
        WHEN ${dateColumn} IS NULL OR ${dateColumn} = '' 
          THEN ${currentYear}
        
        /* Valid year only: YYYY */
        WHEN ${dateColumn} ~ '^[0-9]{4}$' 
          THEN ${dateColumn}::integer
        
        /* Valid year-month: YYYY-MM or valid full date: YYYY-MM-DD */
        WHEN ${dateColumn} ~ '^[0-9]{4}-[0-9]{2}' 
          THEN SUBSTRING(${dateColumn} FROM 1 FOR 4)::integer
        
        /* Malformed dates with year at beginning: YYYY-anything */
        WHEN ${dateColumn} ~ '^[0-9]{4}-' 
          THEN SUBSTRING(${dateColumn} FROM 1 FOR 4)::integer
        
        /* Any string that starts with 4 digits */
        WHEN ${dateColumn} ~ '^[0-9]{4}' 
          THEN SUBSTRING(${dateColumn} FROM 1 FOR 4)::integer
          
        /* If none of the above patterns match, try to find a year anywhere in the string */
        ELSE NULL
      END,
      /* Final fallback: use current year */
      ${currentYear}
    )
  `;
};
