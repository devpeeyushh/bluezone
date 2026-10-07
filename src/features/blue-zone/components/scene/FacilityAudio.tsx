"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RADIO_STATIONS } from "../../data/mockRadioData";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { getNearestInteractable } from "../../utils/useInteractable";
import { FocusKind, MovementLevel, safeAudio, sound } from "../../utils/sound";
import { BOARD_AUDIO_POSITION, audioListener, panFor } from "../../utils/audioSpace";
import { playerPresence } from "./environment/playerPresence";

// In-canvas audio listener (renders nothing). Reads the existing proximity/interaction data and
// the camera, and only *changes* audio parameters on state transitions:
//  - movement texture: walk / sprint / stop transitions
//  - station presence hum: re-evaluated 10x per second, silent beyond ~4.5 m
//  - focus cue: once when the interaction target changes (store subscription, not render)
// No React state, no allocation per frame.

const PRESENCE_RANGE = 4.5;
const PRESENCE_FULL = 1.6;
const SPRINT_RATIO = 0.8; // walk speed is ~0.67 of sprint speed
const MOVING_RATIO = 0.06;
const FOCUS_REPEAT_MS = 350;

const _probe = new THREE.Vector3();
const BOARD_ID = "investigation-board";

const isModalOpenNow = () => {
  const s = useBlueZoneStore.getState();
  return Boolean(s.activeStation || s.investigationBoardOpen);
};

const positionOf = (id: string): [number, number] => {
  if (id === BOARD_ID) return BOARD_AUDIO_POSITION;
  const st = RADIO_STATIONS.find((s) => s.id === id);
  return st ? [st.position3D[0], st.position3D[2]] : [0, 0];
};

export const FacilityAudio = () => {
  const camera = useThree((s) => s.camera);
  const movement = useRef<MovementLevel>(0);
  const tick = useRef(0);
  const lastPresence = useRef({ level: 0, pan: 0, kind: "" });

  // Focus cue on target change (also distinguishes locked / solved / board)
  useEffect(() => {
    let lastId = useBlueZoneStore.getState().interactionPrompt?.targetId ?? "";
    let lastAt = 0;
    const unsub = useBlueZoneStore.subscribe((s, prev) => safeAudio(() => {
      // Unmuting: resend the current presence on the next tick (it was computed while silent)
      if (s.audioEnabled !== prev.audioEnabled) lastPresence.current.kind = "";
      if (s.interactionPrompt === prev.interactionPrompt) return;
      // The prompt is cleared while a modal is open; returning to the same target is not a new focus
      if (s.activeStation || s.investigationBoardOpen) return;
      const id = s.interactionPrompt?.targetId ?? "";
      if (id === lastId) return;
      lastId = id;
      if (!id || !s.audioEnabled) return;
      const now = performance.now();
      if (now - lastAt < FOCUS_REPEAT_MS) return; // boundary jitter between two targets
      lastAt = now;
      const p = s.interactionPrompt!;
      const kind: FocusKind =
        id === BOARD_ID ? "board" : p.isLocked ? "locked" : p.statusColor === "#10b981" ? "solved" : "station";
      const [x, z] = positionOf(id);
      sound.focus(kind, panFor(x, z) * 0.7);
    }));
    return () => {
      unsub();
      safeAudio(() => {
        sound.setMovement(0);
        sound.setPresence(0);
      });
    };
  }, []);

  useFrame((_, delta) => {
    // Listener pose for panning (camera right vector from its world matrix)
    const e = camera.matrixWorld.elements;
    audioListener.x = camera.position.x;
    audioListener.z = camera.position.z;
    const rl = Math.hypot(e[0], e[2]) || 1;
    audioListener.rightX = e[0] / rl;
    audioListener.rightZ = e[2] / rl;

    const blocked = isModalOpenNow() || playerPresence.active < 0.5;

    // Movement: only on walk/sprint/stop transitions
    const ratio = blocked ? 0 : playerPresence.speed;
    const level: MovementLevel = ratio > SPRINT_RATIO ? 2 : ratio > MOVING_RATIO ? 1 : 0;
    if (level !== movement.current) {
      movement.current = level;
      safeAudio(() => sound.setMovement(level));
    }

    // Presence hum, throttled
    tick.current += delta;
    if (tick.current < 0.1) return;
    tick.current = 0;
    let target = 0;
    let pan = 0;
    let kind: "station" | "board" | "locked" = "station";
    if (!blocked) {
      _probe.set(playerPresence.x, 1.6, playerPresence.z);
      const item = getNearestInteractable(_probe, PRESENCE_RANGE);
      if (item) {
        const d = Math.hypot(item.position[0] - playerPresence.x, item.position[2] - playerPresence.z);
        const t = Math.min(1, Math.max(0, (PRESENCE_RANGE - d) / (PRESENCE_RANGE - PRESENCE_FULL)));
        target = t * t * (3 - 2 * t);
        const [sx, sz] = positionOf(item.id);
        pan = panFor(sx, sz);
        kind = item.id === BOARD_ID ? "board" : item.isLocked ? "locked" : "station";
      }
    }
    const last = lastPresence.current;
    if (Math.abs(target - last.level) > 0.02 || Math.abs(pan - last.pan) > 0.05 || kind !== last.kind) {
      last.level = target;
      last.pan = pan;
      last.kind = kind;
      safeAudio(() => sound.setPresence(target, pan, kind));
    }
  });

  return null;
};
