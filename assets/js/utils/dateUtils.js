const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseISODate(value) {
  if (!ISO_DATE_REGEX.test(value)) {
    return null;
  }
  const [year, month, day] = value.split('-').map((segment) => parseInt(segment, 10));
  return { year, month, day };
}

function formatDMY(day, month, year) {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  const y = String(year).slice(-2);
  return `${d}/${m}/${y}`;
}

export function formatDateDMY(value) {
  const parsed = value ? parseISODate(value) : null;
  if (!parsed) {
    return '____';
  }
  return formatDMY(parsed.day, parsed.month, parsed.year);
}

export function calculateAge(birthDate, referenceDate) {
  const birth = parseISODate(birthDate);
  if (!birth) {
    return '';
  }
  const reference = referenceDate && ISO_DATE_REGEX.test(referenceDate)
    ? parseISODate(referenceDate)
    : (() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
      })();

  let age = reference.year - birth.year;
  if (reference.month < birth.month || (reference.month === birth.month && reference.day < birth.day)) {
    age -= 1;
  }
  return String(Math.max(age, 0));
}

export function todayDMY() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}

export function isISODate(value) {
  return ISO_DATE_REGEX.test(value);
}
