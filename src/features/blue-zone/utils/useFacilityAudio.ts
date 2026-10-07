"use client";

import { useEffect } from "react";
import { RADIO_STATIONS } from "../data/mockRadioData";
import { BlueZoneState, useBlueZoneStore } from "../store/useBlueZoneStore";
import { getSolvedCount, getStationStatus } from "./stationStatus";
import { CinematicAudioStage, safeAudio, sound } from "./sound";
import { BOARD_AUDIO_POSITION, panFor } from "./audioSpace";

// Facility audio lifecycle, mounted once by RadioHub. Everything is driven by transitions of the
// EXISTING store flags through a single store subscription (no React state, no re-render cost):
//  - mute toggle            → engine enabled / all loops stopped
//  - hub mount / unmount    → ambience starts / every loop stops (exit)
//  - modal open / close     → open, denied (locked) or board cues; close cue
//  - challenge solved       → confirmation in the modal; environmental surge + objective update
//                             when the player returns to the facility (matches the visual wave)
//  - cinematic stage        → bed follows the stage only while the relay console is open
//  - completed              → "system sealed", once per actual false → true transition
// A transition can only fire once, because each check compares the new state with the previous one.

type Snapshot = BlueZoneState;

const CINEMATIC_STAGES: CinematicAudioStage[] = ["stabilizing", "reconstructing", "revealed"];

const cinematicStageOf = (s: Snapshot): CinematicAudioStage | null =>
  s.activeStation === "emergency-broadcast" &&
  s.broadcastUnlocked &&
  CINEMATIC_STAGES.includes(s.cinematicStage as CinematicAudioStage)
    ? (s.cinematicStage as CinematicAudioStage)
    : null;

const moodOf = (s: Snapshot) => (s.completed ? 4 : getSolvedCount(s));

const stationPan = (id: string) => {
  const st = RADIO_STATIONS.find((x) => x.id === id);
  return st ? panFor(st.position3D[0], st.position3D[2]) * 0.6 : 0;
};

export function useFacilityAudio() {
  useEffect(() => {
    const store = useBlueZoneStore;
    let returnTimer: ReturnType<typeof setTimeout> | null = null;
    // Set when a challenge is solved inside a modal; consumed when the player is back in the facility
    let pendingReturn = false;

    const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const onMotionPref = () => sound.setReducedMotion(Boolean(mq?.matches));
    onMotionPref();
    mq?.addEventListener("change", onMotionPref);

    const startFacility = (s: Snapshot) => {
      sound.startAmbience();
      sound.setAmbienceMood(moodOf(s));
      sound.setCinematic(cinematicStageOf(s));
    };

    const init = store.getState();
    safeAudio(() => {
      sound.setEnabled(init.audioEnabled);
      if (init.audioEnabled) startFacility(init);
    });

    const playReturn = () => {
      if (!pendingReturn) return;
      pendingReturn = false;
      if (returnTimer) clearTimeout(returnTimer);
      // Slight delay so the surge lands with the visual wave as the backdrop clears
      returnTimer = setTimeout(() => {
        returnTimer = null;
        safeAudio(() => sound.solveReturn(panFor(BOARD_AUDIO_POSITION[0], BOARD_AUDIO_POSITION[1]) * 0.6, true));
      }, 300);
    };

    const unsub = store.subscribe((s, p) => safeAudio(() => {
      // Mute / unmute
      if (s.audioEnabled !== p.audioEnabled) {
        sound.setEnabled(s.audioEnabled);
        if (s.audioEnabled) startFacility(s);
      }
      const audible = s.audioEnabled;
      const wasOpen = Boolean(p.activeStation || p.investigationBoardOpen);
      const isOpen = Boolean(s.activeStation || s.investigationBoardOpen);

      // Spatial loops never play behind a modal
      if (isOpen && !wasOpen) {
        sound.setMovement(0);
        sound.setPresence(0);
      }

      // Station modal opened (or switched to another station)
      if (s.activeStation && s.activeStation !== p.activeStation && audible) {
        const status = getStationStatus(s.activeStation, s);
        if (status.isLocked) sound.denied(stationPan(s.activeStation));
        else sound.openStation(stationPan(s.activeStation));
      }
      // Board opened
      if (s.investigationBoardOpen && !p.investigationBoardOpen && audible) sound.openBoard();

      // Challenge solved: one confirmation per actual false → true transition
      const solvedNow = getSolvedCount(s);
      if (solvedNow > getSolvedCount(p)) {
        if (audible) sound.solveConfirm();
        pendingReturn = true;
      }
      if (moodOf(s) !== moodOf(p)) sound.setAmbienceMood(moodOf(s));

      // Back in the facility
      if (wasOpen && !isOpen) {
        if (audible) sound.closeModal();
        if (audible) playReturn();
        else pendingReturn = false;
      } else if (!isOpen && pendingReturn && audible) {
        playReturn();
      }

      // Emergency Broadcast bed follows the stage only while its console is open
      const cs = cinematicStageOf(s);
      if (cs !== cinematicStageOf(p) && audible) sound.setCinematic(cs);

      // Completion: once
      if (s.completed && !p.completed && audible) sound.sealed();
    }));

    return () => {
      unsub();
      mq?.removeEventListener("change", onMotionPref);
      if (returnTimer) clearTimeout(returnTimer);
      // Leaving the facility: nothing keeps playing
      safeAudio(() => {
        sound.stopLoops(0.3);
        sound.sleepSoon();
      });
    };
  }, []);
}
