export type BulkRow = { name: string; email: string; phone: string | null };

/**
 * Reads a pasted list or a CSV export from Excel: one learner per line as "name, email[, phone]".
 * A header row (containing "email") is skipped; semicolons and tabs also work as separators.
 */
export function parseLearners(text: string): { rows: BulkRow[]; errors: string[] } {
  const rows: BulkRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const parts = line.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ""));
      if (i === 0 && parts.some((p) => /e-?mail/i.test(p))) return;
      const email = parts.find((p) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p))?.toLowerCase();
      const name = parts.find((p) => p && !p.includes("@") && /[a-z]/i.test(p));
      const phone = parts.find((p) => /^[+\d][\d\s-]{8,15}$/.test(p)) ?? null;
      if (!email || !name) return errors.push(`Line ${i + 1}: needs a name and an email (“${line.slice(0, 40)}”)`);
      if (seen.has(email)) return;
      seen.add(email);
      rows.push({ name, email, phone });
    });
  return { rows, errors };
}
