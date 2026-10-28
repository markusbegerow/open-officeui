import type { HostAdapter } from "@open-officeui/core";

/** Cells are exchanged as tab-separated text, one row per line. */
const toTsv = (values: unknown[][]) => values.map((row) => row.join("\t")).join("\n");
const fromTsv = (text: string) => text.replace(/\n+$/, "").split("\n").map((line) => line.split("\t"));

async function write(text: string, where: "selection" | "below") {
  await Excel.run(async (ctx) => {
    const sel = ctx.workbook.getSelectedRange();
    const start = where === "below" ? sel.getLastRow().getOffsetRange(1, 0).getColumn(0) : sel.getCell(0, 0);
    const rows = fromTsv(text);
    const width = Math.max(...rows.map((r) => r.length));
    const padded = rows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
    start.getResizedRange(padded.length - 1, width - 1).values = padded;
    await ctx.sync();
  });
}

export const excelAdapter: HostAdapter = {
  hostName: "Excel",

  getContext: () =>
    Excel.run(async (ctx) => {
      const sel = ctx.workbook.getSelectedRange();
      sel.load("values");
      await ctx.sync();
      return toTsv(sel.values);
    }),

  insert: (text) => write(text, "below"),
  replaceSelection: (text) => write(text, "selection"),
};
