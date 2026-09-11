import { useEffect } from "react";
import { useApp } from "../../state/app-store.jsx";
import { openDesigner, closeDesigner } from "../../design/er-designer.js";

export default function DesignerOverlay() {
  const { designer, closeDesigner: close } = useApp();

  useEffect(() => {
    if (!designer.open) return undefined;
    openDesigner(designer.task);
    return () => closeDesigner();
  }, [designer.open, designer.task]);

  // Close button inside the imperative overlay dispatches a custom event.
  useEffect(() => {
    const onClose = () => close();
    window.addEventListener("it-study-lab:designer-close", onClose);
    return () => window.removeEventListener("it-study-lab:designer-close", onClose);
  }, [close]);

  return null;
}
