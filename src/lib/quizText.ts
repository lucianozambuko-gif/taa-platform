import type { QuizQuestion } from "@/lib/types";

/**
 * Quiz questions as plain text, so staff don't need a special editor:
 *   Q: What colour cloth is used in washrooms?
 *   - Blue
 *   * Red        <- the correct answer starts with *
 *   - Green
 * A blank line separates questions.
 */
export function quizToText(quiz: QuizQuestion[] | null | undefined) {
  return (quiz ?? []).map((q) => [`Q: ${q.q}`, ...q.o.map((o, i) => `${i === q.a ? "*" : "-"} ${o}`)].join("\n")).join("\n\n");
}

export function textToQuiz(text: string): { quiz: QuizQuestion[]; error?: string } {
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const quiz: QuizQuestion[] = [];
  for (const [n, block] of blocks.entries()) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    const qLine = lines.find((l) => /^q[:.]/i.test(l));
    if (!qLine) return { quiz, error: `Question ${n + 1} needs a line starting with "Q:".` };
    const opts = lines.filter((l) => /^[-*]/.test(l));
    if (opts.length < 2) return { quiz, error: `Question ${n + 1} needs at least two answers (lines starting with - or *).` };
    const correct = opts.filter((l) => l.startsWith("*"));
    if (correct.length !== 1) return { quiz, error: `Question ${n + 1} needs exactly one correct answer marked with *.` };
    quiz.push({ q: qLine.replace(/^q[:.]\s*/i, ""), o: opts.map((l) => l.replace(/^[-*]\s*/, "")), a: opts.findIndex((l) => l.startsWith("*")) });
  }
  return { quiz };
}
