import { useApp } from "../state/app-store.jsx";

export default function AppModal() {
  const { modalContent, closeModal } = useApp();
  if (!modalContent) return null;
  return (
    <div className="modal" onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className="modal-body">
        <button className="modal-close" onClick={closeModal}>✕</button>
        <div id="modal-content">{modalContent}</div>
      </div>
    </div>
  );
}
