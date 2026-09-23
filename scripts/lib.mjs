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
