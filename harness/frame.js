// Runs the real content script against a simplified copy of one site's
// comment markup and reports pass/fail to harness/index.html.
(async function () {
  'use strict';

  const site = new URLSearchParams(location.search).get('site');
  const loc = { youtube: ['www.youtube.com', '/watch'], x: ['x.com', '/someone/status/100'], facebook: ['www.facebook.com', '/groups/1/posts/2'], instagram: ['www.instagram.com', '/p/abc123/'], linkedin: ['www.linkedin.com', '/feed/update/1'] }[site];

  const FIXTURES = {
    youtube: `
      <ytd-comment-thread-renderer>
        <ytd-comment-view-model id="comment" data-t="top-ai">
          <div id="expander"><yt-attributed-string id="content-text"><span>Great video\u2014really insightful breakdown.</span></yt-attributed-string></div>
        </ytd-comment-view-model>
        <div id="replies"><ytd-comment-replies-renderer>
          <ytd-comment-view-model data-t="reply-human">
            <div id="expander"><yt-attributed-string id="content-text"><span>lol agreed</span></yt-attributed-string></div>
          </ytd-comment-view-model>
        </ytd-comment-replies-renderer></div>
      </ytd-comment-thread-renderer>
      <ytd-comment-thread-renderer>
        <ytd-comment-view-model id="comment" data-t="top-human">
          <div id="expander"><yt-attributed-string id="content-text"><span>the drop at 2:31 though</span></yt-attributed-string></div>
        </ytd-comment-view-model>
      </ytd-comment-thread-renderer>`,
    x: `
      <article data-testid="tweet" tabindex="-1" data-t="focal">
        <a href="/someone/status/100"><time>1h</time></a>
        <div data-testid="tweetText">My post \u2014 the one being viewed</div>
      </article>
      <article data-testid="tweet" tabindex="0" data-t="top-ai">
        <a href="/bot/status/101"><time>1h</time></a>
        <div data-testid="tweetText">This\u2014this right here is the future.</div>
      </article>
      <article data-testid="tweet" tabindex="0" data-t="reply-human">
        <a href="/human/status/102"><time>1h</time></a>
        <div data-testid="tweetText">ratio</div>
      </article>`,
    facebook: `
      <div role="article" aria-posinset="1" aria-labelledby="h" data-t="post">
        <div dir="auto">A post \u2014 not a comment</div>
        <div role="article" aria-label="Comment by Bot" data-t="top-ai">
          <span dir="auto">Bot McBotface</span>
          <div dir="auto"><div dir="auto" style="text-align: start;">What a moment\u2014truly unforgettable.</div></div>
          <div role="article" aria-label="Reply by Human" data-t="reply-human">
            <span dir="auto">Real Person</span>
            <div dir="auto">haha yes</div>
          </div>
        </div>
        <div role="article" aria-label="Comment by Human" data-t="top-human">
          <div dir="auto">so cute</div>
        </div>
      </div>`,
    instagram: `
      <main><article>
        <h1 dir="auto">Caption \u2014 written by the poster</h1>
        <ul>
          <div data-t="top-ai"><div><a href="/bot/"><span dir="auto">bot</span></a></div><span dir="auto">Stunning shot\u2014pure art.</span><div><time>1d</time></div></div>
          <div data-t="reply-human"><div><a href="/human/"><span dir="auto">human</span></a></div><span dir="auto">where is this??</span><div><time>2d</time></div></div>
        </ul>
      </article></main>`,
    linkedin: `
      <article class="comments-comment-entity" data-t="top-ai">
        <span class="comments-comment-item__main-content"><div class="update-components-text"><span dir="ltr">Great insights\u2014thanks for sharing!</span></div></span>
        <div class="comments-replies-list">
          <article class="comments-comment-entity comments-comment-entity--reply" data-t="reply-human">
            <span class="comments-comment-item__main-content"><span dir="ltr">Congrats Sam!</span></span>
          </article>
        </div>
      </article>
      <article class="comments-comment-entity" data-t="top-human">
        <span class="comments-comment-item__main-content"><span dir="ltr">Congrats!</span></span>
      </article>`
  };

  // ---- fake extension APIs ----
  let onChanged = null;
  const messages = [];
  const fakeChrome = {
    runtime: { id: 'test', lastError: undefined, sendMessage: (m) => (messages.push(m), Promise.resolve()) },
    storage: {
      sync: { get: (key, cb) => cb({}) },
      onChanged: { addListener: (fn) => (onChanged = fn) }
    }
  };
  try {
    Object.defineProperty(window, 'chrome', { configurable: true, writable: true, value: fakeChrome });
  } catch (_) {
    window.chrome = fakeChrome;
  }
  window.BAS = { testLocation: { hostname: loc[0], pathname: loc[1] } };

  document.getElementById('fixture').innerHTML = FIXTURES[site];

  for (const src of ['../src/settings.js', '../src/detector.js', '../src/sites.js', '../src/content.js']) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
  }

  const results = [];
  const check = (name, pass) => results.push({ name, pass: !!pass });
  const $ = (t) => document.querySelector(`[data-t="${t}"]`);
  const visible = (el) => !!el && el.checkVisibility();
  const closestTagged = (el) => el.closest('[data-t]');
  const notice = (t) => $(t) && $(t).querySelector('.bas-notice');
  const scan = async () => { BAS.scanNow(); await new Promise((r) => setTimeout(r, 0)); };
  const setSettings = async (s) => { onChanged({ settings: { newValue: s } }, 'sync'); await scan(); };

  await scan();

  // Replace mode (default)
  const aiText = () => {
    const item = $('top-ai');
    return [...item.querySelectorAll('[data-bas-hidden]')].find((el) => closestTagged(el) === item);
  };
  check('AI comment text is hidden', aiText() && !visible(aiText()));
  check('notice is shown on the AI comment', visible(notice('top-ai')) && notice('top-ai').closest('[data-t]') === $('top-ai'));
  check('reply under the AI comment stays visible', visible($('reply-human')) && !$('reply-human').querySelector('[data-bas-hidden]'));
  if ($('top-human')) check('human comment untouched', visible($('top-human')) && !$('top-human').querySelector('[data-bas-hidden], .bas-notice'));
  if ($('focal')) check('post being viewed is never hidden', !$('focal').querySelector('[data-bas-hidden], .bas-notice'));
  if ($('post')) check('feed post text is not treated as a comment', ![...$('post').querySelectorAll('[data-bas-hidden]')].some((el) => closestTagged(el) === $('post')));
  if (site === 'instagram') check('caption (h1) is not hidden', visible(document.querySelector('h1')));
  check('badge count reported', messages.some((m) => m.type === 'bas:count' && m.count === 1 && m.newly === 1));

  // Show button
  notice('top-ai').querySelector('button').click();
  await scan();
  check('Show reveals the comment and removes the notice', !$('top-ai').querySelector('[data-bas-hidden]') && !notice('top-ai'));

  // Hide mode
  await setSettings({ mode: 'hide' });
  const collapsible = site !== 'instagram' && !$('top-ai').querySelector('[data-t="reply-human"]');
  if (collapsible) {
    check('hide mode removes the whole comment', $('top-ai').hasAttribute('data-bas-collapsed') && !visible($('top-ai')));
  } else {
    check('hide mode hides only the text when replies are nested inside', !$('top-ai').hasAttribute('data-bas-collapsed') && aiText() && !visible(aiText()));
  }
  check('hide mode shows no notice', !notice('top-ai'));
  check('hide mode keeps the reply visible', visible($('reply-human')));

  // Disable this site
  await setSettings({ mode: 'replace', sites: { [site]: false } });
  check('turning the site off restores everything', !document.querySelector('[data-bas-hidden], [data-bas-collapsed], .bas-notice'));

  // Re-enable, then recycle the element with human text (YouTube does this)
  await setSettings({ mode: 'replace' });
  check('re-enabling hides it again', !!notice('top-ai'));
  const leaf = [...$('top-ai').querySelectorAll('*')].find((el) => /\u2014/.test(el.textContent) && !el.children.length);
  leaf.textContent = 'a perfectly human comment';
  await scan();
  check('recycled element with new human text is shown again', !$('top-ai').querySelector('[data-bas-hidden], .bas-notice'));

  if (site === 'x') {
    leaf.textContent = 'back to slop\u2014again';
    await scan();
    BAS.testLocation.pathname = '/home';
    await scan();
    check('leaving the post page restores replies', !document.querySelector('[data-bas-hidden], .bas-notice'));
  }

  // A draft in an editable box is never hidden.
  const draft = document.createElement('div');
  draft.setAttribute('contenteditable', 'true');
  draft.innerHTML = { youtube: '<yt-attributed-string id="content-text">my draft\u2014here</yt-attributed-string>', x: '<div data-testid="tweetText">my draft\u2014here</div>', facebook: '<div dir="auto">my draft\u2014here</div>', instagram: '<span dir="auto">my draft\u2014here</span><time>now</time>', linkedin: '<span class="comments-comment-item__main-content">my draft\u2014here</span>' }[site];
  $('reply-human').append(draft);
  BAS.testLocation.pathname = loc[1];
  await scan();
  check('text inside an editable box is never hidden', !draft.querySelector('[data-bas-hidden]') && !draft.querySelector('.bas-notice'));

  parent.postMessage({ site, results }, '*');
})().catch((err) => {
  parent.postMessage({ site: new URLSearchParams(location.search).get('site'), results: [{ name: 'harness crashed: ' + err, pass: false }] }, '*');
});
