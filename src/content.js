// Finds comments on the current site, runs the detector on each, and hides
// the ones that look AI-generated. The page's own nodes are never edited:
// we only toggle data attributes (CSS does the hiding) and insert a notice
// element next to the hidden text. That keeps the site's framework happy and
// makes every change reversible.
(function () {
  'use strict';

  const BAS = globalThis.BAS;
  if (!BAS || BAS.contentLoaded) return;
  BAS.contentLoaded = true;

  // The test harness can inject a fake location. Pages cannot: content
  // scripts run in an isolated world.
  const loc = () => BAS.testLocation || location;

  const site = BAS.siteForHost(loc().hostname);
  if (!site) return;

  const HIDDEN = 'data-bas-hidden'; // on a comment's text element(s)
  const COLLAPSED = 'data-bas-collapsed'; // on a whole comment (hide mode)
  const NOTICE = 'bas-notice';
  const SCAN_DELAY = 80; // ms; short enough that slop rarely flashes

  let settings = BAS.mergeSettings();
  let generation = 0; // bumped on settings change to force re-detection
  let observer = null;
  let timer = 0;
  let lastReported = -1;

  const units = new WeakMap(); // comment element -> state
  const flagged = new Set(); // comment elements currently judged AI

  function contextAlive() {
    try {
      return !!(chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function siteEnabled() {
    return settings.enabled && settings.sites[site.id] !== false;
  }

  // ---- finding comments -------------------------------------------------

  function bodiesOf(item) {
    const list = [];
    for (const el of item.querySelectorAll(site.body)) {
      if (el.closest(site.item) !== item) continue; // belongs to a nested reply
      list.push(el);
    }
    // Keep only the outermost match when selectors overlap.
    return list.filter((el) => !list.some((other) => other !== el && other.contains(el)));
  }

  function collect() {
    if (site.collect) return site.collect(document, loc());
    const out = [];
    for (const item of document.querySelectorAll(site.item)) {
      out.push({ item, bodies: bodiesOf(item) });
    }
    return out;
  }

  // ---- per-comment state ------------------------------------------------

  function unitFor(item) {
    let u = units.get(item);
    if (!u) {
      u = { sig: null, gen: -1, verdict: null, revealed: false, counted: null, bodies: [], notice: null };
      units.set(item, u);
    }
    return u;
  }

  // Returns 1 when this comment is newly detected (for the lifetime counter).
  function process(item, rawBodies) {
    const bodies = rawBodies.filter((b) => b.isConnected && !b.closest(BAS.EDITABLE) && !b.closest('.' + NOTICE));
    const u = unitFor(item);
    const eligible = bodies.length > 0 && (!site.eligible || site.eligible(item, loc()));
    const text = eligible ? bodies.map((b) => b.textContent).join('\n') : '';
    let newly = 0;

    if (text !== u.sig || u.gen !== generation) {
      // New text in the same element is a different comment (YouTube
      // recycles elements when you switch videos), and a settings change
      // re-applies to everything, so either way forget any "Show" click.
      u.revealed = false;
      u.sig = text;
      u.gen = generation;
      u.verdict = eligible ? BAS.detect(text, settings.rules) : null;
      if (u.verdict && u.counted !== text) {
        u.counted = text;
        newly = 1;
      }
    }

    if (u.verdict) flagged.add(item);
    else flagged.delete(item);
    render(item, u, bodies);
    return newly;
  }

  function clear(item) {
    const u = units.get(item);
    flagged.delete(item);
    if (!u) return;
    u.verdict = null;
    u.sig = null;
    render(item, u, u.bodies.filter((b) => b.isConnected));
  }

  // ---- DOM changes (idempotent: touches nothing that is already right) ---

  function setAttr(el, name, on) {
    if (on) {
      if (!el.hasAttribute(name)) el.setAttribute(name, '');
    } else if (el.hasAttribute(name)) {
      el.removeAttribute(name);
    }
  }

  function render(item, u, bodies) {
    const hide = !!u.verdict && !u.revealed && siteEnabled();
    // Collapse the whole comment only when it cannot contain replies.
    const collapse = hide && settings.mode === 'hide' && site.collapsible && !item.querySelector(site.item);
    const hideText = hide && !collapse;
    const showNotice = hideText && settings.mode === 'replace' && bodies.length > 0;

    for (const old of u.bodies) {
      if (!bodies.includes(old)) setAttr(old, HIDDEN, false);
    }
    for (const b of bodies) setAttr(b, HIDDEN, hideText);
    u.bodies = bodies;
    setAttr(item, COLLAPSED, collapse);

    if (showNotice) {
      if (!u.notice) u.notice = makeNotice(item);
      setNoticeReason(u.notice, u.verdict.reason);
      const anchor = bodies[0];
      if (u.notice.parentNode !== anchor.parentNode || u.notice.nextSibling !== anchor) {
        anchor.parentNode.insertBefore(u.notice, anchor);
      }
    } else if (u.notice && u.notice.isConnected) {
      u.notice.remove();
    }
  }

  function makeNotice(item) {
    const notice = document.createElement('span');
    notice.className = NOTICE;
    notice.setAttribute('role', 'note');

    const label = document.createElement('span');
    label.className = NOTICE + '__label';
    const title = document.createElement('strong');
    title.textContent = 'Likely AI-generated';
    const reason = document.createElement('span');
    reason.className = NOTICE + '__reason';
    label.append(title, ' ', reason);

    const show = document.createElement('button');
    show.type = 'button';
    show.className = NOTICE + '__show';
    show.textContent = 'Show';
    show.setAttribute('aria-label', 'Show this comment');
    show.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      reveal(item);
    });

    // Sites like X open the post when anything inside it is clicked.
    for (const type of ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup']) {
      notice.addEventListener(type, (e) => e.stopPropagation());
    }

    notice.append(label, show);
    return notice;
  }

  function setNoticeReason(notice, reason) {
    const el = notice.querySelector('.' + NOTICE + '__reason');
    const text = '(' + reason + ')';
    if (el && el.textContent !== text) el.textContent = text;
  }

  function reveal(item) {
    const u = units.get(item);
    if (!u) return;
    u.revealed = true;
    render(item, u, u.bodies.filter((b) => b.isConnected));
  }

  // ---- scanning ---------------------------------------------------------

  function scan() {
    timer = 0;
    if (!siteEnabled()) return;
    const seen = new Set();
    let newly = 0;
    for (const { item, bodies } of collect()) {
      if (seen.has(item)) continue;
      seen.add(item);
      newly += process(item, bodies);
    }
    // Comments that left the page or stopped matching (e.g. SPA navigation).
    for (const item of flagged) {
      if (!seen.has(item)) clear(item);
    }
    report(newly);
  }

  function schedule(delay) {
    if (!timer) timer = setTimeout(scan, delay == null ? SCAN_DELAY : delay);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(() => schedule());
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  function stop() {
    if (observer) observer.disconnect();
    observer = null;
    if (timer) clearTimeout(timer);
    timer = 0;
    for (const item of flagged) clear(item);
    report(0);
  }

  function report(newly) {
    const count = flagged.size;
    if (count === lastReported && !newly) return;
    lastReported = count;
    if (!contextAlive()) return;
    try {
      const p = chrome.runtime.sendMessage({ type: 'bas:count', count, newly });
      if (p && p.catch) p.catch(() => {});
    } catch (_) { /* extension reloaded; nothing to report to */ }
  }

  // ---- settings ---------------------------------------------------------

  function applySettings(stored) {
    settings = BAS.mergeSettings(stored);
    generation++;
    if (siteEnabled()) {
      start();
      schedule(0);
    } else {
      stop();
    }
  }

  BAS.scanNow = scan; // used by harness/index.html

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[BAS.SETTINGS_KEY] && contextAlive()) {
        applySettings(changes[BAS.SETTINGS_KEY].newValue);
      }
    });
    chrome.storage.sync.get(BAS.SETTINGS_KEY, (result) => {
      if (!contextAlive()) return;
      const stored = chrome.runtime.lastError ? undefined : result && result[BAS.SETTINGS_KEY];
      applySettings(stored);
    });
  } catch (_) {
    applySettings(undefined); // storage unavailable: run with defaults
  }
})();
