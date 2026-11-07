// Shared settings model. Loaded by the content script and the popup.
(function (root) {
  'use strict';

  const BAS = (root.BAS = root.BAS || {});

  BAS.SETTINGS_KEY = 'settings'; // chrome.storage.sync
  BAS.STATS_KEY = 'stats'; // chrome.storage.local

  BAS.DEFAULTS = Object.freeze({
    enabled: true,
    // 'replace': swap the comment text for a notice with a Show button.
    // 'hide': remove the comment entirely (replies still stay visible).
    mode: 'replace',
    rules: Object.freeze({
      emDash: true,
      phrases: true
    }),
    sites: Object.freeze({
      youtube: true,
      x: true,
      facebook: true,
      instagram: true,
      linkedin: true
    })
  });

  // Merge whatever is in storage over the defaults, ignoring unknown keys and
  // wrong types so a corrupt or older settings object can never break a page.
  BAS.mergeSettings = function mergeSettings(stored) {
    const d = BAS.DEFAULTS;
    const s = stored && typeof stored === 'object' ? stored : {};
    const pickBools = (defaults, value) => {
      const out = {};
      const v = value && typeof value === 'object' ? value : {};
      for (const key of Object.keys(defaults)) {
        out[key] = typeof v[key] === 'boolean' ? v[key] : defaults[key];
      }
      return out;
    };
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : d.enabled,
      mode: s.mode === 'hide' || s.mode === 'replace' ? s.mode : d.mode,
      rules: pickBools(d.rules, s.rules),
      sites: pickBools(d.sites, s.sites)
    };
  };
})(globalThis);
