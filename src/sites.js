// Per-site adapters. Each adapter tells the content script where comments
// live and which element holds a comment's own text.
//
//   item   selector for one comment (top-level or reply)
//   body   selector, within item, for the comment's text
//   collapsible  hide mode may remove the whole item (only ever done when
//                the item contains no nested comments, so replies survive)
//   eligible(item, loc)  optional extra filter
//   collect(doc, loc)    optional custom finder returning [{item, bodies}]
//
// Only the comment's own text is ever hidden by default, never a container,
// so child replies keep rendering no matter how a site nests its DOM.
(function (root) {
  'use strict';

  const BAS = (root.BAS = root.BAS || {});

  // Never touch anything the user is typing into.
  BAS.EDITABLE = '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], textarea, input';

  function xStatusId(loc) {
    const m = /\/status(?:es)?\/(\d+)/.exec(loc.pathname);
    return m ? m[1] : null;
  }

  // Instagram uses generated class names, so instead of selectors we start
  // from text spans and climb to the smallest ancestor that holds exactly one
  // <time>: that is one comment row. Ambiguous rows fall back to the span
  // itself, which keeps every decision local to a single comment.
  function instagramCollect(doc, loc) {
    if (!/^\/(?:[^/]+\/)?(?:p|reel|reels|tv)\//.test(loc.pathname)) return [];
    const scopes = doc.querySelectorAll('[role="dialog"], main');
    const groups = new Map();
    const seen = new Set();
    for (const scope of scopes) {
      for (const span of scope.querySelectorAll('span[dir="auto"]')) {
        if (seen.has(span)) continue; // scopes can overlap
        seen.add(span);
        // Captions render in <h1>; usernames and buttons are links/buttons.
        if (span.closest('h1, h2, a, button, [role="button"], header, nav, .bas-notice')) continue;
        if (span.parentElement && span.parentElement.closest('span[dir="auto"]')) continue; // keep outermost
        let item = span;
        let node = span.parentElement;
        for (let depth = 0; node && node !== scope && depth < 10; depth++, node = node.parentElement) {
          const times = node.querySelectorAll('time');
          if (times.length === 0) continue;
          if (times.length === 1) item = node;
          break;
        }
        if (!groups.has(item)) groups.set(item, []);
        groups.get(item).push(span);
      }
    }
    return Array.from(groups, ([item, bodies]) => ({ item, bodies }));
  }

  BAS.SITES = [
    {
      id: 'youtube',
      label: 'YouTube',
      hosts: ['youtube.com'],
      // Top-level comments and replies are separate elements; replies live in
      // the thread's #replies, outside the parent comment element.
      item: 'ytd-comment-view-model, ytd-comment-renderer',
      body: '#content-text',
      collapsible: true
    },
    {
      id: 'x',
      label: 'X (Twitter)',
      hosts: ['x.com', 'twitter.com'],
      item: 'article[data-testid="tweet"]',
      body: '[data-testid="tweetText"]',
      collapsible: true,
      // Replies on a post's page only. The post being viewed is never hidden.
      eligible(item, loc) {
        const id = xStatusId(loc);
        if (!id) return false;
        if (item.getAttribute('tabindex') === '-1') return false; // focal post
        if (item.querySelector('a[href$="/status/' + id + '"] time')) return false;
        return true;
      }
    },
    {
      id: 'facebook',
      label: 'Facebook',
      hosts: ['facebook.com'],
      // Comments are role=article with an aria-label ("Comment by ...").
      // Feed posts carry aria-posinset and are skipped.
      item: 'div[role="article"][aria-label]:not([aria-posinset])',
      body: 'div[dir="auto"]',
      collapsible: true
    },
    {
      id: 'instagram',
      label: 'Instagram',
      hosts: ['instagram.com'],
      collapsible: false,
      collect: instagramCollect
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      hosts: ['linkedin.com'],
      item: 'article.comments-comment-entity, article.comments-comment-item, article[data-id^="urn:li:comment"]',
      body: '.comments-comment-item__main-content, .comments-comment-entity__content .update-components-text, .comments-comment-item-content-body',
      collapsible: true
    }
  ];

  BAS.siteForHost = function siteForHost(hostname) {
    const host = String(hostname || '').toLowerCase();
    return BAS.SITES.find((s) => s.hosts.some((h) => host === h || host.endsWith('.' + h))) || null;
  };
})(globalThis);
