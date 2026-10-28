import { createRoot } from "react-dom/client";
import { ChatPane } from "@open-officeui/ui";
import { powerpointAdapter } from "./powerpointAdapter";

Office.onReady(() => {
  createRoot(document.getElementById("root")!).render(<ChatPane host={powerpointAdapter} />);
});
