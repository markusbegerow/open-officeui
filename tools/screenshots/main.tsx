// Screenshot harness: the real chat pane with a fake host (no Office.js) and fictional content.
import { createRoot } from "react-dom/client";
import { ChatPane } from "@open-officeui/ui";
import type { HostAdapter } from "@open-officeui/core";

const MEMO = `Q3 project update - Muster GmbH

The website relaunch is progressing well. The new design has passed internal review and goes live on 14 November.

The customer portal is two weeks behind schedule because a vendor delivery was delayed. The beta is now planned for 5 December.

Spending is at 82 % of the quarterly budget. No additional funds are requested; a budget review is scheduled for 19 December.`;

const host: HostAdapter = {
  hostName: "Word",
  getContext: async () => MEMO,
  insert: async () => {},
  replaceSelection: async () => {},
};

createRoot(document.getElementById("root")!).render(<ChatPane host={host} />);
