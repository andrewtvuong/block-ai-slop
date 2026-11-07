(function () {
  'use strict';

  const BAS = globalThis.BAS;
  const $ = (sel) => document.querySelector(sel);
  const fmt = new Intl.NumberFormat();
  let settings = BAS.mergeSettings();

  // Build one toggle row per supported site.
  const sitesBox = $('#sites');
  for (const site of BAS.SITES) {
    const row = document.createElement('label');
    row.className = 'row';
    const text = document.createElement('span');
    text.className = 'row-text';
    const name = document.createElement('b');
    name.textContent = site.label;
    text.append(name);
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.site = site.id;
    row.append(text, input);
    sitesBox.append(row);
  }

  function render() {
    $('#enabled').checked = settings.enabled;
    $('#status').textContent = settings.enabled ? 'On' : 'Paused';
    document.body.classList.toggle('off', !settings.enabled);
    for (const radio of document.querySelectorAll('input[name="mode"]')) {
      radio.checked = radio.value === settings.mode;
    }
    for (const box of document.querySelectorAll('[data-rule]')) {
      box.checked = settings.rules[box.dataset.rule];
    }
    for (const box of document.querySelectorAll('[data-site]')) {
      box.checked = settings.sites[box.dataset.site];
    }
  }

  function save() {
    render();
    chrome.storage.sync.set({ [BAS.SETTINGS_KEY]: settings });
  }

  $('#enabled').addEventListener('change', (e) => {
    settings.enabled = e.target.checked;
    save();
  });
  for (const radio of document.querySelectorAll('input[name="mode"]')) {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) settings.mode = e.target.value;
      save();
    });
  }
  for (const box of document.querySelectorAll('[data-rule]')) {
    box.addEventListener('change', (e) => {
      settings.rules[e.target.dataset.rule] = e.target.checked;
      save();
    });
  }
  for (const box of document.querySelectorAll('[data-site]')) {
    box.addEventListener('change', (e) => {
      settings.sites[e.target.dataset.site] = e.target.checked;
      save();
    });
  }

  function showTotal(stats) {
    const total = stats && Number.isFinite(stats.total) ? stats.total : 0;
    $('#total-count').textContent = fmt.format(total);
  }

  function showPageCount() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || tab.id == null) return;
      chrome.action.getBadgeText({ tabId: tab.id }, (text) => {
        if (chrome.runtime.lastError) return;
        $('#page-count').textContent = text || '0';
      });
    });
  }

  chrome.storage.sync.get(BAS.SETTINGS_KEY, (result) => {
    settings = BAS.mergeSettings(result && result[BAS.SETTINGS_KEY]);
    render();
  });
  chrome.storage.local.get(BAS.STATS_KEY, (result) => showTotal(result && result[BAS.STATS_KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[BAS.STATS_KEY]) {
      showTotal(changes[BAS.STATS_KEY].newValue);
      showPageCount();
    }
  });
  showPageCount();
  $('#version').textContent = 'v' + chrome.runtime.getManifest().version;
  render();
})();
