export function VelvetDefs() {
  return (
    <svg className="emp-svg-defs" aria-hidden>
      <filter id="velvet-nap" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n" />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0.42  0 0 0 0 0.08  0 0 0 0 0.14  0 0 0 0.5 0"
        />
      </filter>
    </svg>
  );
}
