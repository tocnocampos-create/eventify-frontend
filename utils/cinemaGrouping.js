/**
 * Cinema event grouping utilities.
 *
 * Cinema scrapers generate one event per showtime. This module collapses all
 * showtimes for the same movie+venue into a single "cinema group" object so
 * the UI can show one card per movie instead of N cards for N showtimes.
 */

import dayjs from 'dayjs';

/**
 * Strip the format suffix from a cinema event title.
 * "MOVIE TITLE (3D SUBT)" → "MOVIE TITLE"
 * "MOVIE TITLE"           → "MOVIE TITLE"
 */
export function getCinemaBaseTitle(title) {
  if (!title) return '';
  const m = title.match(/^(.+?)\s*\([^)]+\)\s*$/);
  return m ? m[1].trim() : title.trim();
}

/**
 * Extract the format code from a cinema event title.
 * "MOVIE (3D SUBT)"   → "3D SUBT"
 * "MOVIE (SUBT)"      → "SUBT"
 * "MOVIE"             → "2D"
 */
export function getCinemaFormat(title) {
  if (!title) return '2D';
  const m = title.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : '2D';
}

/**
 * Groups Cine-category events by (baseTitle, venueName) into cinema group objects.
 * Non-Cine events are returned unchanged.
 *
 * Each cinema group has:
 *   _isCinemaGroup: true
 *   title:         base movie title (no format suffix)
 *   showtimes:     [{id, date, timeStart, format, url}]  sorted by date+time
 *
 * @param {Array} events  flat list of frontend event objects
 * @returns {Array}       events with cinema ones collapsed to one group per movie+venue
 */
export function groupCinemaEvents(events) {
  if (!events || events.length === 0) return events;

  const cinemaEvents = [];
  const otherEvents = [];

  for (const ev of events) {
    if ((ev.category || '').toLowerCase() === 'cine') {
      cinemaEvents.push(ev);
    } else {
      otherEvents.push(ev);
    }
  }

  if (cinemaEvents.length === 0) return events;

  const groupMap = new Map();

  for (const ev of cinemaEvents) {
    const base = getCinemaBaseTitle(ev.title);
    const venue = ev.venueName || ev.location || '';
    const key = `${base}|||${venue}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        id: `cinema-group-${key}`,
        title: base,
        category: 'Cine',
        type: 'Cine',
        venueName: ev.venueName,
        location: ev.location,
        image: ev.image,
        url: ev.url,
        description: ev.description || null,
        coordinates: ev.coordinates,
        keywords: ev.keywords || [],
        _isCinemaGroup: true,
        showtimes: [],
      });
    }

    groupMap.get(key).showtimes.push({
      id: ev.id,
      date: ev.date,
      timeStart: ev.timeStart,
      format: getCinemaFormat(ev.title),
      url: ev.url,
    });
  }

  // Sort showtimes within each group by date+time
  for (const g of groupMap.values()) {
    g.showtimes.sort((a, b) => {
      const aKey = `${a.date || ''}T${a.timeStart || '00:00'}`;
      const bKey = `${b.date || ''}T${b.timeStart || '00:00'}`;
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
  }

  return [...otherEvents, ...groupMap.values()];
}

/**
 * Returns a cinema group's showtimes structured as date sections,
 * each with format sub-groups. Filters to today onwards, max `maxDays` days.
 *
 * @returns [{date, formats: [{format, times: [timeStart]}]}]
 */
export function getCinemaSchedule(showtimes, maxDays = 7) {
  if (!showtimes || showtimes.length === 0) return [];

  const todayStr = dayjs().format('YYYY-MM-DD');
  const dateMap = new Map();

  for (const st of showtimes) {
    if (!st.date || st.date < todayStr) continue;

    if (!dateMap.has(st.date)) dateMap.set(st.date, new Map());
    const fmtMap = dateMap.get(st.date);
    const fmt = st.format || '2D';
    if (!fmtMap.has(fmt)) fmtMap.set(fmt, []);
    if (st.timeStart) fmtMap.get(fmt).push(st.timeStart);
  }

  return [...dateMap.keys()]
    .sort()
    .slice(0, maxDays)
    .map((date) => ({
      date,
      formats: [...dateMap.get(date).entries()].map(([format, times]) => ({
        format,
        times: [...new Set(times)].sort(),
      })),
    }));
}

/**
 * Human-readable label for a schedule date.
 * Today → "Hoy"  |  Tomorrow → "Mañana"  |  else "lun 28"
 */
export function formatScheduleDate(dateStr) {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  if (dateStr === today) return 'Hoy';
  if (dateStr === tomorrow) return 'Mañana';
  return dayjs(dateStr).format('ddd D');
}
