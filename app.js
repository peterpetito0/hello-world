'use strict';

const DEFAULT_LOCATION = {
  name: 'Boca Raton',
  region: 'Florida, United States',
  latitude: 26.3683,
  longitude: -80.1289,
};

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// WMO weather interpretation codes used by Open-Meteo.
const WEATHER_CODES = {
  0: ['Clear sky', '☀️', '🌙'],
  1: ['Mainly clear', '🌤️', '🌙'],
  2: ['Partly cloudy', '⛅', '☁️'],
  3: ['Overcast', '☁️', '☁️'],
  45: ['Fog', '🌫️'],
  48: ['Depositing rime fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Dense drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'],
  57: ['Dense freezing drizzle', '🌧️'],
  61: ['Slight rain', '🌦️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'],
  67: ['Heavy freezing rain', '🌧️'],
  71: ['Slight snow', '🌨️'],
  73: ['Snow', '🌨️'],
  75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent rain showers', '⛈️'],
  85: ['Snow showers', '🌨️'],
  86: ['Heavy snow showers', '❄️'],
  95: ['Thunderstorm', '⛈️'],
  96: ['Thunderstorm with hail', '⛈️'],
  99: ['Thunderstorm with heavy hail', '⛈️'],
};

function describe(code, isDay = 1) {
  const [label, dayIcon, nightIcon] = WEATHER_CODES[code] || ['Unknown', '🌡️'];
  return { label, icon: !isDay && nightIcon ? nightIcon : dayIcon };
}

const $ = (id) => document.getElementById(id);

const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

const state = {
  location: storage.get('weather.location') || DEFAULT_LOCATION,
  unit: storage.get('weather.unit') === 'C' ? 'C' : 'F',
  data: null,
};

// Open-Meteo returns local times ("2026-10-05T14:00") when timezone=auto.
// Parse them as UTC so formatting never shifts by the browser's own offset.
function parseLocal(iso) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : `${iso}:00Z`);
}
const fmt = (opts) => new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', ...opts });
const fmtHour = fmt({ hour: 'numeric' });
const fmtTime = fmt({ hour: 'numeric', minute: '2-digit' });
const fmtDay = fmt({ weekday: 'short' });
const fmtFull = fmt({ weekday: 'long', hour: 'numeric', minute: '2-digit' });

const round = (n) => Math.round(n);

function setStatus(message, isError = false) {
  const el = $('status');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

async function fetchWeather({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    timezone: 'auto',
    forecast_days: 7,
    temperature_unit: state.unit === 'F' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: state.unit === 'F' ? 'mph' : 'kmh',
    current: [
      'temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'is_day',
      'weather_code', 'wind_speed_10m', 'wind_direction_10m',
    ].join(','),
    hourly: ['temperature_2m', 'weather_code', 'precipitation_probability', 'is_day'].join(','),
    daily: [
      'weather_code', 'temperature_2m_max', 'temperature_2m_min',
      'precipitation_probability_max', 'sunrise', 'sunset', 'uv_index_max',
    ].join(','),
  });
  const res = await fetch(`${FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  return res.json();
}

async function load() {
  setStatus('Loading weather…');
  try {
    state.data = await fetchWeather(state.location);
    render();
    setStatus('');
  } catch (err) {
    console.error(err);
    setStatus('Could not load weather. Check your connection and try again.', true);
  }
}

function compass(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function render() {
  const { current, hourly, daily } = state.data;
  const deg = '°';
  const loc = state.location;
  const now = describe(current.weather_code, current.is_day);

  document.title = `${round(current.temperature_2m)}${deg} ${loc.name} · Weather`;
  $('place').textContent = loc.name;
  $('updated').textContent = [loc.region, fmtFull.format(parseLocal(current.time))].filter(Boolean).join(' · ');
  $('icon').textContent = now.icon;
  $('temp').textContent = `${round(current.temperature_2m)}${deg}`;
  $('desc').textContent = now.label;
  $('hilo').textContent = `H ${round(daily.temperature_2m_max[0])}${deg} · L ${round(daily.temperature_2m_min[0])}${deg}`;
  $('feels').textContent = `${round(current.apparent_temperature)}${deg}`;
  $('humidity').textContent = `${current.relative_humidity_2m}%`;
  $('wind').textContent = `${round(current.wind_speed_10m)} ${state.unit === 'F' ? 'mph' : 'km/h'} ${compass(current.wind_direction_10m)}`;
  $('precip').textContent = `${daily.precipitation_probability_max[0] ?? 0}%`;
  $('uv').textContent = daily.uv_index_max[0] != null ? daily.uv_index_max[0].toFixed(1) : '–';
  $('sun').textContent = `${fmtTime.format(parseLocal(daily.sunrise[0]))} / ${fmtTime.format(parseLocal(daily.sunset[0]))}`;

  // Hourly: start at the current hour, show 24 entries.
  const currentHour = current.time.slice(0, 13);
  let start = hourly.time.findIndex((t) => t.slice(0, 13) >= currentHour);
  if (start < 0) start = 0;
  $('hourly').replaceChildren(
    ...hourly.time.slice(start, start + 24).map((t, i) => {
      const idx = start + i;
      const w = describe(hourly.weather_code[idx], hourly.is_day[idx]);
      const pop = hourly.precipitation_probability[idx];
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="h-time">${i === 0 ? 'Now' : fmtHour.format(parseLocal(t))}</div>
        <div class="h-icon" title="${w.label}">${w.icon}</div>
        <div class="h-temp">${round(hourly.temperature_2m[idx])}${deg}</div>
        <div class="h-pop">${pop >= 10 ? `${pop}%` : ''}</div>`;
      return li;
    }),
  );

  // Daily, with a temperature range bar scaled across the week.
  const weekMin = Math.min(...daily.temperature_2m_min);
  const weekMax = Math.max(...daily.temperature_2m_max);
  const span = weekMax - weekMin || 1;
  $('daily').replaceChildren(
    ...daily.time.map((t, i) => {
      const w = describe(daily.weather_code[i]);
      const lo = daily.temperature_2m_min[i];
      const hi = daily.temperature_2m_max[i];
      const pop = daily.precipitation_probability_max[i];
      const left = ((lo - weekMin) / span) * 100;
      const width = ((hi - lo) / span) * 100;
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${i === 0 ? 'Today' : fmtDay.format(parseLocal(t))}</span>
        <span class="d-icon" title="${w.label}">${w.icon}</span>
        <span class="d-lo">${round(lo)}${deg}</span>
        <span class="range" aria-hidden="true"><span style="left:${left}%;width:${Math.max(width, 2)}%"></span></span>
        <span class="d-hi">${round(hi)}${deg} ${pop >= 10 ? `<span class="d-pop">${pop}%</span>` : ''}</span>`;
      return li;
    }),
  );

  $('unit').textContent = `°${state.unit}`;
  ['current', 'hourly-wrap', 'daily-wrap'].forEach((id) => { $(id).hidden = false; });
}

function setLocation(location) {
  state.location = location;
  storage.set('weather.location', location);
  load();
}

// ---- Search ----
const input = $('query');
const results = $('results');
let searchTimer;
let searchSeq = 0;
let matches = [];
let active = -1;

function closeResults() {
  results.hidden = true;
  results.replaceChildren();
  matches = [];
  active = -1;
}

function choose(i) {
  const m = matches[i];
  if (!m) return;
  setLocation({
    name: m.name,
    region: [m.admin1, m.country].filter(Boolean).join(', '),
    latitude: m.latitude,
    longitude: m.longitude,
  });
  input.value = '';
  input.blur();
  closeResults();
}

function highlight(i) {
  active = i;
  [...results.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
}

async function search(term) {
  const seq = ++searchSeq;
  try {
    const params = new URLSearchParams({ name: term, count: 6, language: 'en', format: 'json' });
    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const json = await res.json();
    if (seq !== searchSeq) return; // a newer search superseded this one
    matches = json.results || [];
    active = -1;
    if (!matches.length) {
      results.innerHTML = '<li aria-disabled="true"><small>No matches</small></li>';
    } else {
      results.replaceChildren(
        ...matches.map((m, i) => {
          const li = document.createElement('li');
          li.setAttribute('role', 'option');
          li.textContent = m.name;
          const small = document.createElement('small');
          small.textContent = ` ${[m.admin1, m.country].filter(Boolean).join(', ')}`;
          li.append(small);
          li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(i); });
          return li;
        }),
      );
    }
    results.hidden = false;
  } catch (err) {
    console.error(err);
    if (seq === searchSeq) setStatus('City search failed. Try again.', true);
  }
}

input.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const term = input.value.trim();
  if (term.length < 2) { searchSeq++; closeResults(); return; }
  searchTimer = setTimeout(() => search(term), 250);
});

input.addEventListener('keydown', (e) => {
  if (results.hidden || !matches.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); highlight((active + 1) % matches.length); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); highlight((active - 1 + matches.length) % matches.length); }
  else if (e.key === 'Escape') closeResults();
});

input.addEventListener('blur', closeResults);

$('search').addEventListener('submit', (e) => {
  e.preventDefault();
  if (matches.length) choose(active >= 0 ? active : 0);
});

// ---- Controls ----
$('unit').addEventListener('click', () => {
  state.unit = state.unit === 'F' ? 'C' : 'F';
  storage.set('weather.unit', state.unit);
  load();
});

$('locate').addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported by your browser.', true);
    return;
  }
  setStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => setLocation({
      name: 'My location',
      region: '',
      latitude: Number(pos.coords.latitude.toFixed(4)),
      longitude: Number(pos.coords.longitude.toFixed(4)),
    }),
    () => setStatus('Location access was denied.', true),
    { timeout: 10000 },
  );
});

load();
