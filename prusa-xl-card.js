/* Prusa XL Card – the Prusa XL (or another PrusaLink printer) as a drawing with tool changer, growing print, progress and job buttons.
   Optional: Spoolman spools on the tool heads (tap a head to load a spool, subtract usage, set the price) and a print log.
   English and German, follows the Home Assistant language.  MIT License – see LICENSE */
const PXC_VERSION = '1.0.0';
const PXC_I18N = {
  en: {
    loc: 'en-GB', prefix: 'Please set prefix (the entity ID of your printer without "sensor.", e.g. prusa_xl)',
    st: { off: 'off', idle: 'ready', ready: 'ready', busy: 'busy', printing: 'printing', paused: 'paused', finished: 'finished', stopped: 'stopped', error: 'error', attention: 'needs you' },
    offPic: 'switched off', offText: 'The printer is off or not on the network. Job and progress appear here as soon as it is switched on.',
    eta: (day, time, left) => `done ${day ? day + ' ' : ''}at ${time}${left ? ' · ' + left + ' left' : ''}`, pause: '⏸ Pause', resume: '▶ Resume', cancel: '⏹ Cancel', confirmCancel: 'Really cancel the running print?',
    log: 'Print log', running: (t, d) => `This job has been running since ${t} · ${d}`, ok: 'done', bad: 'cancelled', time: 'print time', avg: 'on average', longest: (n, name, d) => `Longest of the last ${n}: ${name} with ${d}`, empty: 'Nothing logged yet. Count, duration and the last five jobs appear here after the next print.',
    filFor: (t) => `Filament for T${t}`, empty_head: 'nothing loaded', subtract: 'Subtract usage', remaining: 'Remaining', price: 'Spool price', pricePh: 'e.g. 19.99', save: 'Save', other: 'Load another spool', clear: 'Clear head', details: 'Details', close: 'Cancel',
    errPrice: 'Please enter a valid price, e.g. 19.99.', errUse: 'Please enter the used weight in grams.', errRem: 'Please enter a remaining weight of 0 g or more.', errBig: (n) => `The used weight is larger than what is left (${n} g).`, saving: (n) => `Saving ${n} …`, saveFail: 'Saving failed: ', back: (n, box) => `${n} back to ${box} …`, clearing: (n) => `Clearing ${n} …`, loading: (t, n) => `Loading T${t} with ${n} …`, savingShort: 'Saving …',
    speed: 'speed', cost: 'cost ≈', perKg: 'per kg', worth: 'remaining worth ≈', noPrice: 'no price, no cost estimate', remNow: 'Remaining now: ', remAfter: 'Remaining after: ', before: 'currently ',
  },
  de: {
    loc: 'de-DE', prefix: 'Bitte prefix angeben (Entitäts-ID des Druckers ohne "sensor.", z. B. prusa_xl)',
    st: { off: 'ausgeschaltet', idle: 'bereit', ready: 'bereit', busy: 'beschäftigt', printing: 'druckt', paused: 'pausiert', finished: 'fertig', stopped: 'abgebrochen', error: 'Fehler', attention: 'braucht dich' },
    offPic: 'ausgeschaltet', offText: 'Der Drucker ist aus oder nicht im Netz. Sobald er eingeschaltet wird, erscheinen hier Auftrag und Fortschritt.',
    eta: (day, time, left) => `fertig ${day ? day + ' ' : ''}um ${time} Uhr${left ? ' · noch ' + left : ''}`, pause: '⏸ Pause', resume: '▶ Fortsetzen', cancel: '⏹ Abbrechen', confirmCancel: 'Den laufenden Druck wirklich abbrechen?',
    log: 'Druckbuch', running: (t, d) => `Dieser Auftrag läuft seit ${t} Uhr · ${d}`, ok: 'fertig', bad: 'abgebrochen', time: 'Druckzeit', avg: 'im Schnitt', longest: (n, name, d) => `Längster der letzten ${n}: ${name} mit ${d}`, empty: 'Noch nichts mitgeschrieben. Ab dem nächsten Druck stehen hier Anzahl, Dauer und die letzten fünf Aufträge.',
    filFor: (t) => `Filament für T${t}`, empty_head: 'nichts eingelegt', subtract: 'Verbrauch abziehen', remaining: 'Restmenge', price: 'Preis der Spule', pricePh: 'z. B. 19,99', save: 'Speichern', other: 'Andere Spule einlegen', clear: 'Kopf leeren', details: 'Details', close: 'Abbrechen',
    errPrice: 'Bitte einen gültigen Preis eingeben, z. B. 19,99.', errUse: 'Bitte den Verbrauch in Gramm eingeben.', errRem: 'Bitte eine Restmenge ab 0 g eingeben.', errBig: (n) => `Der Verbrauch ist größer als die Restmenge (${n} g).`, saving: (n) => `Speichere Menge von ${n} …`, saveFail: 'Speichern fehlgeschlagen: ', back: (n, box) => `${n} zurück in ${box} …`, clearing: (n) => `Nehme ${n} vom Druckkopf …`, loading: (t, n) => `Belege T${t} mit ${n} …`, savingShort: 'Speichere …',
    speed: 'Tempo', cost: 'Kosten ≈', perKg: 'pro kg', worth: 'Restwert ≈', noPrice: 'ohne Preis keine Kostenschätzung', remNow: 'Rest jetzt: ', remAfter: 'Rest danach: ', before: 'bisher ',
  },
};
const PXC_LANG = (h) => { const l = ((h && ((h.locale && h.locale.language) || h.language)) || 'en').slice(0, 2); return l === 'de' ? 'de' : 'en'; };
class PrusaXlCard extends HTMLElement {
  setConfig(c) { if (!c || !c.prefix) throw new Error(PXC_I18N.en.prefix); this._c = c; this._sig = null; if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); }
  static getStubConfig(h) { const s = Object.keys((h && h.states) || {}).find((i) => /^sensor\.[a-z0-9_]+$/.test(i) && h.states[i].attributes && Array.isArray(h.states[i].attributes.options) && h.states[i].attributes.options.includes('printing')); return { prefix: s ? s.slice(7) : 'prusa_xl' }; }
  _t() { return PXC_I18N[PXC_LANG(this._hass)]; }
  _n() { const n = Number(this._c.tools); return n >= 1 && n <= 5 ? Math.round(n) : 5; }
  _money(v) { try { return v.toLocaleString(this._t().loc, { style: 'currency', currency: this._c.currency || 'EUR' }); } catch (x) { return (Math.round(v * 100) / 100) + ' ' + (this._c.currency || 'EUR'); } }
  _fmtIn(v) { return this._t().loc === 'de-DE' ? String(v).replace('.', ',') : String(v); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 'auto', min_columns: 6 }; }
  /* PrusaLink entity IDs in English and German; anything can be overridden with `entities:` */
  _ids() {
    const p = this._c.prefix, e = this._c.entities || {}, st = (this._hass && this._hass.states) || {}, pick = (...c) => c.find((x) => st[x]) || c[0];
    return Object.assign({
      state: `sensor.${p}`, progress: pick(`sensor.${p}_progress`, `sensor.${p}_fortschritt`), file: pick(`sensor.${p}_filename`, `sensor.${p}_dateiname`),
      done: pick(`sensor.${p}_print_finish`, `sensor.${p}_druck_fertig`), start: pick(`sensor.${p}_print_start`, `sensor.${p}_druckstart`), speed: pick(`sensor.${p}_print_speed`, `sensor.${p}_druckgeschwindigkeit`),
      material: `sensor.${p}_material`, pause: pick(`button.${p}_pause_job`, `button.${p}_job_pausieren`), resume: pick(`button.${p}_resume_job`, `button.${p}_job_fortsetzen`, `button.${p}_job_wiederaufnehmen`),
      cancel: pick(`button.${p}_cancel_job`, `button.${p}_job_abbrechen`), camera: pick(`camera.${p}_preview`, `camera.${p}_vorschau`),
      n_ok: pick(`counter.${p}_prints_done`, `counter.${p}_drucke_fertig`), n_bad: pick(`counter.${p}_prints_cancelled`, `counter.${p}_drucke_abgebrochen`),
      mins: pick(`input_number.${p}_print_minutes`, `input_number.${p}_druckminuten`), log: pick(`input_text.${p}_print_log`, `input_text.${p}_letzte_drucke`),
    }, e);
  }

  _spools() { const h = this._hass, loc = this._c.spool_location || '', n = this._n(), out = Array(n).fill(null); Object.keys(h.states).forEach((i) => { if (!/^sensor\.spoolman_spool_\d+$/.test(i)) return; const s = h.states[i], a = s.attributes || {}; if (a.archived || (loc && a.location !== loc)) return; const t = Number(String(a.extra_active_toolhead == null ? '' : a.extra_active_toolhead).replace(/[^0-9]/g, '')); if (!(t >= 1 && t <= n) || isNaN(parseFloat(s.state))) return; const iw = Number(a.initial_weight) || Number(a.filament_weight) || 1000; out[t - 1] = { id: i, sid: a.id, price: Number(a.price) > 0 ? Number(a.price) : null, iw, ppg: Number(a.price) > 0 ? Number(a.price) / iw : Number(a.filament_price) > 0 ? Number(a.filament_price) / (Number(a.filament_weight) || iw) : null, rem: parseFloat(s.state), name: a.filament_name || a.friendly_name || i, col: /^[0-9a-f]{6}/i.test(a.filament_color_hex || '') ? '#' + a.filament_color_hex.slice(0, 6) : '#b0b0b0' }; }); return out; }

  _tn(p) { return Number(String(p.tool == null ? '' : p.tool).replace(/[^0-9]/g, '')) || 0; }

  _all() { const h = this._hass; return Object.keys(h.states).filter((i) => /^sensor\.spoolman_spool_\d+$/.test(i)).map((i) => { const s = h.states[i], a = s.attributes || {}; return { id: i, sid: a.id, rem: parseFloat(s.state), arch: a.archived, name: a.filament_name || a.friendly_name || i, sub: [a.filament_vendor_name, a.filament_material].filter(Boolean).join(' · '), col: /^[0-9a-f]{6}/i.test(a.filament_color_hex || '') ? '#' + a.filament_color_hex.slice(0, 6) : '#b0b0b0', loc: a.location || '', tool: a.extra_active_toolhead }; }).filter((p) => !p.arch && p.sid != null && !isNaN(p.rem)).sort((p, q) => p.name.localeCompare(q.name)); }

  _num(v) { return parseFloat(String(v == null ? '' : v).replace(',', '.')); }
  async _weight() {
    const h = this._hass, P = this._pick, ids = this._ids(), T = this._t();
    if (!P || P.busy) return;
    const sp = this._spools()[P.tool - 1], use = P.mode !== 'rem', empty = String(P.val == null ? '' : P.val).trim() === '', v = empty ? (use ? 0 : sp && sp.rem) : this._num(P.val);
    if (!sp) return;
    const p0 = sp.price != null ? this._fmtIn(sp.price) : '', ps = P.price == null ? p0 : String(P.price).trim(), pr = ps === '' ? null : this._num(ps), newPrice = ps !== p0 && pr != null;
    if (newPrice && (isNaN(pr) || pr < 0)) { P.err = T.errPrice; this._render(ids); return; }
    if (isNaN(v) || v < 0) { P.err = use ? T.errUse : T.errRem; this._render(ids); return; }
    if (use && v > sp.rem + 0.05) { P.err = T.errBig(Math.round(sp.rem)); this._render(ids); return; }
    P.busy = true; P.err = ''; P.msg = T.saving(sp.name); this._render(ids);
    try {
      const patch = { id: sp.sid };
      if (newPrice) patch.price = pr;
      if (!use && Math.abs(v - sp.rem) > 0.05) patch.remaining_weight = v;
      if (Object.keys(patch).length > 1) await h.callService('spoolman', 'patch_spool', patch);
      if (use && v > 0) await h.callService('spoolman', 'use_spool_filament', { id: sp.sid, use_weight: v });
      this._pick = null;
    } catch (x) { P.busy = false; P.err = T.saveFail + ((x && x.message) || x); }
    this._render(ids);
  }

  async _assign(tool, sp) {
    const h = this._hass, c = this._c, P = this._pick, ids = this._ids(), loc = c.spool_location || '', box = c.storage_location || '', T = this._t(), wait = c.wait_ms != null ? Number(c.wait_ms) : 1500;
    if (!P || P.busy) return;
    const old = this._all().filter((p) => this._tn(p) === tool && (!sp || p.id !== sp.id));
    P.busy = true; P.err = ''; const names = old.map((p) => p.name).join(', ');
    P.msg = old.length ? (box ? T.back(names, box) : T.clearing(names)) : T.savingShort; this._render(ids);
    try {
      for (const o of old) await h.callService('spoolman', 'patch_spool', Object.assign({ id: o.sid, extra: { active_toolhead: '' } }, box ? { location: box } : {}));
      if (sp) {
        if (old.length) { await new Promise((r) => setTimeout(r, wait)); P.msg = T.loading(tool, sp.name); this._render(ids); }
        await h.callService('spoolman', 'patch_spool', Object.assign({ id: sp.sid, extra: { active_toolhead: String(tool) } }, loc ? { location: loc } : {}));
      }
      this._pick = null;
    } catch (x) { P.busy = false; P.err = T.saveFail + ((x && x.message) || x); }
    this._render(ids);
  }

  set hass(h) {
    this._hass = h;
    const ids = this._ids(), sig = Object.values(ids).map((i) => (h.states[i] ? h.states[i].state : '-')).join('|') + '#' + (h.states[ids.camera] ? h.states[ids.camera].attributes.entity_picture : '') + '#' + this._spools().map((x) => (x ? x.rem + x.col + x.name : '')).join('|') + '#' + this._all().map((x) => x.id + x.rem + x.loc + x.tool).join('|');
    const ae = this.shadowRoot && this.shadowRoot.activeElement;
    if (sig !== this._sig && !(ae && ae.classList && ae.classList.contains('pin'))) { this._sig = sig; this._render(ids); }
  }

  _render(ids) {
    const h = this._hass, c = this._c, T = this._t(), L = T.loc, S = (k) => h.states[ids[k]], ok = (s) => s && !['unknown', 'unavailable', ''].includes(s.state);
    const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    const st = S('state'), sv = ok(st) ? st.state : 'off', off = sv === 'off', printing = sv === 'printing', paused = sv === 'paused', done = sv === 'finished', err = sv === 'error' || sv === 'attention', busy = printing || sv === 'busy';
    const pr = ok(S('progress')) && !isNaN(Number(S('progress').state)) ? Math.max(0, Math.min(100, Number(S('progress').state))) : null, job = printing || paused || done;
    const LBL = T.st;
    const lvl = off ? 'off' : err ? 'bad' : printing || busy ? 'run' : paused ? 'warn' : done ? 'ok' : 'idle';
    const OR = '#fa6831', FR = off ? '#45474b' : '#1d1e21', ORA = off ? '#7a4a38' : OR, part = job && pr != null ? pr / 100 : done ? 1 : 0, ph = 6 + part * 60;
    const SPL = this._spools(), hasSp = SPL.some(Boolean), ALL = c.spoolman === false ? [] : this._all(), showSp = c.spoolman !== false && (hasSp || ALL.length > 0), PK = this._pick, NT = this._n();
    const pk = PK ? `<div class="pk"><div class="pkh">${esc(T.filFor(PK.tool))}</div>${PK.busy ? `<div class="pkm">${esc(PK.msg)}</div>` : `${PK.err ? `<div class="pke">${esc(PK.err)}</div>` : ''}${SPL[PK.tool - 1] ? `<div class="pw"><div class="pws"><button class="pm${PK.mode !== 'rem' ? ' on' : ''}" data-m="use">${T.subtract}</button><button class="pm${PK.mode === 'rem' ? ' on' : ''}" data-m="rem">${T.remaining}</button></div><div class="pwr"><input class="pin" type="text" inputmode="decimal" autocomplete="off" value="${esc(PK.val || '')}" placeholder="${PK.mode === 'rem' ? Math.round(SPL[PK.tool - 1].rem) : '0'}"><span>g</span></div><div class="pwi"></div><div class="pwr"><span class="pwl">${T.price}</span><input class="pin pp" type="text" inputmode="decimal" autocomplete="off" value="${esc(PK.price != null ? PK.price : SPL[PK.tool - 1].price != null ? this._fmtIn(SPL[PK.tool - 1].price) : '')}" placeholder="${esc(T.pricePh)}"><span>${esc(c.currency || '€')}</span><button class="bt pr" data-w="1">${T.save}</button></div><div class="pwi pph"></div></div><div class="pkh">${T.other}</div>` : ''}<div class="pkl">${ALL.map((p) => { const t = this._tn(p); return `<button class="pki${t === PK.tool ? ' on' : ''}" data-s="${p.id}"><span class="dot" style="background:${p.col}"></span><span class="sn">${esc(p.name)}${p.sub ? ` <small>${esc(p.sub)}</small>` : ''}</span><i>${Math.round(p.rem)} g · ${t ? 'T' + t + ' · ' : ''}${esc(p.loc)}</i></button>`; }).join('')}</div><div class="pka">${ALL.some((p) => this._tn(p) === PK.tool) ? `<button data-a="clear">${T.clear}</button>` : ''}${SPL[PK.tool - 1] ? `<button data-a="info">${T.details}</button>` : ''}<span class="fx"></span><button data-a="close">${T.close}</button></div>`}</div>` : '';
    const cam = ok(S('camera')) && S('camera').attributes.entity_picture && job ? (h.hassUrl ? h.hassUrl(S('camera').attributes.entity_picture) : S('camera').attributes.entity_picture) : '';
    const TX = (i) => 86 + i * 32, SPOS = [[22, 104], [22, 146], [22, 188], [278, 118], [278, 168]].slice(0, NT);
    const tools = SPOS.map((_, i) => { const x = TX(i), sp = SPL[i]; return `<g><path d="M${x},70 V30 q0,-14 9,-14 q8,0 8,12 V58" fill="none" stroke="#17181a" stroke-width="5" stroke-linecap="round"/><path d="M${x - 4},70 V34 q0,-12 6,-14" fill="none" stroke="${sp ? sp.col : '#9aa0a8'}" stroke-width="1.6" stroke-linecap="round" opacity=".95"/><rect x="${x - 9}" y="64" width="18" height="24" rx="3" fill="#26282c"/><rect x="${x + 5}" y="68" width="4" height="12" rx="1" fill="${ORA}"/><rect x="${x - 6}" y="67" width="9" height="${sp ? 8 : 3}" rx="1.5" fill="${sp ? sp.col : '#3a3d42'}" stroke="rgba(255,255,255,.3)" stroke-width=".5"/><path d="M${x - 3},88 h6 l-3,5z" fill="#8e9299"/>${hasSp ? `<text x="${x}" y="58" text-anchor="middle" font-size="6.5" font-weight="700" font-family="sans-serif" fill="#fff" stroke="#17181a" stroke-width="2.2" paint-order="stroke">T${i + 1}</text>` : ''}</g>`; }).join('');
    const spools = hasSp ? SPOS.map((q, i) => { const sp = SPL[i], lf = q[0] < 150, ax = lf ? 40 : 260; return `${sp ? `<path d="M${q[0]},${q[1] - 17} C${q[0]},${20 + i * 3} ${TX(i) - 4},${-6 + i * 2} ${TX(i) - 4},34" fill="none" stroke="${sp.col}" stroke-width="1.5" opacity=".9"/>` : ''}<rect x="${Math.min(q[0], ax)}" y="${q[1] - 2}" width="${Math.abs(ax - q[0])}" height="4" fill="#2c2e32"/><ellipse cx="${q[0]}" cy="${q[1]}" rx="10" ry="19" fill="#e4e6e9" stroke="#aeb3ba"/><ellipse cx="${q[0]}" cy="${q[1]}" rx="7.5" ry="15.5" fill="${sp ? sp.col : 'none'}" stroke="${sp ? 'rgba(0,0,0,.25)' : '#c5c9ce'}" stroke-dasharray="${sp ? '0' : '2 2'}"/><ellipse cx="${q[0]}" cy="${q[1]}" rx="2.6" ry="5" fill="#2c2e32"/><circle cx="${lf ? q[0] - 9 : q[0] + 9}" cy="${q[1]}" r="3.4" fill="#17181a"/>`; }).join('') : '';
    const spl = showSp ? `<div class="sps">${SPL.map((x, i) => `<div class="sp${x && x.rem <= (c.low || 100) ? ' lo' : ''}${PK && PK.tool === i + 1 ? ' se' : ''}" data-t="${i + 1}"><span class="dot" style="background:${x ? x.col : 'transparent'}"></span><b>T${i + 1}</b><span class="sn">${x ? esc(x.name) : esc(T.empty_head)}</span><i>${x ? Math.round(x.rem) + ' g' : ''}</i></div>`).join('')}</div>${pk}` : '';
    const top = 204 - (cam ? 96 * Math.max(part, 0.04) : ph), gy = Math.max(100, top - 12);
    const head = printing || paused ? `<rect x="56" y="${gy.toFixed(1)}" width="188" height="4" rx="2" fill="#3a3d42"/><g${printing ? ' class="mv"' : ''}><rect x="142" y="${(gy - 8).toFixed(1)}" width="16" height="16" rx="3" fill="#2c2e32" stroke="${OR}" stroke-width="1"/><path d="M147,${(gy + 8).toFixed(1)} h6 l-3,5z" fill="#b8bcc2"/></g>` : '';
    const tick = done ? '<circle cx="150" cy="150" r="13" fill="#2e9b57"/><path d="M143.5,150 l4.5,4.5 l8,-9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' : '';
    const obj = cam ? `<defs><clipPath id="pc"><rect x="60" y="${(204 - 96 * part).toFixed(1)}" width="180" height="${(96 * part).toFixed(1)}"/></clipPath></defs><image href="${esc(cam)}" x="90" y="108" width="120" height="96" preserveAspectRatio="xMidYMax meet" opacity=".22"/><image href="${esc(cam)}" x="90" y="108" width="120" height="96" preserveAspectRatio="xMidYMax meet" clip-path="url(#pc)"/>${tick}` : part > 0 ? `<g><rect x="124" y="${(204 - ph).toFixed(1)}" width="52" height="${ph.toFixed(1)}" rx="3" fill="${OR}" opacity=".92"/>${Array.from({ length: Math.floor(ph / 5) }, (_, k) => `<line x1="124" x2="176" y1="${(204 - k * 5 - 2.5).toFixed(1)}" y2="${(204 - k * 5 - 2.5).toFixed(1)}" stroke="rgba(0,0,0,.18)" stroke-width=".8"/>`).join('')}${tick}</g>` : '';
    const scr = off ? '#0c0d0f' : err ? '#ff5a4f' : printing ? OR : paused ? '#ffb300' : done ? '#43d17a' : '#f3f3f0';
    const pic = `<svg viewBox="0 0 300 246" class="pic${off ? ' off' : ''}">
<ellipse cx="150" cy="236" rx="126" ry="6" fill="rgba(0,0,0,.16)"/>
${spools}
<rect x="40" y="62" width="220" height="162" rx="3" fill="${FR}"/>
<rect x="52" y="92" width="196" height="118" fill="${off ? '#2c2e31' : '#0e0f11'}"/>
<rect x="52" y="92" width="3.5" height="118" fill="${ORA}"/><rect x="244.5" y="92" width="3.5" height="118" fill="${ORA}"/>
<rect x="48" y="84" width="204" height="4" fill="#4a4d52"/>
${[[40, 62], [248, 62], [40, 212], [248, 212]].map((q) => `<rect x="${q[0]}" y="${q[1]}" width="12" height="12" rx="2" fill="#2c2e32"/>`).join('')}
${tools}
${[0, 1, 2].map((k) => `<rect x="${118 + k * 26}" y="186" width="12" height="16" rx="1.5" fill="#1c1d20"/>`).join('')}
${obj}${head}
<rect x="64" y="204" width="172" height="4" rx="1.5" fill="${off ? '#5a554d' : '#7a6a52'}"/><rect x="60" y="208" width="180" height="3" fill="#2b2d31"/>
<rect x="36" y="222" width="228" height="8" rx="2" fill="${ORA}"/><rect x="40" y="222" width="220" height="6" rx="2" fill="${FR}"/>
<rect x="124" y="216" width="52" height="24" rx="3" fill="#17181a"/><rect x="129" y="220" width="30" height="16" rx="2" fill="${scr}"${printing ? '><animate attributeName="opacity" values="1;.6;1" dur="1.6s" repeatCount="indefinite"/></rect>' : '/>'}
${!off ? `<text x="144" y="231" text-anchor="middle" font-size="7" font-weight="700" font-family="sans-serif" fill="#1d1e21">${pr != null && job ? Math.round(pr) + ' %' : 'XL'}</text>` : ''}
<circle cx="167" cy="228" r="4.5" fill="#2c2e32" stroke="${ORA}" stroke-width="1.6"/>
${off ? '<text x="150" y="154" text-anchor="middle" font-size="12" font-family="sans-serif" fill="#9a9fa6">' + esc(T.offPic) + '</text>' : ''}
</svg>`;
    const file = ok(S('file')) ? S('file').state : '', mat = ok(S('material')) ? S('material').state : '', sp = ok(S('speed')) ? S('speed').state : '';
    const dn = ok(S('done')) && !isNaN(new Date(S('done').state)) ? new Date(S('done').state) : null, now = new Date();
    const eta = dn && (printing || paused) ? T.eta(dn.toDateString() === now.toDateString() ? '' : dn.toLocaleDateString(L, { weekday: 'short' }), dn.toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit' }), dn > now ? `${Math.floor((dn - now) / 36e5) ? Math.floor((dn - now) / 36e5) + ' h ' : ''}${Math.round(((dn - now) % 36e5) / 6e4)} min` : '') : '';
    const btn = (k, label, cls) => (S(k) && S(k).state !== 'unavailable' ? `<button class="bt ${cls || ''}" data-k="${k}">${label}</button>` : '');
    const acts = printing ? btn('pause', T.pause) + btn('cancel', T.cancel, 'dg') : paused ? btn('resume', T.resume, 'pr') + btn('cancel', T.cancel, 'dg') : '';
    const D = (m) => (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '') : m + ' min').trim(), num = (k) => (ok(S(k)) && !isNaN(Number(S(k).state)) ? Number(S(k).state) : 0);
    const nOk = num('n_ok'), nBad = num('n_bad'), mins = Math.round(num('mins'));
    const log = (ok(S('log')) ? S('log').state.split('¦') : []).map((e) => e.split('~')).filter((e) => e.length >= 4).map((e) => ({ k: /^\d+$/.test(e[0]) ? e[0] : '', t: new Date(Number(e[0]) * 6e4), d: Number(e[1]), ok: e[2] === '1', n: e.slice(3).join('~') }));
    const longest = log.filter((e) => e.ok).sort((a, b) => b.d - a.d)[0];
    const st0 = ok(S('start')) && !isNaN(new Date(S('start').state)) && (printing || paused) ? new Date(S('start').state) : null;
    const tp = c.thumbnails === false ? '' : c.thumbnails || '/local/druckbuch';
    const stats = S('n_ok') && c.show_log !== false ? `<div class="st"><div class="sh">${T.log}</div>${st0 ? `<div class="su">${esc(T.running(st0.toLocaleTimeString(L, { hour: '2-digit', minute: '2-digit' }), D(Math.max(0, Math.round((now - st0) / 6e4)))))}</div>` : ''}${nOk + nBad ? `<div class="kp"><div><b>${nOk}</b><span>${T.ok}</span></div><div><b>${nBad}</b><span>${T.bad}</span></div><div><b>${D(mins)}</b><span>${T.time}</span></div><div><b>${nOk ? D(Math.round(mins / nOk)) : '–'}</b><span>${T.avg}</span></div></div>${log.map((e) => `<div class="lg">${tp ? (e.k ? `<img class="lt" src="${esc(tp)}/${e.k}.jpg" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : '<span class="lt"></span>') : ''}<span class="${e.ok ? 'y' : 'n'}">${e.ok ? '✓' : '✕'}</span><span class="ln">${esc(e.n)}</span><i>${e.t.toLocaleDateString(L, { day: 'numeric', month: 'short' })} · ${D(e.d)}</i></div>`).join('')}${longest && log.length > 1 ? `<div class="su">${esc(T.longest(log.length, longest.n, D(longest.d)))}</div>` : ''}` : `<div class="su">${T.empty}</div>`}</div>` : '';
    const CSS = `<style>
ha-card{display:block;padding:14px;overflow:hidden}
.hd{display:flex;justify-content:space-between;align-items:center;gap:8px}.tt{font-size:20px}
.pl{font-size:12px;padding:3px 10px;border-radius:99px;font-weight:600;white-space:nowrap}.pl.off,.pl.idle{background:rgba(127,127,127,.16);color:var(--secondary-text-color,#666)}.pl.run{background:rgba(250,104,49,.18);color:#c2410c}.pl.warn{background:rgba(255,179,0,.2);color:#9a6700}.pl.ok{background:rgba(67,185,107,.16);color:#1e8a4c}.pl.bad{background:rgba(229,57,53,.15);color:#c62828}
.pic{width:100%;display:block;margin-top:6px;cursor:pointer}.pic.off{opacity:.8}
.mv{animation:mv 3.2s ease-in-out infinite}@keyframes mv{0%,100%{transform:translateX(-40px)}50%{transform:translateX(40px)}}
.pb{height:8px;border-radius:4px;background:rgba(127,127,127,.2);overflow:hidden;margin-top:8px}.pf{height:100%;background:#fa6831;border-radius:4px}
.fn{font-size:14.5px;font-weight:600;margin-top:8px;overflow-wrap:anywhere}.su{font-size:12.5px;color:var(--secondary-text-color,#666);margin-top:2px}
.cps{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.cp{font-size:12px;padding:3px 9px;border-radius:99px;background:rgba(127,127,127,.14)}
.ac{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
button{font:inherit;border:none;cursor:pointer;border-radius:99px;padding:7px 14px;font-size:13px;background:rgba(127,127,127,.16);color:var(--primary-text-color,#222)}
.bt.pr{background:#fa6831;color:#fff}.bt.dg{color:#c62828}
.st{margin-top:12px;border-top:1px solid rgba(127,127,127,.2);padding-top:10px}.sh{font-size:13px;font-weight:600;margin-bottom:4px}.kp{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0}.kp div{background:rgba(127,127,127,.1);border-radius:10px;padding:6px 4px;text-align:center}.kp b{display:block;font-size:14px}.kp span{font-size:11px;color:var(--secondary-text-color,#666)}.lg{display:flex;gap:6px;align-items:center;font-size:12.5px;padding:3px 0}.ln{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lg i{font-style:normal;color:var(--secondary-text-color,#666);white-space:nowrap}.lt{width:${c.view === 'log' ? 48 : 36}px;height:${c.view === 'log' ? 48 : 36}px;border-radius:8px;object-fit:contain;background:rgba(127,127,127,.12);flex:none}.lg{gap:8px}.y{color:#1e8a4c;font-weight:700}.n{color:#c62828;font-weight:700}
.no{font-size:13px;color:var(--secondary-text-color,#666);margin-top:6px}
.sps{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.sp{display:flex;align-items:center;gap:6px;font-size:12.5px;background:rgba(127,127,127,.1);border-radius:10px;padding:5px 8px;min-width:0;cursor:pointer}.dot{width:14px;height:14px;border-radius:50%;border:1px solid rgba(0,0,0,.28);flex:none}.sn{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sp i{font-style:normal;color:var(--secondary-text-color,#666);font-variant-numeric:tabular-nums}.sp.lo i{color:#c62828;font-weight:700}
.sp.se{outline:2px solid #fa6831}
.pk{margin-top:8px;border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:10px;background:rgba(127,127,127,.08)}
.pkh{font-size:13px;font-weight:600;margin-bottom:6px}.pkm{font-size:13px;padding:8px 2px}.pke{font-size:13px;color:#c62828;margin-bottom:6px}
.pkl{display:flex;flex-direction:column;gap:4px;max-height:260px;overflow:auto}
.pki{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border-radius:10px;padding:8px 10px;min-height:40px}.pki.on{outline:2px solid #fa6831}
.pki small{color:var(--secondary-text-color,#666);font-size:11px}.pki i{font-style:normal;font-size:12px;color:var(--secondary-text-color,#666);white-space:nowrap}
.pw{margin-bottom:10px}.pws{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}.pm.on{background:#fa6831;color:#fff;font-weight:700}.pwr{display:flex;align-items:center;gap:8px}.pin{font:inherit;width:110px;min-height:36px;box-sizing:border-box;border-radius:8px;border:1px solid rgba(127,127,127,.4);padding:6px 10px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#222)}.pwl{font-size:12.5px;min-width:96px}.pwr+.pwi+.pwr{margin-top:6px}.pwi{font-size:12px;color:var(--secondary-text-color,#666);margin-top:4px;min-height:15px}
.pka{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.fx{flex:1}
${c.view === 'log' ? '.st{margin-top:6px;border-top:none;padding-top:0}' : ''}</style>`;
    if (c.view === 'log') { this.shadowRoot.innerHTML = `${CSS}<ha-card><div class="hd"><div class="tt">${esc(c.title || T.log)}</div></div>${stats.replace(`<div class="sh">${T.log}</div>`, '')}</ha-card>`; return; }
    this.shadowRoot.innerHTML = `${CSS}<ha-card><div class="hd"><div class="tt">${esc(c.title || 'Prusa XL')}</div><span class="pl ${lvl}">${LBL[sv] || esc(sv)}</span></div>
${pic}${spl}
${job && pr != null ? `<div class="pb"><div class="pf" style="width:${pr}%"></div></div>` : ''}
${file && job ? `<div class="fn">${esc(file)}</div>` : ''}${eta ? `<div class="su">${eta}</div>` : ''}
${!off && (mat || sp) ? `<div class="cps">${mat ? `<span class="cp">🧵 ${esc(mat)}</span>` : ''}${sp && printing ? `<span class="cp">⚡ ${esc(sp)} % ${T.speed}</span>` : ''}</div>` : ''}
${off ? `<div class="no">${T.offText}</div>` : ''}
${acts ? `<div class="ac">${acts}</div>` : ''}${c.show_log === false ? '' : stats}</ha-card>`;
    const R = this.shadowRoot;
    R.querySelector('.pic').addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: ids.state }, bubbles: true, composed: true })));
    R.querySelectorAll('.sp[data-t]').forEach((e) => e.addEventListener('click', () => { if (this._pick && this._pick.busy) return; const t = Number(e.dataset.t); this._pick = this._pick && this._pick.tool === t ? null : { tool: t }; this._render(ids); }));
    R.querySelectorAll('.pki').forEach((b) => b.addEventListener('click', () => this._assign(this._pick.tool, this._all().find((p) => p.id === b.dataset.s))));
    R.querySelectorAll('.pka button').forEach((b) => b.addEventListener('click', () => { const a = b.dataset.a, t = this._pick.tool; if (a === 'clear') { this._assign(t, null); return; } if (a === 'info' && SPL[t - 1]) this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: SPL[t - 1].id }, bubbles: true, composed: true })); this._pick = null; this._render(ids); }));
    const pin = R.querySelector('.pin:not(.pp)'), pwi = R.querySelector('.pwi'), ppin = R.querySelector('.pp'), pph = R.querySelector('.pph');
    const hint = () => { if (!pwi || !this._pick) return; const sp0 = SPL[this._pick.tool - 1], pv = this._pick.price == null ? NaN : this._num(this._pick.price), sp = sp0 && pv > 0 ? Object.assign({}, sp0, { ppg: pv / sp0.iw }) : sp0 && this._pick.price != null && String(this._pick.price).trim() !== '' ? Object.assign({}, sp0, { ppg: null }) : sp0, v = this._num(this._pick.val);
      if (pph) pph.textContent = sp && sp.ppg ? this._money(sp.ppg * 1000) + ' ' + T.perKg + ' · ' + T.worth + ' ' + this._money(sp.rem * sp.ppg) : T.noPrice; pwi.textContent = !sp ? '' : this._pick.mode === 'rem' ? T.before + Math.round(sp.rem) + ' g' : isNaN(v) ? T.remNow + Math.round(sp.rem) + ' g' : T.remAfter + (Math.round((sp.rem - v) * 10) / 10).toLocaleString(T.loc) + ' g' + (sp.ppg && v > 0 ? ' · ' + T.cost + ' ' + this._money(v * sp.ppg) : ''); };
    hint();
    if (ppin) { ppin.addEventListener('input', () => { this._pick.price = ppin.value; hint(); }); ppin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { this._pick.price = ppin.value; this._weight(); } }); }
    if (pin) { pin.addEventListener('input', () => { this._pick.val = pin.value; hint(); }); pin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { this._pick.val = pin.value; this._weight(); } }); }
    R.querySelectorAll('.pm').forEach((b) => b.addEventListener('click', () => { this._pick.mode = b.dataset.m; this._pick.val = ''; this._pick.err = ''; this._render(ids); const i = this.shadowRoot.querySelector('.pin'); if (i && i.focus) i.focus(); }));
    R.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { if (pin) this._pick.val = pin.value; if (ppin) this._pick.price = ppin.value; this._weight(); }));
    R.querySelectorAll('button[data-k]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.k; if (k === 'cancel' && !confirm(T.confirmCancel)) return; h.callService('button', 'press', { entity_id: ids[k] }); }));
  }
}
if (!customElements.get('prusa-xl-card')) customElements.define('prusa-xl-card', PrusaXlCard);
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'prusa-xl-card')) window.customCards.push({ type: 'prusa-xl-card', name: 'Prusa XL Card', description: 'Prusa XL as a drawing with tool changer, progress, job buttons, Spoolman spools on the tool heads and a print log', preview: true, documentationURL: 'https://github.com/matthiasnattke/prusa-xl-card' });
console.info(`%c PRUSA-XL-CARD %c ${PXC_VERSION} `, 'color:#fff;background:#fa6831;font-weight:700', 'color:#fa6831;background:#1d1e21');