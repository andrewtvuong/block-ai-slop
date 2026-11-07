// Decides whether a piece of comment text looks AI-generated.
// Pure function, no DOM access, so it can be unit tested in Node.
(function (root) {
  'use strict';

  const BAS = (root.BAS = root.BAS || {});

  // U+2014 EM DASH. There is no key for it on a normal keyboard, so in a
  // comment box it is a strong tell. (U+2013 en dash and "-" are not flagged.)
  const EM_DASH = /\u2014/;

  // High-precision phrases only. Each pattern should be something a person
  // almost never types into a comment by hand. Prefer missing slop over
  // hiding a real human.
  const PHRASES = [
    /\bas an ai(?: language)? model\b/i,
    /\bas a large language model\b/i,
    /\bmy (?:knowledge|training)(?: data)? cut-?off\b/i,
    /\bregenerate response\b/i,
    /\bi (?:cannot|can['\u2019]t) (?:assist|help) with that(?: request)?\b/i,
    /\b(?:certainly|absolutely|sure)! here['\u2019]?s\b/i,
    /\bit['\u2019]s not just (?:about )?[^.?!\n]{1,60}[,;] it['\u2019]s\b/i,
    /\bin today['\u2019]s (?:fast[- ]paced|digital|ever[- ]evolving|ever[- ]changing) (?:world|landscape|age|era)\b/i,
    /\bnavigat(?:e|es|ing) the (?:complexities|intricacies) of\b/i,
    /\b(?:a|the) (?:rich|vibrant|intricate) tapestry of\b/i,
    /\bdelv(?:e|es|ing) (?:deeper )?into the (?:world|realm|nuances|intricacies) of\b/i
  ];

  /**
   * @param {string} text   comment text
   * @param {{emDash?: boolean, phrases?: boolean}} rules
   * @returns {null | {rule: 'emDash' | 'phrases', reason: string}}
   */
  BAS.detect = function detect(text, rules) {
    if (!text || typeof text !== 'string') return null;
    const r = rules || {};
    if (r.emDash !== false && EM_DASH.test(text)) {
      return { rule: 'emDash', reason: 'contains an em dash' };
    }
    if (r.phrases !== false) {
      for (const re of PHRASES) {
        if (re.test(text)) return { rule: 'phrases', reason: 'uses a stock AI phrase' };
      }
    }
    return null;
  };
})(globalThis);
