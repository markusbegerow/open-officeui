import type { HostAdapter } from "@open-officeui/core";

export const wordAdapter: HostAdapter = {
  hostName: "Word",

  getContext: () =>
    Word.run(async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      if (sel.text.trim()) return sel.text;
      const body = ctx.document.body;
      body.load("text");
      await ctx.sync();
      return body.text;
    }),

  insert: (text) =>
    Word.run(async (ctx) => {
      ctx.document.getSelection().insertText(text, "End");
      await ctx.sync();
    }),

  replaceSelection: (text) =>
    Word.run(async (ctx) => {
      ctx.document.getSelection().insertText(text, "Replace");
      await ctx.sync();
    }),
};
