"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { FacilityAtmosphere } from "../scene/environment/FacilityAtmosphere";
import { RoomGeometry } from "../scene/RoomGeometry";
import { usePrefersReducedMotion } from "../scene/environment/envUtils";
import { EntryCamera } from "./EntryCamera";
import { EntryBeacon } from "./EntryBeacon";
import { EntryFacilityProps } from "./EntryFacilityProps";

// Landing hero: the real Blue Zone world seen from outside — the same sky, grid, masts, beams,
// network, particles, glass and station holograms as inside (FacilityAtmosphere + RoomGeometry),
// so there is no second universe to maintain. The real InteractiveStation / InvestigationBoardMesh
// are NOT mounted here (they register gameplay interactables); EntryFacilityProps draws visual
// stand-ins instead. No player, no pointer lock.

const EntryHeroScene: React.FC = () => {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      // Decorative backdrop: no pointer events into the scene (the DOM UI sits on top)
      style={{ pointerEvents: "none" }}
    >
      <PerspectiveCamera makeDefault fov={42} near={0.1} far={240} />
      <EntryCamera reducedMotion={reducedMotion} />
      <Suspense fallback={null}>
        <FacilityAtmosphere />
        <RoomGeometry />
        <EntryFacilityProps />
        <EntryBeacon motion={reducedMotion ? 0.25 : 1} />
      </Suspense>
    </Canvas>
  );
};

export default EntryHeroScene;
