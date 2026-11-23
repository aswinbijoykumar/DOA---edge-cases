/**
 * Utility functions for date formatting and filtering across the application.
 * Requirement: The date format on the UI must be DD-MM-YY.
 */

const MONTHS_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

const MONTH_INDEX_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Format any date or timestamp into DD-MM-YY (e.g. 23-11-26).
 * Optionally include time in HH:mm if withTime is true.
 */
export function formatDateDDMMYY(val, withTime = false) {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Already in DD-MM-YY format (e.g. 15-02-26)
    if (/^\d{2}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Match DD-MMM-YY (e.g. 10-Nov-26 or 05-Nov-2026)
    const dMonY = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
    if (dMonY) {
      const dd = String(dMonY[1]).padStart(2, '0');
      const mm = MONTHS_MAP[dMonY[2].toLowerCase()] || '01';
      const yy = String(dMonY[3]).slice(-2);
      return `${dd}-${mm}-${yy}`;
    }
    // Match YYYY-MM-DD
    const isoDateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnly) {
      const [, yyyy, mm, dd] = isoDateOnly;
      return `${dd}-${mm}-${yyyy.slice(-2)}`;
    }
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy4 = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy4) {
      const dd = String(dmy4[1]).padStart(2, '0');
      const mm = String(dmy4[2]).padStart(2, '0');
      const yy = String(dmy4[3]).slice(-2);
      return `${dd}-${mm}-${yy}`;
    }
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const dateStr = `${dd}-${mm}-${yy}`;

  if (withTime) {
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dateStr} ${hh}:${min}`;
  }

  return dateStr;
}

/**
 * Parses any date representation into a JavaScript Date object.
 */
export function parseRecordDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // DD-MM-YY (e.g. 15-02-26)
    const dmy2 = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
    if (dmy2) {
      const day = parseInt(dmy2[1], 10);
      const month = parseInt(dmy2[2], 10) - 1;
      const year = 2000 + parseInt(dmy2[3], 10);
      return new Date(year, month, day);
    }
    // DD-MMM-YY (e.g. 10-Nov-26)
    const dMonY = trimmed.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})$/);
    if (dMonY) {
      const day = parseInt(dMonY[1], 10);
      const month = MONTH_INDEX_MAP[dMonY[2].toLowerCase()] ?? 0;
      let year = parseInt(dMonY[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Filter records by Last Updated Date range relative to current date.
 * Options:
 * - 'All': all dates
 * - 'yesterday': updated yesterday / within last 1 day
 * - '7days': last 7 days prior update
 * - '15days': last 15 days prior update
 * - '30days': last 30 days prior update
 */
export function matchesLastUpdatedFilter(dateVal, filterOption) {
  if (!filterOption || filterOption === 'All') return true;
  const d = parseRecordDate(dateVal);
  if (!d) return false;

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const recMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const diffDays = Math.floor((todayMidnight - recMidnight) / (1000 * 60 * 60 * 24));

  switch (filterOption) {
    case 'yesterday':
      // 0 = today, 1 = yesterday
      return diffDays <= 1 && diffDays >= 0;
    case '7days':
      return diffDays <= 7 && diffDays >= 0;
    case '15days':
      return diffDays <= 15 && diffDays >= 0;
    case '30days':
      return diffDays <= 30 && diffDays >= 0;
    default:
      return true;
  }
}
