export const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, " ");

/** Scores a text against every search word; all words must appear somewhere. Titles count three times. */
export function score(words: string[], title: string, rest: string) {
  const t = norm(title), r = norm(rest);
  let total = 0;
  for (const w of words) {
    const inT = t.includes(w), inR = r.includes(w);
    if (!inT && !inR) return 0;
    total += (inT ? 3 : 0) + (inR ? 1 : 0) + (t.startsWith(w) ? 1 : 0);
  }
  return total;
}

/** Like score(), but counts how many words match instead of needing all of them (for chat messages). */
export function looseScore(words: string[], title: string, rest: string) {
  const t = norm(title), r = norm(rest);
  let total = 0;
  for (const w of words) total += (t.includes(w) ? 3 : 0) + (r.includes(w) ? 1 : 0);
  return total;
}

export const STOP = new Set("a an and are as at be can do does for from have how i im in is it me my of on or the to want what when where which who with you your course courses please hi hello need learn about tell know there any".split(" "));
export const keywords = (text: string) => norm(text).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
