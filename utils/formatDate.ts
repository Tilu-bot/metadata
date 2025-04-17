// utils/formatDate.ts

/**
 * Formats a date object into a string in YYYY-MM-DD format
 * @param date An object containing year, month, and day
 * @returns Formatted date string or null if input is invalid
 */
export function formatDate(date: { year?: number; month?: number; day?: number } | undefined): string | null {
  if (!date || !date.year || !date.month || !date.day) {
    return null;
  }

  const year = date.year.toString().padStart(4, '0');
  const month = date.month.toString().padStart(2, '0');
  const day = date.day.toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}