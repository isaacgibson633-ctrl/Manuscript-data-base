// Shared by check-data.mjs and build.mjs.

export const BOOKS = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians",
  "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
  "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];

// "John 1:1–18" → { book: "John", chapter: 1, verses: [1, 18], slug: "john-1-1-18", path: "john/1/1-18/" }
// Passages stay within one chapter.
export function parsePassageRef(ref) {
  const m = /^(.+) (\d+):(\d+)(?:[–-](\d+))?$/.exec(String(ref || "").trim());
  if (!m || !BOOKS.includes(m[1])) throw new Error(`"passage" should look like "John 1:1–18" or "John 18:31" (got "${ref}")`);
  const book = m[1], chapter = +m[2], from = +m[3], to = m[4] ? +m[4] : from;
  if (to < from) throw new Error(`passage "${ref}" ends before it starts`);
  const bookSlug = book.toLowerCase().replace(/ /g, "-");
  const range = from === to ? `${from}` : `${from}-${to}`;
  return { book, bookSlug, chapter, verses: [from, to], slug: `${bookSlug}-${chapter}-${range}`, path: `${bookSlug}/${chapter}/${range}/` };
}

export const STATUS_TEXT = {
  preserved: "preserved", replacement_leaves: "on later replacement leaves (still before 900)", to_check: "survives, extent to check",
  preserved_in_harmony: "preserved within a Gospel harmony", to_map: "coverage still to map",
};

// Compress verse numbers into "1:1–5, 7, 9–18"
export function verseRanges(chapter, nums) {
  const s = [...nums].sort((a, b) => a - b), parts = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    parts.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`);
    i = j;
  }
  return parts.length ? `${chapter}:${parts.join(", ")}` : "";
}

// What a passage records for one manuscript: "complete", "1:1–15 · on later replacement leaves: 1:16–18",
// or the passage-level Latin coverage note. `chapter` comes from parsePassageRef(p.passage).
export function passageCoverage(p, chapter, id) {
  const note = (p.latin || []).find(l => l.id === id);
  if (note) return note.coverage_note;
  const all = p.verses.length, groups = {};
  for (const v of p.verses) for (const w of [...(v.greek_witnesses || []), ...(v.latin_witnesses || [])])
    if (w.id === id) (groups[w.status] ||= []).push(v.verse);
  const parts = [];
  if (groups.preserved) parts.push(groups.preserved.length === all && all > 1 ? "complete" : verseRanges(chapter, groups.preserved));
  for (const s of ["preserved_in_harmony", "replacement_leaves", "to_check", "to_map"])
    if (groups[s]) parts.push(`${STATUS_TEXT[s]}: ${groups[s].length === all && all > 1 ? "whole passage" : verseRanges(chapter, groups[s])}`);
  return parts.join(" · ");
}

// IDs of Greek witnesses in `p` that no earlier passage of the same chapter lists (empty for a chapter's first passage)
export function firstAppearances(passages, p) {
  const ref = parsePassageRef(p.passage);
  const earlier = passages.filter(q => { const r = parsePassageRef(q.passage); return r.book === ref.book && r.chapter === ref.chapter && r.verses[0] < ref.verses[0]; });
  if (!earlier.length) return [];
  const seen = new Set(earlier.flatMap(q => q.verses.flatMap(v => v.greek_witnesses.map(w => w.id))));
  return [...new Set(p.verses.flatMap(v => v.greek_witnesses.map(w => w.id)))].filter(id => !seen.has(id));
}
