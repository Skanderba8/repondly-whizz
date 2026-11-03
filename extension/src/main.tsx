import { createRoot } from "react-dom/client";
import { AppearanceProvider } from "@/components/appearance-provider";
import "@/app/globals.css";
import { Popup } from "./popup";

createRoot(document.getElementById("root")!).render(<AppearanceProvider><Popup /></AppearanceProvider>);
