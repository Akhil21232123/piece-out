type BusyFn = (n: number) => void;

let busy = 0;
let owner: (() => void) | null = null;
const subs = new Set<BusyFn>();

function emit() {
  for (const fn of subs) fn(busy);
}

export function peelBusy() {
  return busy > 0;
}

export function onPeelBusy(fn: BusyFn) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function claimPeel() {
  busy += 1;
  emit();
}

export function releasePeel() {
  if (busy === 0) return;
  busy -= 1;
  emit();
}

export function exclusivePeel(rest: () => void) {
  if (owner && owner !== rest) {
    const prev = owner;
    owner = rest;
    prev();
    return;
  }
  owner = rest;
}

export function dropPeel(rest: () => void) {
  if (owner === rest) owner = null;
}
