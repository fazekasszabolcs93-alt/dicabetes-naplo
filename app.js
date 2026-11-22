const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const config = window.diabetesSupabaseConfig;
const clientLibrary = window.supabase;

const authGate = $('#authGate');
const appShell = $('#appShell');
const mobileNav = $('#mobileNav');
const authForm = $('#authForm');
const authError = $('#authError');
const authHint = $('#authHint');
const entryDialog = $('#entryDialog');
const profileDialog = $('#profileDialog');
const reportDialog = $('#reportDialog');
const monthTitle = $('#monthTitle');
const calendarGrid = $('#calendarGrid');
const selectedDateTitle = $('#selectedDateTitle');
const entryList = $('#entryList');
const daySummary = $('#daySummary');

let entries = [];
let profile = {};
let currentUser = null;
let signupMode = false;
let activeUserId = null;
let loadCounter = 0;
let selected = new Date();
let viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
selected.setHours(0, 0, 0, 0);

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function sameDate(a, b) { return dateKey(a) === dateKey(b); }

function formatLong(date) {
  return new Intl.DateTimeFormat('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat('hu-HU', { month: 'long', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function localDateTime(isoValue) {
  const date = new Date(isoValue);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function numericOrNull(value) {
  if (value === '' || value == null) return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function showAuthMessage(message = '', isError = false) {
  authError.textContent = isError ? message : '';
  authHint.textContent = isError ? '' : message;
}

function setSignupMode(enabled) {
  signupMode = enabled;
  $('#authTitle').textContent = enabled ? 'Fiók létrehozása' : 'Jelentkezz be';
  $('#authSubmit').textContent = enabled ? 'Regisztráció' : 'Belépés';
  $('#authModeToggle').textContent = enabled ? 'Van már fiókod? Belépés' : 'Nincs még fiókod? Regisztráció';
  authForm.elements.password.autocomplete = enabled ? 'new-password' : 'current-password';
  showAuthMessage('');
}

function mapEntry(row) {
  return {
    id: row.id,
    dateTime: localDateTime(row.date_time),
    glucose: row.glucose == null ? '' : String(row.glucose),
    unit: row.glucose_unit || 'mmol/L',
    insulinType: row.insulin_type || 'day',
    insulinUnits: row.insulin_units == null ? '' : String(row.insulin_units),
    note: row.note || ''
  };
}

function mapProfile(row) {
  if (!row) return {};
  return {
    name: row.name || '',
    age: row.age == null ? '' : String(row.age),
    height: row.height_cm == null ? '' : String(row.height_cm),
    weight: row.weight_kg == null ? '' : String(row.weight_kg),
    diabetesType: row.diabetes_type || '',
    dayInsulinName: row.day_insulin_name || '',
    dayInsulinTimes: row.day_insulin_times == null ? '' : String(row.day_insulin_times),
    nightInsulinName: row.night_insulin_name || '',
    nightInsulinTimes: row.night_insulin_times == null ? '' : String(row.night_insulin_times)
  };
}

async function loadAccount(user) {
  const thisLoad = ++loadCounter;
  const [profileResult, entriesResult] = await Promise.all([
    window.diabetesSupabase.from('diabetes_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    window.diabetesSupabase.from('diabetes_entries').select('*').eq('user_id', user.id).order('date_time', { ascending: true })
  ]);
  if (profileResult.error) throw profileResult.error;
  if (entriesResult.error) throw entriesResult.error;
  if (thisLoad !== loadCounter) return;

  currentUser = user;
  profile = mapProfile(profileResult.data);
  entries = (entriesResult.data || []).map(mapEntry);
  activeUserId = user.id;
  $('#authEmail').textContent = user.email || '';
  authGate.hidden = true;
  appShell.hidden = false;
  mobileNav.hidden = false;
  render();
}

function showSignedOut() {
  loadCounter += 1;
  currentUser = null;
  activeUserId = null;
  entries = [];
  profile = {};
  appShell.hidden = true;
  mobileNav.hidden = true;
  authGate.hidden = false;
  $('#authEmail').textContent = '';
}

async function handleAuthSession(session) {
  if (!session?.user) {
    showSignedOut();
    return;
  }
  if (activeUserId === session.user.id && !appShell.hidden) return;
  authGate.hidden = false;
  showAuthMessage('Betöltöm a saját naplódat…');
  try {
    await loadAccount(session.user);
    showAuthMessage('');
  } catch (error) {
    activeUserId = null;
    showAuthMessage(`Nem sikerült betölteni a naplót. Ellenőrizd a Supabase Data API és az adatbázis-hozzáférés beállításait. (${error.message || 'Ismeretlen hiba'})`, true);
  }
}

function render() {
  renderCalendar();
  renderDay();
  $('#todayLabel').textContent = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
  $('#sideName').textContent = profile.name || 'Profil beállítása';
  $('#avatarInitial').textContent = profile.name ? profile.name.trim()[0].toUpperCase() : '–';
}

function renderCalendar() {
  monthTitle.textContent = formatMonth(viewMonth);
  calendarGrid.innerHTML = '';
  ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'].forEach((dayName) => {
    const element = document.createElement('div');
    element.className = 'weekday';
    element.setAttribute('role', 'columnheader');
    element.textContent = dayName;
    calendarGrid.append(element);
  });
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    const dayEntries = entries.filter((entry) => entry.dateTime?.slice(0, 10) === key);
    const hasGlucose = dayEntries.some((entry) => entry.glucose !== '' && entry.glucose != null);
    const hasInsulin = dayEntries.some((entry) => entry.insulinUnits !== '' && entry.insulinUnits != null);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `calendar-cell${day.getMonth() !== viewMonth.getMonth() ? ' outside' : ''}${sameDate(day, today) ? ' today' : ''}${sameDate(day, selected) ? ' selected' : ''}`;
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `${formatLong(day)}${dayEntries.length ? `, ${dayEntries.length} bejegyzés` : ''}`);
    cell.setAttribute('aria-pressed', sameDate(day, selected));
    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = day.getDate();
    cell.append(number);
    if (hasGlucose || hasInsulin) {
      const markers = document.createElement('span');
      markers.className = 'cell-markers';
      if (hasGlucose) {
        const marker = document.createElement('i');
        marker.className = 'marker';
        markers.append(marker);
      }
      if (hasInsulin) {
        const marker = document.createElement('i');
        marker.className = 'marker insulin';
        markers.append(marker);
      }
      cell.append(markers);
    }
    cell.addEventListener('click', () => { selected = day; renderDay(); renderCalendar(); });
    calendarGrid.append(cell);
  }
}

function renderDay() {
  selectedDateTitle.textContent = formatLong(selected);
  $('#selectedEyebrow').textContent = sameDate(selected, new Date()) ? 'MAI NAP' : 'KIVÁLASZTOTT NAP';
  const key = dateKey(selected);
  const list = entries.filter((entry) => entry.dateTime?.slice(0, 10) === key).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const glucose = list.filter((entry) => entry.glucose !== '' && entry.glucose != null);
  const insulin = list.filter((entry) => entry.insulinUnits !== '' && entry.insulinUnits != null);
  daySummary.innerHTML = `<span class="summary-chip"><i class="legend-dot"></i><strong>${glucose.length}</strong> mérés</span><span class="summary-chip"><i class="legend-dot insulin-dot"></i><strong>${insulin.length}</strong> inzulin</span>`;
  entryList.innerHTML = '';
  if (!list.length) {
    entryList.innerHTML = '<div class="empty-state"><span class="empty-icon">◷</span><strong>Még nincs bejegyzés</strong><p>A napi méréseidet és inzulinodat<br>itt találod majd.</p></div>';
    return;
  }
  for (const entry of list) {
    const card = document.createElement('article');
    card.className = 'entry-card';
    const time = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.dateTime));
    const values = [];
    if (entry.glucose !== '' && entry.glucose != null) values.push(`<span class="value-pill"><i class="legend-dot"></i>${escapeHtml(entry.glucose)} ${escapeHtml(entry.unit || 'mmol/L')}</span>`);
    if (entry.insulinUnits !== '' && entry.insulinUnits != null) {
      const period = entry.insulinType === 'night' ? 'Éjjeli' : entry.insulinType === 'day' ? 'Nappali' : '';
      values.push(`<span class="value-pill insulin"><i class="legend-dot insulin-dot"></i>${period ? `${period} inzulin · ` : 'Inzulin · '}${escapeHtml(entry.insulinUnits)} E</span>`);
    }
    card.innerHTML = `<button class="delete-entry" aria-label="Bejegyzés törlése">×</button><div class="entry-time">${time}</div><div class="entry-values">${values.join('')}</div>${entry.note ? `<p class="entry-note">${escapeHtml(entry.note)}</p>` : ''}`;
    card.querySelector('.delete-entry').addEventListener('click', async () => {
      if (!confirm('Törlöd ezt a bejegyzést?')) return;
      const { error } = await window.diabetesSupabase.from('diabetes_entries').delete().eq('id', entry.id);
      if (error) { alert(`Nem sikerült törölni: ${error.message}`); return; }
      entries = entries.filter((item) => item.id !== entry.id);
      render();
    });
    entryList.append(card);
  }
}

function openEntry() {
  const form = $('#entryForm');
  form.reset();
  $('#entryError').textContent = '';
  const date = new Date(selected);
  const now = new Date();
  date.setHours(now.getHours(), Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  form.elements.dateTime.value = local;
  form.elements.unit.value = 'mmol/L';
  form.elements.insulinType.value = 'day';
  entryDialog.showModal();
}

function openProfile() {
  const form = $('#profileForm');
  form.reset();
  for (const key of ['name', 'age', 'height', 'weight', 'diabetesType', 'dayInsulinName', 'dayInsulinTimes', 'nightInsulinName', 'nightInsulinTimes']) {
    if (profile[key] != null) form.elements[key].value = profile[key];
  }
  profileDialog.showModal();
}

function openReport() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  $('#reportStart').value = dateKey(start);
  $('#reportEnd').value = dateKey(today);
  $('#reportError').textContent = '';
  reportDialog.showModal();
}

function measurementsFor(date) {
  const key = dateKey(date);
  return entries.filter((entry) => entry.dateTime?.slice(0, 10) === key && entry.glucose !== '' && entry.glucose != null)
    .map((entry) => ({ time: entry.dateTime.slice(11, 16), value: Number(String(entry.glucose).replace(',', '.')), unit: entry.unit || 'mmol/L' }))
    .filter((measurement) => Number.isFinite(measurement.value));
}

function averageLabel(measurements) {
  if (!measurements.length) return '—';
  const groups = new Map();
  for (const measurement of measurements) {
    if (!groups.has(measurement.unit)) groups.set(measurement.unit, []);
    groups.get(measurement.unit).push(measurement.value);
  }
  return [...groups].map(([unit, values]) => `${(values.reduce((sum, value) => sum + value, 0) / values.length).toLocaleString('hu-HU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${escapeHtml(unit)} (n=${values.length})`).join('<br>');
}

function mondayOf(date) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday;
}

function generateReport() {
  const startValue = $('#reportStart').value;
  const endValue = $('#reportEnd').value;
  const error = $('#reportError');
  error.textContent = '';
  if (!startValue || !endValue || startValue > endValue) { error.textContent = 'Ellenőrizd a kezdő és záró dátumot.'; return; }
  const start = fromKey(startValue);
  const end = fromKey(endValue);
  const weeks = new Map();
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    const current = new Date(day);
    const weekStart = mondayOf(current);
    const weekKey = dateKey(weekStart);
    if (!weeks.has(weekKey)) weeks.set(weekKey, { days: [] });
    weeks.get(weekKey).days.push({ date: current, measurements: measurementsFor(current) });
  }
  const sections = [...weeks.values()].map((week) => {
    const actualStart = week.days[0].date;
    const actualEnd = week.days.at(-1).date;
    const all = week.days.flatMap((day) => day.measurements);
    const weekRange = `${new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' }).format(actualStart)} – ${new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric', year: 'numeric' }).format(actualEnd)}`;
    const rows = week.days.map((day) => {
      const dateLabel = new Intl.DateTimeFormat('hu-HU', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(day.date);
      const reading = day.measurements.length ? day.measurements.map((measurement) => `${escapeHtml(measurement.time)} — ${measurement.value.toLocaleString('hu-HU')} ${escapeHtml(measurement.unit)}`).join('<br>') : 'Nincs mérés';
      return `<tr><td>${escapeHtml(dateLabel)}</td><td>${reading}</td><td>${averageLabel(day.measurements)}</td></tr>`;
    }).join('');
    return `<section class="week"><h2>Hét: ${escapeHtml(weekRange)}</h2><p class="weekly-average">Heti átlag: <strong>${averageLabel(all)}</strong></p><table><thead><tr><th>Nap</th><th>Mért vércukor</th><th>Napi átlag</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
  const rangeLabel = `${new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(start)} – ${new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(end)}`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) { error.textContent = 'A böngésző letiltotta a jelentés ablakát. Engedélyezd az előugró ablakokat, majd próbáld újra.'; return; }
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>Vércukor-jelentés</title><style>body{font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#25342e;margin:28px auto;max-width:900px;padding:0 24px}h1{font-size:25px;margin:0 0 6px}.range,.note{color:#68766d}.week{margin:24px 0;break-inside:avoid}.week h2{font-size:17px;margin:0 0 7px;padding-bottom:7px;border-bottom:1px solid #dfe7e0}.weekly-average{background:#eef5ef;padding:9px 11px;border-radius:7px}.weekly-average span{color:#69766d;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e6ece7}th{background:#f5f8f5;color:#59675e}.note{font-size:11px;line-height:1.5;margin-top:24px}@media print{body{margin:0 auto;padding:0 10mm}.week{break-inside:avoid}h1{font-size:21px}thead{display:table-header-group}}</style></head><body><h1>Vércukor-jelentés</h1><p class="range">Időszak: ${escapeHtml(rangeLabel)}</p>${sections}<p class="note">A napi és heti átlagok a rögzített mérések számtani átlagai. A különböző mértékegységeket külön számoltuk; a „n” a figyelembe vett mérések számát jelöli. Ha az időszak nem teljes hetet fed le, a heti átlag csak a kiválasztott időszak napjait veszi figyelembe. A jelentés naplóadatokat mutat, nem ad kezelési javaslatot.</p><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250))<\/script></body></html>`);
  printWindow.document.close();
  reportDialog.close();
}

$('#authModeToggle').addEventListener('click', () => setSignupMode(!signupMode));
authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showAuthMessage('');
  const submit = $('#authSubmit');
  submit.disabled = true;
  submit.textContent = signupMode ? 'Regisztráció…' : 'Belépés…';
  const email = String(new FormData(authForm).get('email')).trim();
  const password = String(new FormData(authForm).get('password'));
  try {
    if (signupMode) {
      const { data, error } = await window.diabetesSupabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      if (data.session) await handleAuthSession(data.session);
      else showAuthMessage('Elindítottuk a regisztrációt. Nyisd meg a megerősítő levelet, és kattints a benne lévő hivatkozásra.');
    } else {
      const { data, error } = await window.diabetesSupabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await handleAuthSession(data.session);
    }
  } catch (error) {
    showAuthMessage(error.message || 'Nem sikerült csatlakozni. Próbáld újra.', true);
  } finally {
    submit.disabled = false;
    submit.textContent = signupMode ? 'Regisztráció' : 'Belépés';
  }
});

$('#signOutButton').addEventListener('click', async () => {
  const { error } = await window.diabetesSupabase.auth.signOut();
  if (error) alert(`Nem sikerült kilépni: ${error.message}`);
});

$('#prevMonth').addEventListener('click', () => { viewMonth.setMonth(viewMonth.getMonth() - 1); renderCalendar(); });
$('#nextMonth').addEventListener('click', () => { viewMonth.setMonth(viewMonth.getMonth() + 1); renderCalendar(); });
$('#todayButton').addEventListener('click', () => { selected = new Date(); selected.setHours(0, 0, 0, 0); viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1); render(); });

$$('[data-view]').forEach((button) => button.addEventListener('click', () => {
  const isDay = button.dataset.view === 'day';
  if (isDay) { selected = new Date(); selected.setHours(0, 0, 0, 0); viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1); render(); }
  if (innerWidth <= 760) $('.day-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $$('[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === button.dataset.view));
  $('#headingTitle').textContent = isDay ? 'Mai nap' : 'Naptár';
}));

['addEntryButton', 'dayAddButton', 'dayAddText', 'mobileAddButton'].forEach((id) => $('#' + id).addEventListener('click', openEntry));
['profileButton', 'mobileProfileButton'].forEach((id) => $('#' + id).addEventListener('click', openProfile));
$('#reportButton').addEventListener('click', openReport);
$('#generateReportButton').addEventListener('click', generateReport);
$$('.close-dialog').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));

$('#entryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const glucose = numericOrNull(data.get('glucose'));
  const insulinUnits = numericOrNull(data.get('insulinUnits'));
  const note = String(data.get('note')).trim();
  if (glucose == null && insulinUnits == null && !note) { $('#entryError').textContent = 'Adj meg legalább egy adatot vagy megjegyzést.'; return; }
  const dateValue = String(data.get('dateTime'));
  const row = {
    user_id: currentUser.id,
    date_time: new Date(dateValue).toISOString(),
    glucose,
    glucose_unit: glucose == null ? null : data.get('unit'),
    insulin_type: insulinUnits == null ? null : data.get('insulinType'),
    insulin_units: insulinUnits,
    note: note || null
  };
  const { data: saved, error } = await window.diabetesSupabase.from('diabetes_entries').insert(row).select('*').single();
  if (error) { $('#entryError').textContent = `Nem sikerült menteni: ${error.message}`; return; }
  entries.push(mapEntry(saved));
  selected = fromKey(dateValue.slice(0, 10));
  viewMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  entryDialog.close();
  render();
});

$('#profileForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const row = {
    user_id: currentUser.id,
    name: String(data.get('name')).trim() || null,
    age: numericOrNull(data.get('age')),
    height_cm: numericOrNull(data.get('height')),
    weight_kg: numericOrNull(data.get('weight')),
    diabetes_type: data.get('diabetesType') || null,
    day_insulin_name: String(data.get('dayInsulinName')).trim() || null,
    day_insulin_times: numericOrNull(data.get('dayInsulinTimes')),
    night_insulin_name: String(data.get('nightInsulinName')).trim() || null,
    night_insulin_times: numericOrNull(data.get('nightInsulinTimes'))
  };
  const { error } = await window.diabetesSupabase.from('diabetes_profiles').upsert(row, { onConflict: 'user_id' });
  if (error) { alert(`Nem sikerült menteni a profilt: ${error.message}`); return; }
  profile = mapProfile(row);
  profileDialog.close();
  render();
});

for (const dialog of $$('dialog')) dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

if (!config?.url || !config?.publishableKey || !clientLibrary?.createClient) {
  authGate.hidden = false;
  showAuthMessage('Hiányzik a Supabase webes beállítása. Ellenőrizd a supabase-config.js fájlt és az internetkapcsolatot.', true);
} else {
  window.diabetesSupabase = clientLibrary.createClient(config.url, config.publishableKey);
  window.diabetesSupabase.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => handleAuthSession(session)); });
  window.diabetesSupabase.auth.getSession().then(({ data, error }) => {
    if (error) showAuthMessage(`Nem sikerült ellenőrizni a bejelentkezést: ${error.message}`, true);
    else handleAuthSession(data.session);
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
