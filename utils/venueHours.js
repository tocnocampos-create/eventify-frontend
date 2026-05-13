/**
 * Utilities for structured venue opening hours (hours_json).
 *
 * hours_json format:
 *   { mon: {open: "10:00", close: "18:30"} | null, tue: ..., ..., sun: ... }
 *
 * A null value means the venue is closed that day.
 * All times are in "HH:MM" format (24h).
 */

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

/**
 * Returns the current day key ('mon'…'sun') in Chile timezone.
 */
export function getCurrentDayKey() {
  const dayIndex = new Date().toLocaleDateString('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'short',
  });
  // 'short' weekday in es-CL: lun., mar., mié., jue., vie., sáb., dom.
  const map = {
    'lun': 'mon', 'mar': 'tue', 'mié': 'wed', 'jue': 'thu',
    'vie': 'fri', 'sáb': 'sat', 'dom': 'sun',
  };
  const prefix = dayIndex.replace('.', '').toLowerCase().trim();
  return map[prefix] || null;
}

/**
 * Returns the current time as "HH:MM" in Chile timezone.
 */
export function getCurrentTimeStr() {
  return new Date().toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Compares two "HH:MM" strings. Returns negative if a < b.
 */
function cmpTime(a, b) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

/**
 * Returns true if the venue is open right now, based on hours_json.
 * Returns null if hours_json is missing or has no data for today.
 */
export function isOpenNow(hoursJson) {
  if (!hoursJson || typeof hoursJson !== 'object') return null;
  const dayKey = getCurrentDayKey();
  if (!dayKey) return null;
  const todayHours = hoursJson[dayKey];
  if (!todayHours) return false; // null = closed today
  const now = getCurrentTimeStr();
  return cmpTime(now, todayHours.open) >= 0 && cmpTime(now, todayHours.close) < 0;
}

/**
 * Returns a display string: "Abierto · cierra a HH:MM" or "Cerrado · abre el Día a HH:MM".
 * Returns null if hours_json is not available.
 */
export function getStatusText(hoursJson) {
  const open = isOpenNow(hoursJson);
  if (open === null) return null;

  const dayKey = getCurrentDayKey();
  const todayHours = hoursJson[dayKey];

  if (open) {
    return `Abierto · cierra a las ${todayHours.close}`;
  }

  // Closed — find when it next opens
  const dayIdx = DAY_KEYS.indexOf(dayKey);
  for (let i = 1; i <= 7; i++) {
    const nextKey = DAY_KEYS[(dayIdx + i) % 7];
    const nextHours = hoursJson[nextKey];
    if (nextHours) {
      const nextName = i === 1 ? 'mañana' : DAY_NAMES[nextKey].toLowerCase();
      return `Cerrado · abre el ${nextName} a las ${nextHours.open}`;
    }
  }
  return 'Cerrado temporalmente';
}

/**
 * Returns a color string for the status badge.
 */
export function getStatusColor(hoursJson) {
  const open = isOpenNow(hoursJson);
  if (open === null) return '#888';
  return open ? '#4CAF50' : '#E57373';
}
