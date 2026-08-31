"use client";

import { useChamberStore } from "@/store/chamberStore";
import { Mist } from "./Mist";
import { VelvetDefs } from "./VelvetDefs";

export function Atmosphere() {
  const introDone = useChamberStore((state) => state.introDone);

  return (
    <>
      <VelvetDefs />
      <div className="emp-wash" />
      <div className="emp-shaft" />
      <Mist />
      <div className="emp-vignette" />
      <div className="emp-grain" />
      {introDone ? <div className="emp-frame" /> : null}
    </>
  );
}
