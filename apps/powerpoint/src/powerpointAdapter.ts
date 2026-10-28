import type { HostAdapter } from "@open-officeui/core";

const getSelectedText = () =>
  new Promise<string>((resolve) => {
    Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, (r) =>
      resolve(r.status === Office.AsyncResultStatus.Succeeded ? String(r.value ?? "") : ""),
    );
  });

const setSelectedText = (text: string) =>
  new Promise<void>((resolve, reject) => {
    Office.context.document.setSelectedDataAsync(text, { coercionType: Office.CoercionType.Text }, (r) =>
      r.status === Office.AsyncResultStatus.Succeeded ? resolve() : reject(new Error(r.error.message)),
    );
  });

async function allSlidesText(): Promise<string> {
  return PowerPoint.run(async (ctx) => {
    const slides = ctx.presentation.slides;
    slides.load("items");
    await ctx.sync();
    const frames = slides.items.map((s) => {
      s.shapes.load("items/type");
      return s;
    });
    await ctx.sync();
    const ranges = frames.map((s) =>
      s.shapes.items
        .filter((sh) => sh.type !== "Image" && sh.type !== "Table")
        .map((sh) => {
          sh.textFrame.textRange.load("text");
          return sh.textFrame.textRange;
        }),
    );
    await ctx.sync().catch(() => undefined); // shapes without text frames are skipped below
    return ranges
      .map((rs, i) => `Folie ${i + 1}:\n${rs.map((r) => (r.isNullObject === false || r.text ? r.text : "")).filter(Boolean).join("\n")}`)
      .join("\n\n");
  });
}

export const powerpointAdapter: HostAdapter = {
  hostName: "PowerPoint",

  async getContext() {
    const selected = await getSelectedText();
    return selected.trim() ? selected : allSlidesText();
  },

  /** Adds a new last slide holding the text in a text box. */
  insert: (text) =>
    PowerPoint.run(async (ctx) => {
      ctx.presentation.slides.add();
      await ctx.sync();
      const slides = ctx.presentation.slides;
      slides.load("items");
      await ctx.sync();
      const last = slides.items[slides.items.length - 1];
      last.shapes.addTextBox(text, { left: 50, top: 50, width: 620, height: 380 });
      await ctx.sync();
    }),

  replaceSelection: setSelectedText,
};
