"use client";

export function FrameSwitch({
  withFrame,
  onChange,
}: {
  withFrame: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="frame-switch">
      <span className={`frame-switch-label ${withFrame ? "is-dim" : "is-hot"}`}>No frame</span>
      <button
        type="button"
        role="switch"
        aria-checked={withFrame ? "true" : "false"}
        aria-label="Toggle frame"
        onClick={() => onChange(!withFrame)}
        className={`frame-switch-track ${withFrame ? "is-on" : ""}`}
      >
        <span className="frame-shine" aria-hidden />
        <span className="frame-spark" aria-hidden />
        <span className={`frame-knob ${withFrame ? "is-on" : ""}`} />
      </button>
      <span className={`frame-switch-label ${withFrame ? "is-hot" : "is-dim"}`}>Frame</span>
    </div>
  );
}
