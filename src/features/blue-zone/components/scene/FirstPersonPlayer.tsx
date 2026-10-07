"use client";

import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { BLUE_ZONE_CONFIG } from "../../data/config";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { getNearestInteractable, InteractableRegistration } from "../../utils/useInteractable";
import { usePrefersReducedMotion } from "./environment/envUtils";
import { playerPresence } from "./environment/playerPresence";

// Camera pose kept by the parent so toggling Orbit <-> First Person does not respawn the player
export interface PlayerPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

interface FirstPersonPlayerProps {
  isLocked: boolean;
  onLockChange: (locked: boolean) => void;
  poseRef: React.MutableRefObject<PlayerPose | null>;
}

// Large single-event deltas are a known pointer-lock artefact (camera jump on re-lock)
const MAX_MOUSE_DELTA = 250;
// Frame-time cap so a hitch (tab switch, GC pause) cannot tunnel the player through obstacles
const MAX_FRAME_DELTA = 0.05;

// Scratch objects reused every frame (only one player exists), so movement allocates nothing per frame
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _yaw = new THREE.Euler();
const _next = new THREE.Vector3();
const _wish = new THREE.Vector2();

// Very subtle head-bob while walking (camera height only; collision/interaction use playerPos)
const HEAD_BOB_AMPLITUDE = 0.018;
const HEAD_BOB_FREQUENCY = 6.5; // radians per metre walked

// Movement feel only: top speeds are unchanged, velocity just eases toward them (and back to rest).
// Stopping distance at walk speed is ~0.2 m, so the player never drifts noticeably.
const ACCELERATION_RESPONSE = 16;
const DECELERATION_RESPONSE = 20;
const REDUCED_MOTION_RESPONSE = 40;
// Sprinting widens the view by a couple of degrees (off under reduced motion)
const SPRINT_FOV_BOOST = 2.5;
const SPRINT_SPEED = BLUE_ZONE_CONFIG.PLAYER.MOVE_SPEED * BLUE_ZONE_CONFIG.PLAYER.SPRINT_MULTIPLIER;

const isModalOpenNow = () => {
  const s = useBlueZoneStore.getState();
  return Boolean(s.activeStation || s.investigationBoardOpen);
};

const promptSignature = (item: InteractableRegistration | null) =>
  item ? `${item.id}|${item.name}|${item.status}|${item.requirement}|${item.isLocked}` : "";

export const FirstPersonPlayer: React.FC<FirstPersonPlayerProps> = ({ isLocked, onLockChange, poseRef }) => {
  const { camera, gl } = useThree();
  const { activeStation, investigationBoardOpen, setInteractionPrompt } = useBlueZoneStore(
    useShallow((s) => ({
      activeStation: s.activeStation,
      investigationBoardOpen: s.investigationBoardOpen,
      setInteractionPrompt: s.setInteractionPrompt,
    }))
  );

  const isModalOpen = Boolean(activeStation || investigationBoardOpen);

  const playerPos = useRef(
    poseRef.current ? poseRef.current.position.clone() : new THREE.Vector3(...BLUE_ZONE_CONFIG.PLAYER.INITIAL_POSITION)
  );
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const keys = useRef<Record<string, boolean>>({});
  const lastPromptSignature = useRef("");
  const bob = useRef({ phase: 0, amp: 0 });
  const velocity = useRef(new THREE.Vector2());
  const baseFov = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  // Setup initial camera orientation (restores the previous first-person pose if one exists)
  useEffect(() => {
    camera.position.copy(playerPos.current);
    if (poseRef.current) {
      camera.quaternion.copy(poseRef.current.quaternion);
    } else {
      camera.rotation.set(0, 0, 0);
    }
    euler.current.setFromQuaternion(camera.quaternion);
    const perspective = camera as THREE.PerspectiveCamera;
    baseFov.current = perspective.fov;

    return () => {
      // Hand the shared camera back exactly as we found it (Orbit mode reuses it)
      if (baseFov.current !== null && perspective.fov !== baseFov.current) {
        perspective.fov = baseFov.current;
        perspective.updateProjectionMatrix();
      }
      playerPresence.active = 0;
      playerPresence.speed = 0;
      // Save from our own yaw/pitch state, not the camera: OrbitControls re-aims the shared camera
      // while it is being created, which happens before this cleanup runs.
      poseRef.current = {
        position: playerPos.current.clone(),
        quaternion: new THREE.Quaternion().setFromEuler(euler.current),
      };
      // Never leave a stale [E] prompt behind (e.g. after switching to Orbit mode)
      lastPromptSignature.current = "";
      setInteractionPrompt(null);
    };
  }, [camera, poseRef, setInteractionPrompt]);

  // When any modal opens, immediately release pointer lock if currently held
  useEffect(() => {
    if (isModalOpen) {
      // Clear movement keys so player doesn't keep sliding
      keys.current = {};
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [isModalOpen]);

  // Keyboard handlers: only active when NO modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Never process player controller keys when modal is open (read live store state, not the render closure)
      if (isModalOpen || isModalOpenNow()) return;

      keys.current[e.code] = true;

      // Handle [E] key interaction if prompt is active (ignore auto-repeat from a held key)
      if (e.code === "KeyE" && !e.repeat) {
        const nearest = getNearestInteractable(playerPos.current);
        if (nearest) {
          // Release pointer lock immediately before opening modal
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          nearest.onInteract();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isModalOpen) {
        keys.current = {};
        return;
      }
      keys.current[e.code] = false;
    };

    // Keys released while the window is unfocused never fire keyup
    const handleBlur = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isModalOpen]);

  // Pointer lock change listeners
  useEffect(() => {
    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      // Safety net: a lock request that resolves after a modal opened must not trap the cursor
      if (locked && isModalOpenNow()) {
        document.exitPointerLock();
        onLockChange(false);
        return;
      }
      if (!locked) keys.current = {};
      onLockChange(locked);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Guard: strictly require canvas pointer lock AND no open modal
      if (isModalOpen || document.pointerLockElement !== gl.domElement) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      if (Math.abs(movementX) > MAX_MOUSE_DELTA || Math.abs(movementY) > MAX_MOUSE_DELTA) return;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= movementX * 0.0022;
      euler.current.x -= movementY * 0.0022;
      // Clamp vertical pitch to prevent neck snapping
      euler.current.x = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [camera, gl, onLockChange, isModalOpen]);

  // Check collision against room boundaries and rectangular obstacles
  const checkCollision = (targetPos: THREE.Vector3) => {
    const r = BLUE_ZONE_CONFIG.PLAYER.COLLISION_RADIUS;
    const { MIN_X, MAX_X, MIN_Z, MAX_Z } = BLUE_ZONE_CONFIG.ROOM_BOUNDS;

    // Room outer walls
    if (targetPos.x - r < MIN_X || targetPos.x + r > MAX_X) return true;
    if (targetPos.z - r < MIN_Z || targetPos.z + r > MAX_Z) return true;

    // Obstacles
    for (const [minX, minZ, maxX, maxZ] of BLUE_ZONE_CONFIG.OBSTACLES) {
      if (
        targetPos.x + r > minX &&
        targetPos.x - r < maxX &&
        targetPos.z + r > minZ &&
        targetPos.z - r < maxZ
      ) {
        return true;
      }
    }

    return false;
  };

  // Publish the HUD prompt only when the focused target (or its status) actually changes.
  // Writing to the store every frame re-rendered every subscribed component ~60x per second.
  const publishPrompt = (item: InteractableRegistration | null) => {
    const signature = promptSignature(item);
    if (signature === lastPromptSignature.current) return;
    lastPromptSignature.current = signature;
    setInteractionPrompt(
      item
        ? {
            targetId: item.id,
            name: item.name,
            status: item.status ?? "",
            statusColor: item.statusColor ?? "#00f0ff",
            requirement: item.requirement ?? null,
            isLocked: Boolean(item.isLocked),
            action: item.onInteract,
          }
        : null
    );
  };

  // Bob eases in while walking and settles gently back to eye height when stopped (off under reduced motion)
  const applyHeadBob = (moved: number, delta: number) => {
    const b = bob.current;
    const walking = moved > 0.0005 && !reducedMotionRef.current;
    const targetAmp = walking ? HEAD_BOB_AMPLITUDE : 0;
    b.amp += (targetAmp - b.amp) * Math.min(1, delta * (walking ? 8 : 5));
    b.phase += moved * HEAD_BOB_FREQUENCY;
    camera.position.y = playerPos.current.y + Math.sin(b.phase) * b.amp;
  };

  // Subtle sprint response: a couple of degrees of extra field of view, eased in and out
  const applySprintFov = (speedRatio: number, delta: number) => {
    const base = baseFov.current;
    if (base === null) return;
    const perspective = camera as THREE.PerspectiveCamera;
    const boost = reducedMotionRef.current ? 0 : Math.max(0, (speedRatio - 0.72) / 0.28) * SPRINT_FOV_BOOST;
    const next = perspective.fov + (base + boost - perspective.fov) * Math.min(1, delta * 6);
    if (Math.abs(next - perspective.fov) > 0.0005) {
      perspective.fov = Math.abs(next - base) < 0.001 ? base : next;
      perspective.updateProjectionMatrix();
    }
  };

  const publishPresence = (delta: number) => {
    playerPresence.x = playerPos.current.x;
    playerPresence.z = playerPos.current.z;
    playerPresence.active += (1 - playerPresence.active) * Math.min(1, delta * 3);
    playerPresence.speed = Math.min(1, velocity.current.length() / SPRINT_SPEED);
  };

  useFrame((_, rawDelta) => {
    // If modal is active: strictly disable movement, prompts, and updates
    if (isModalOpen) {
      publishPrompt(null);
      // Return to the exact same pose afterwards, without leftover momentum
      velocity.current.set(0, 0);
      return;
    }

    // Check nearest interactable station to populate HUD prompt
    publishPrompt(getNearestInteractable(playerPos.current));

    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

    // Only process translation if pointer is actively locked to the canvas
    if (!isLocked) {
      velocity.current.set(0, 0);
      applyHeadBob(0, delta);
      applySprintFov(0, delta);
      publishPresence(delta);
      return;
    }

    // Desired velocity from input (same speeds as before)
    const sprinting = keys.current["ShiftLeft"] || keys.current["ShiftRight"];
    const maxSpeed = sprinting ? SPRINT_SPEED : BLUE_ZONE_CONFIG.PLAYER.MOVE_SPEED;
    const moveDir = _moveDir.set(0, 0, 0);

    if (keys.current["KeyW"] || keys.current["ArrowUp"]) moveDir.z -= 1;
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) moveDir.z += 1;
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) moveDir.x -= 1;
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) moveDir.x += 1;

    const wish = _wish.set(0, 0);
    const hasInput = moveDir.lengthSq() > 0;
    if (hasInput) {
      moveDir.normalize();

      // Transform direction according to horizontal yaw
      _yaw.set(0, euler.current.y, 0);
      const forward = _forward.set(0, 0, -1).applyEuler(_yaw);
      const right = _right.set(1, 0, 0).applyEuler(_yaw);
      const dir = forward.multiplyScalar(-moveDir.z).add(right.multiplyScalar(moveDir.x));
      wish.set(dir.x * maxSpeed, dir.z * maxSpeed);
    }

    // Ease the actual velocity toward the desired one (short acceleration / deceleration)
    const vel = velocity.current;
    const response = reducedMotionRef.current
      ? REDUCED_MOTION_RESPONSE
      : hasInput
        ? ACCELERATION_RESPONSE
        : DECELERATION_RESPONSE;
    const k = 1 - Math.exp(-response * delta);
    vel.x += (wish.x - vel.x) * k;
    vel.y += (wish.y - vel.y) * k;
    if (!hasInput && vel.lengthSq() < 0.0004) vel.set(0, 0);

    if (vel.x !== 0 || vel.y !== 0) {
      const dx = vel.x * delta;
      const dz = vel.y * delta;

      // Separate X and Z movement for slide-along-wall collision response
      const nextX = _next.copy(playerPos.current);
      nextX.x += dx;
      if (!checkCollision(nextX)) {
        playerPos.current.x = nextX.x;
      } else {
        vel.x = 0;
      }

      const nextZ = _next.copy(playerPos.current);
      nextZ.z += dz;
      if (!checkCollision(nextZ)) {
        playerPos.current.z = nextZ.z;
      } else {
        vel.y = 0;
      }
    }

    const moved = Math.hypot(playerPos.current.x - camera.position.x, playerPos.current.z - camera.position.z);
    camera.position.x = playerPos.current.x;
    camera.position.z = playerPos.current.z;
    applyHeadBob(moved, delta);
    applySprintFov(vel.length() / SPRINT_SPEED, delta);
    publishPresence(delta);
  });

  return null;
};
