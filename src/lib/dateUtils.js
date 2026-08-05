const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a day input (e.g., "26" or "26-07") into a short date string "26 Jul 2026"
 * based on the active globe's monthId ("YYYY-MM").
 */
export function formatEventDate(eventDate, monthId) {
  if (!eventDate) return '';
  
  const trimmed = String(eventDate).trim();
  const dayMatch = trimmed.match(/^(\d{1,2})/);
  if (!dayMatch) return trimmed;

  const dayNum = parseInt(dayMatch[1], 10);
  if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) return trimmed;

  let monthName = '';
  let yearNum = '';

  if (monthId && monthId.includes('-')) {
    const [yearStr, monthStr] = monthId.split('-');
    const mIdx = parseInt(monthStr, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      monthName = MONTH_NAMES[mIdx];
    }
    yearNum = yearStr;
  }

  if (monthName && yearNum) {
    return `${dayNum} ${monthName} ${yearNum}`;
  }

  return trimmed;
}
