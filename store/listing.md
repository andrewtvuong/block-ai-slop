# Chrome Web Store listing

Copy for the Developer Dashboard. Upload `dist/block-ai-slop-<version>.zip` from `./scripts/package.sh`.

## Store listing

**Name:** Block AI Slop

**Summary** (132 chars max):

> Hides AI-generated comments on YouTube, X, Facebook, Instagram and LinkedIn. Replies stay visible. Runs entirely on your device.

**Category:** Social & Communication

**Language:** English

**Description:**

```
Tired of scrolling past comments that read like a chatbot wrote them? Block AI Slop quietly hides them.

When a comment looks AI-generated, its text is swapped for a small "Likely AI-generated" notice. Click Show to read it anyway. Replies underneath are never hidden, so real conversations keep flowing.

WORKS ON
• YouTube comments and replies
• X (Twitter) replies
• Facebook comments
• Instagram comments
• LinkedIn comments

HOW IT SPOTS SLOP
• Em dashes. There's no em dash key on a keyboard, but AI models use them constantly. Any comment with one is flagged.
• Stock AI phrases like "As an AI language model", "Certainly! Here's" and "It's not just X, it's Y".
Each rule can be turned off.

YOUR CHOICE
• Show a notice (default), or hide flagged comments completely.
• Turn it on or off per site.
• See how many comments were hidden on the page and all time.

PRIVATE BY DESIGN
No accounts. No servers. No analytics. Comment text is checked in your browser and never leaves it.

Free and open source (GPL-3.0): github.com/andrewtvuong/block-ai-slop
```

**Website:** https://blockaislop.app

**Support:** https://github.com/andrewtvuong/block-ai-slop/issues

## Graphics

| Asset | Size | Source |
| --- | --- | --- |
| Store icon | 128×128 | `icons/icon128.png` |
| Screenshots (1 to 5) | 1280×800 | Capture the extension on each site plus the popup |
| Small promo tile | 440×280 | Crop of the website hero image |
| Marquee promo tile (optional) | 1400×560 | Crop of the website hero image |

## Privacy practices tab

**Single purpose:**

> Hide comments that appear to be AI-generated on supported social media sites.

**Permission justifications:**

- `storage`: Saves the user's settings (on/off, mode, rules, sites) and a local count of hidden comments.
- Host permissions (youtube.com, x.com, twitter.com, facebook.com, instagram.com, linkedin.com): The content script must read comment text on these sites to decide whether to hide it. No data is sent anywhere.

**Remote code:** No, I am not using remote code.

**Data usage:** Check none of the data types. The extension does not collect or transmit user data.

Certify all three disclosures (no selling, no unrelated use, no creditworthiness use).

**Privacy policy URL:** https://blockaislop.app/privacy/
