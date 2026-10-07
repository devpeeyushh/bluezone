"use client";

import React from "react";
import { RADIO_STATIONS } from "../../../data/mockRadioData";
import { AtmosphericField } from "./AtmosphericField";
import { WorldGrid } from "./WorldGrid";
import { DistantStructures } from "./DistantStructures";
import { NetworkBackground } from "./NetworkBackground";
import { SignalParticleField } from "./SignalParticleField";
import { FloorSignalLayer } from "./FloorSignalLayer";
import { SignalPaths } from "./SignalPaths";
import { StationEnergy } from "./StationEnergy";
import { useEnvironmentState } from "./useEnvironmentState";
import { WorldDirector } from "./WorldDirector";
import { LightShafts } from "./LightShafts";
import { GlassSheen } from "./GlassSheen";

// Composes every visual-only environment layer around the facility.
// Reads progression once (re-renders only when the level / cinematic phase changes);
// all continuous animation runs in each layer's useFrame against shader uniforms.
export const FacilityAtmosphere: React.FC = () => {
  const { level, converging, motion } = useEnvironmentState();

  return (
    <group>
      <WorldDirector reducedMotion={motion < 1} />
      <AtmosphericField level={level} converging={converging} motion={motion} />
      <WorldGrid level={level} motion={motion} />
      <DistantStructures level={level} motion={motion} />
      <LightShafts level={level} motion={motion} />
      <NetworkBackground level={level} converging={converging} motion={motion} />
      <SignalParticleField level={level} converging={converging} motion={motion} />
      <FloorSignalLayer level={level} motion={motion} />
      <GlassSheen level={level} motion={motion} />
      <SignalPaths level={level} converging={converging} motion={motion} />
      {RADIO_STATIONS.map((station) => (
        <StationEnergy key={station.id} station={station} level={level} motion={motion} />
      ))}
    </group>
  );
};
