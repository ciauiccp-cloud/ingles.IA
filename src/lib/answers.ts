/** Formata a resposta do aluno para exibição. */
export function formatAnswer(q: { type: string; data: any }, ans: any): string {
  if (ans == null || ans === "") return "(sem resposta)";
  const d = q.data ?? {};
  switch (q.type) {
    case "multiple_choice": case "true_false": case "audio": case "image": case "interpretation":
      if (typeof ans === "number") return d.options?.[ans] ?? String(ans);
      return String(ans);
    case "fill_blank": return Array.isArray(ans) ? ans.map((a, i) => `(${i + 1}) ${a || "—"}`).join("  ") : String(ans);
    case "matching": return Array.isArray(ans) ? (d.pairs ?? []).map((p: any, i: number) => `${p.left} → ${ans[i] ?? "—"}`).join(" · ") : String(ans);
    case "ordering": return Array.isArray(ans) ? ans.join(" ") : String(ans);
    default: return String(ans);
  }
}

/** Gabarito em texto. */
export function formatKey(q: { type: string; data: any }): string | null {
  const d = q.data ?? {};
  switch (q.type) {
    case "multiple_choice": case "true_false": case "audio": case "image": case "interpretation":
      return d.options && d.answer != null ? d.options[d.answer] : d.reference ?? null;
    case "fill_blank": return !d.answers ? null : d.answers.map((a: string, i: number) => `(${i + 1}) ${a.split("|").join(" / ")}`).join("  ");
    case "matching": return (d.pairs ?? []).some((p: any) => p.right == null) ? null : (d.pairs ?? []).map((p: any) => `${p.left} → ${p.right}`).join(" · ");
    case "ordering": return d.words ? d.words.join(" ") : null;
    default: return d.reference || null;
  }
}
