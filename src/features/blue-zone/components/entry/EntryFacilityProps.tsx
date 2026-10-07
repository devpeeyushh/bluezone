"use client";

import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RADIO_STATIONS } from "../../data/mockRadioData";
import { getStationStatus } from "../../utils/stationStatus";
import { useProgressSnapshot } from "../scene/environment/useEnvironmentState";
import { noRaycast } from "../scene/environment/envUtils";
import { BoardHologram } from "../scene/environment/BoardHologram";

// Landing-only stand-ins for the facility interior, seen from outside: console silhouettes with lit
// screens (status colour from the existing station status) and the Investigation Board with its
// hologram. Purely visual — the real InteractiveStation / InvestigationBoardMesh are NOT mounted here
// because they register gameplay interactables. Two instanced draws + the board.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _local = new THREE.Vector3();

export const EntryFacilityProps: React.FC = () => {
  const progress = useProgressSnapshot();
  const pedestals = useRef<THREE.InstancedMesh>(null);
  const screens = useRef<THREE.InstancedMesh>(null);

  const pedestalMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0c172d", roughness: 0.45, metalness: 0.6 }),
    []
  );
  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  useLayoutEffect(
    () => () => {
      pedestalMaterial.dispose();
      screenMaterial.dispose();
      boxGeometry.dispose();
      planeGeometry.dispose();
    },
    [pedestalMaterial, screenMaterial, boxGeometry, planeGeometry]
  );

  // Layout (static) — same positions/rotations as the real consoles
  useLayoutEffect(() => {
    RADIO_STATIONS.forEach((st, i) => {
      _q.setFromEuler(_e.set(st.rotation3D[0], st.rotation3D[1], st.rotation3D[2]));
      _local.set(0, -0.4, 0).applyQuaternion(_q);
      _m.compose(_p.set(...st.position3D).add(_local), _q, _s.set(1.4, 0.8, 0.8));
      pedestals.current?.setMatrixAt(i, _m);
      // Screen tilted back like the real CRT surface
      const tilt = new THREE.Quaternion().setFromEuler(_e.set(-0.2, 0, 0));
      _local.set(0, 0.35, 0.06).applyQuaternion(_q);
      _m.compose(_p.set(...st.position3D).add(_local), _q.clone().multiply(tilt), _s.set(1.1, 0.6, 1));
      screens.current?.setMatrixAt(i, _m);
    });
    if (pedestals.current) pedestals.current.instanceMatrix.needsUpdate = true;
    if (screens.current) screens.current.instanceMatrix.needsUpdate = true;
  }, []);

  // Screen colours follow the existing status (re-applied only when progress changes)
  useLayoutEffect(() => {
    const mesh = screens.current;
    if (!mesh) return;
    const c = new THREE.Color();
    RADIO_STATIONS.forEach((st, i) => {
      const status = getStationStatus(st.id, progress);
      c.set(status.color).multiplyScalar(status.isLocked ? 0.35 : 0.6);
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [progress]);

  const solved = (progress.challenge1Solved ? 1 : 0) + (progress.challenge2Solved ? 1 : 0) + (progress.challenge3Solved ? 1 : 0);

  return (
    <group>
      <instancedMesh ref={pedestals} args={[boxGeometry, pedestalMaterial, RADIO_STATIONS.length]} raycast={noRaycast} />
      <instancedMesh ref={screens} args={[planeGeometry, screenMaterial, RADIO_STATIONS.length]} raycast={noRaycast} />
      {/* Investigation Board on the back wall */}
      <group position={[0, 2.5, -5.75]}>
        <mesh raycast={noRaycast}>
          <boxGeometry args={[4.2, 2.4, 0.15]} />
          <meshStandardMaterial color="#081020" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.08]} raycast={noRaycast}>
          <planeGeometry args={[4.0, 2.2]} />
          <meshStandardMaterial color="#041427" emissive="#00f0ff" emissiveIntensity={0.18} roughness={0.2} />
        </mesh>
        <BoardHologram progress={solved + (progress.completed ? 1 : 0)} focused={false} />
      </group>
    </group>
  );
};
