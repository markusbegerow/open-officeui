import type { HostAdapter } from "@open-officeui/core";

type Item = Office.MessageRead & Office.MessageCompose;
const item = () => Office.context.mailbox.item as unknown as Item;

/** In compose mode the item has a body setter; in read mode we can only open a reply form. */
const isCompose = () => typeof (item().body as Office.Body | undefined)?.setSelectedDataAsync === "function";

const asyncOp = <T>(run: (cb: (r: Office.AsyncResult<T>) => void) => void) =>
  new Promise<T>((resolve, reject) =>
    run((r) => (r.status === Office.AsyncResultStatus.Succeeded ? resolve(r.value) : reject(new Error(r.error.message)))),
  );

const getSelected = () =>
  isCompose()
    ? asyncOp<{ data: string }>((cb) => item().getSelectedDataAsync(Office.CoercionType.Text, cb)).then((v) => v.data)
    : Promise.resolve("");

const setSelected = (text: string) =>
  asyncOp<void>((cb) => item().setSelectedDataAsync(text, { coercionType: Office.CoercionType.Text }, cb));

export const outlookAdapter: HostAdapter = {
  hostName: "Outlook",

  async getContext() {
    const selected = await getSelected();
    if (selected.trim()) return selected;
    return asyncOp<string>((cb) => item().body.getAsync(Office.CoercionType.Text, cb));
  },

  async insert(text) {
    if (isCompose()) return setSelected(text);
    item().displayReplyForm(text);
  },

  async replaceSelection(text) {
    if (isCompose()) return setSelected(text);
    item().displayReplyForm(text);
  },
};
