<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Block AI Slop icon">
</p>

<h1 align="center">Block AI Slop</h1>

<p align="center">
  A Chrome extension that hides AI-generated comments on YouTube, X, Facebook, Instagram and LinkedIn.<br>
  Replies keep flowing. Everything runs on your device.
</p>

<p align="center">
  <a href="https://blockaislop.app">blockaislop.app</a>
</p>

---

## What it does

When a comment looks machine-written, Block AI Slop swaps its text for a small notice:

> ● **Likely AI-generated** (contains an em dash) &nbsp; `Show`

Click **Show** to read it anyway. Replies underneath the comment are never hidden, so real conversations stay intact.

Prefer it gone entirely? Switch the popup to **Hide it**, and the comment disappears while its replies stay.

## Supported sites

| Site | What gets checked |
| --- | --- |
| YouTube | Video comments and replies |
| X (Twitter) | Replies on a post's page (the post you opened is never hidden) |
| Facebook | Comments and replies |
| Instagram | Comments on posts and reels (captions are left alone) |
| LinkedIn | Comments and replies on posts |

Each site can be switched off from the popup.

## How it decides

Two rules, both on by default and each switchable in the popup:

1. **Em dashes (U+2014).** There is no em dash key on a keyboard, so it rarely shows up in a hand-typed comment, but language models use it constantly. It's the low-hanging fruit, so any comment containing one is flagged. Hyphens (`-`), en dashes (`–`) and double hyphens (`--`) are not flagged.
2. **Stock AI phrases.** A short, deliberately conservative list of phrases people almost never type into a comment box, such as "As an AI language model", "Certainly! Here's", "It's not just X, it's Y" and "In today's fast-paced world". See [`src/detector.js`](src/detector.js).

### False positives

Some people really do type em dashes, and iPhones and Macs with Smart Punctuation turn `--` into `—` automatically. Those comments will be flagged too. That's why every hidden comment has a **Show** button. If a rule bothers you, turn it off in the popup.

## Install

**Chrome Web Store:** coming soon. The link will be on [blockaislop.app](https://blockaislop.app).

**From source** (Chrome, Edge, Brave, Arc or any Chromium browser):

1. Download or clone this repo.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the repo folder (the one with `manifest.json`).

## Privacy

Block AI Slop has no servers, no accounts, no analytics and no network requests. Comment text is checked in your browser and never leaves it. The only permission is `storage`, used for your settings and a local counter of how many comments it has hidden. Full policy: [blockaislop.app/privacy](https://blockaislop.app/privacy).

## How it works

- `src/sites.js` has one small adapter per site: a selector for a comment and a selector for that comment's own text.
- `src/content.js` watches the page with a `MutationObserver`, runs `src/detector.js` on each comment's text, and marks flagged text with a `data-bas-hidden` attribute. `src/content.css` hides anything with that attribute.
- It never edits the site's own text. It only toggles attributes and inserts a notice next to the text, so it stays compatible with React, YouTube's Polymer and element recycling, and everything is reversible.
- Only a comment's *own* text is hidden. In **Hide it** mode the whole comment is removed only if it contains no nested replies; otherwise just its text is hidden. That's how replies always survive.

## Development

No build step and no dependencies.

```sh
node --test                      # detector + settings unit tests
open harness/index.html          # DOM tests for every site adapter, in Chrome
python3 scripts/make-icons.py    # re-render icons (needs Pillow)
./scripts/package.sh             # zip for the Chrome Web Store -> dist/
```

### When a site changes its markup

Social sites ship new markup often. If comments stop being caught on a site:

1. Inspect a comment and find a stable selector for the comment element and its text (prefer `data-testid`, `role`, `aria-*` and custom element names over generated class names).
2. Update that site's entry in `src/sites.js`.
3. Mirror the change in the matching fixture in `harness/frame.js` and check that `harness/index.html` still passes.

Pull requests are welcome.

## License

[GPL-3.0](LICENSE)

Not affiliated with YouTube, X, Meta, Instagram or LinkedIn. Product names are trademarks of their respective owners.
