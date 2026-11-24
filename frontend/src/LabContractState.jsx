import { shortenAddress } from "./addressFormat";

export default function LabContractState({ labState, publicKey }) {
  return (
    <div className="info-box">
      <span className="eyebrow">Contract state</span>
      <div className="metadata-grid">
        <div>
          <span className="metadata-label">lab_name</span>
          <span className="metadata-value">{labState.labName ?? "—"}</span>
        </div>
        <div>
          <span className="metadata-label">builder_count</span>
          <span className="metadata-value">{labState.builderCount ?? 0}</span>
        </div>
        <div>
          <span className="metadata-label">get_builder (you)</span>
          <span className="metadata-value">
            {publicKey ? labState.builder ?? "Not registered" : "Connect to check"}
          </span>
        </div>
        <div>
          <span className="metadata-label">paused</span>
          <span className="metadata-value">
            {labState.paused ? "Yes — registration paused" : "No"}
          </span>
        </div>
        <div>
          <span className="metadata-label">get_admin</span>
          <span className="metadata-value">
            {labState.admin ? shortenAddress(labState.admin) : "Not set"}
          </span>
        </div>
      </div>
    </div>
  );
}
