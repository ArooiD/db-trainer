import { useEffect, useState } from "react";

export default function ConnectionStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span className={`connection-status${offline ? " offline" : ""}`} aria-live="polite">
      {offline ? "Офлайн" : ""}
    </span>
  );
}
