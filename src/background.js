// Keeps the toolbar badge in sync with each tab's hidden-comment count and
// tallies a lifetime total in local storage. Nothing leaves the device.
'use strict';

const STATS_KEY = 'stats';

chrome.action.setBadgeBackgroundColor({ color: '#FF4A1C' });
if (chrome.action.setBadgeTextColor) chrome.action.setBadgeTextColor({ color: '#FFFFFF' });

// Serialize read-modify-write so concurrent tabs never lose increments.
let queue = Promise.resolve();
function addToTotal(n) {
  queue = queue
    .then(async () => {
      const result = await chrome.storage.local.get(STATS_KEY);
      const stats = result[STATS_KEY] || {};
      const total = (Number.isFinite(stats.total) ? stats.total : 0) + n;
      await chrome.storage.local.set({ [STATS_KEY]: { total } });
    })
    .catch(() => {});
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg || msg.type !== 'bas:count' || !sender.tab || sender.tab.id == null) return;
  if (sender.frameId) return; // top frame only

  const count = Math.max(0, Math.floor(Number(msg.count) || 0));
  const text = count === 0 ? '' : count > 999 ? '999+' : String(count);
  chrome.action.setBadgeText({ tabId: sender.tab.id, text }).catch(() => {});

  const newly = Math.max(0, Math.floor(Number(msg.newly) || 0));
  if (newly > 0) addToTotal(newly);
});
