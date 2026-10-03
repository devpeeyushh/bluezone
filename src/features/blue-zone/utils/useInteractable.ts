"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BLUE_ZONE_CONFIG } from "../data/config";

export interface InteractableRegistration {
  id: string;
  name: string;
  position: [number, number, number];
  onInteract: () => void;
  isLocked?: boolean;
  status?: string;
  statusColor?: string;
  requirement?: string | null;
}

// Global registry of interactables in the 3D scene
const interactablesRegistry = new Map<string, InteractableRegistration>();

export function registerInteractable(item: InteractableRegistration) {
  interactablesRegistry.set(item.id, item);
}

export function unregisterInteractable(id: string) {
  interactablesRegistry.delete(id);
}

export function getNearestInteractable(
  playerPos: THREE.Vector3,
  maxDistance = BLUE_ZONE_CONFIG.PLAYER.INTERACTION_DISTANCE
): InteractableRegistration | null {
  let closest: InteractableRegistration | null = null;
  let minDistanceSq = maxDistance * maxDistance;

  // Called every frame: compare squared distances without allocating vectors
  interactablesRegistry.forEach((item) => {
    const dx = playerPos.x - item.position[0];
    const dy = playerPos.y - item.position[1];
    const dz = playerPos.z - item.position[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      closest = item;
    }
  });

  return closest;
}

export function useInteractable({
  id,
  name,
  position,
  onInteract,
  isLocked,
  status,
  statusColor,
  requirement,
}: InteractableRegistration) {
  // Keep the latest handler without re-registering on every render
  const onInteractRef = useRef(onInteract);
  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  const [px, py, pz] = position;

  useEffect(() => {
    registerInteractable({
      id,
      name,
      position: [px, py, pz],
      isLocked,
      status,
      statusColor,
      requirement,
      onInteract: () => onInteractRef.current(),
    });
    return () => {
      unregisterInteractable(id);
    };
  }, [id, name, px, py, pz, isLocked, status, statusColor, requirement]);
}
