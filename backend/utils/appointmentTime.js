const TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const INDIA_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const datePartsInKolkata = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
};

const todayInKolkata = (value = new Date()) => {
  const { year, month, day } = datePartsInKolkata(value);
  return `${year}-${month}-${day}`;
};

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1];
};

const weekdayForDate = (value) => {
  const [yearValue, month, day] = value.split('-').map(Number);
  const offsets = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const year = yearValue - (month < 3 ? 1 : 0);
  return (year + Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400) + offsets[month - 1] + day) % 7;
};

const addDays = (value, amount) => {
  let [year, month, day] = value.split('-').map(Number);
  const direction = amount < 0 ? -1 : 1;
  for (let count = 0; count < Math.abs(amount); count += 1) {
    day += direction;
    if (direction > 0) {
      const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day > monthDays[month - 1]) {
        day = 1;
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
    } else if (day < 1) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
      day = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    }
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const weekRangeForDate = (value) => {
  const weekday = weekdayForDate(value);
  const monday = addDays(value, -((weekday + 6) % 7));
  return { start: monday, end: addDays(monday, 6) };
};

const timeToMinutes = (value) => {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const minutesToTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const kolkataDateTimeEpoch = (date, time) => {
  const minutes = timeToMinutes(time);
  if (!isValidDate(date) || minutes === null) return null;
  const [year, month, day] = date.split('-').map(Number);
  let adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  const daysSinceEpoch = era * 146097 + dayOfEra - 719468;
  return daysSinceEpoch * DAY_MS + minutes * 60 * 1000 - INDIA_OFFSET_MS;
};

module.exports = {
  TIME_ZONE,
  addDays,
  datePartsInKolkata,
  isValidDate,
  kolkataDateTimeEpoch,
  minutesToTime,
  timeToMinutes,
  todayInKolkata,
  weekdayForDate,
  weekRangeForDate,
};
