import { createRoot } from "react-dom/client";
import { ChatPane } from "@open-officeui/ui";
import { excelAdapter } from "./excelAdapter";

Office.onReady(() => {
  createRoot(document.getElementById("root")!).render(<ChatPane host={excelAdapter} />);
});
