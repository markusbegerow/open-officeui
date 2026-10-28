import { createRoot } from "react-dom/client";
import { ChatPane } from "@open-officeui/ui";
import { outlookAdapter } from "./outlookAdapter";

Office.onReady(() => {
  createRoot(document.getElementById("root")!).render(<ChatPane host={outlookAdapter} />);
});
