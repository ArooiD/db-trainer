export default function AppModal() {
  return (
    <>
  <div id="modal" className="modal hidden">
    <div className="modal-body">
      <button className="modal-close" id="modal-close">✕</button>
      <div id="modal-content"></div>
    </div>
  </div>
    </>
  );
}
