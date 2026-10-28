import { createRoot } from "react-dom/client";
import { ChatPane } from "@open-officeui/ui";
import { wordAdapter } from "./wordAdapter";

Office.onReady(() => {
  createRoot(document.getElementById("root")!).render(<ChatPane host={wordAdapter} />);
});
