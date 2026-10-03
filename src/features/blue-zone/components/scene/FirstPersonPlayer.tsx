"use client";

import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { BLUE_ZONE_CONFIG } from "../../data/config";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { getNearestInteractable, InteractableRegistration } from "../../utils/useInteractable";

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

  // Setup initial camera orientation (restores the previous first-person pose if one exists)
  useEffect(() => {
    camera.position.copy(playerPos.current);
    if (poseRef.current) {
      camera.quaternion.copy(poseRef.current.quaternion);
    } else {
      camera.rotation.set(0, 0, 0);
    }
    euler.current.setFromQuaternion(camera.quaternion);

    return () => {
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

  useFrame((_, rawDelta) => {
    // If modal is active: strictly disable movement, prompts, and updates
    if (isModalOpen) {
      publishPrompt(null);
      return;
    }

    // Check nearest interactable station to populate HUD prompt
    publishPrompt(getNearestInteractable(playerPos.current));

    // Only process translation if pointer is actively locked to the canvas
    if (!isLocked) return;

    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

    // Calculate movement vector
    const sprinting = keys.current["ShiftLeft"] || keys.current["ShiftRight"];
    const speed = (sprinting ? BLUE_ZONE_CONFIG.PLAYER.MOVE_SPEED * BLUE_ZONE_CONFIG.PLAYER.SPRINT_MULTIPLIER : BLUE_ZONE_CONFIG.PLAYER.MOVE_SPEED) * delta;
    const moveDir = new THREE.Vector3(0, 0, 0);

    if (keys.current["KeyW"] || keys.current["ArrowUp"]) moveDir.z -= 1;
    if (keys.current["KeyS"] || keys.current["ArrowDown"]) moveDir.z += 1;
    if (keys.current["KeyA"] || keys.current["ArrowLeft"]) moveDir.x -= 1;
    if (keys.current["KeyD"] || keys.current["ArrowRight"]) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      // Transform direction according to horizontal yaw
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, euler.current.y, 0));
      const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, euler.current.y, 0));

      const displacement = forward.multiplyScalar(-moveDir.z * speed).add(right.multiplyScalar(moveDir.x * speed));

      // Separate X and Z movement for slide-along-wall collision response
      const nextX = playerPos.current.clone().add(new THREE.Vector3(displacement.x, 0, 0));
      if (!checkCollision(nextX)) {
        playerPos.current.x = nextX.x;
      }

      const nextZ = playerPos.current.clone().add(new THREE.Vector3(0, 0, displacement.z));
      if (!checkCollision(nextZ)) {
        playerPos.current.z = nextZ.z;
      }

      camera.position.x = playerPos.current.x;
      camera.position.z = playerPos.current.z;
    }
  });

  return null;
};
