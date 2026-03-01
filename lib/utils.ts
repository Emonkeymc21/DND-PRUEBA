export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export function toCSV(rows: Array<Record<string, unknown>>) {
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const esc = (val: unknown) => {
    const s = String(val ?? "");
    const needs = /[",\n]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => headers.map(h => esc(r[h])).join(","))
  ];
  return lines.join("\n");
}
