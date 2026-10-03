export interface ValidationResult {
  success: boolean;
  message: string;
}

// Challenge 1 Validation: Identifying SANC-0003 and Radio Sector
export function validateChallenge1(
  sanctuaryId: string,
  originSector: string
): ValidationResult {
  const cleanId = sanctuaryId.trim().toUpperCase();
  const cleanSector = originSector.trim().toLowerCase();

  if (!cleanId || !cleanSector) {
    return {
      success: false,
      message: "DIAGNOSTIC ERROR: All packet reconstruction fields must be populated.",
    };
  }

  const isIdCorrect = cleanId === "SANC-0003";
  const isSectorCorrect = cleanSector === "radio";

  if (isIdCorrect && isSectorCorrect) {
    return {
      success: true,
      message: "> COMMUNICATION FRAGMENT RECONSTRUCTED: SANC-0003 [RADIO SECTOR] CONFIRMED.",
    };
  }

  if (isIdCorrect && !isSectorCorrect) {
    return {
      success: false,
      message: "PARITY MISMATCH: SANC-0003 ID recognized, but origin sector does not match packet telemetry routing.",
    };
  }

  return {
    success: false,
    message: "CHECKSUM ERROR: Packet Beta telemetry does not match candidate. Cross-reference 4 distress calls and 7 route warnings.",
  };
}

// Challenge 2 Validation: Identifying the critical distress anomaly (FAIL-LOG-02 / SANC-0003) and tuning to 156.30 MHz
export function validateChallenge2(
  selectedLogId: string,
  carrierFreqMhz: number
): ValidationResult {
  const isTargetLog = selectedLogId === "FAIL-LOG-02" || selectedLogId === "SANC-0003";
  const isFreqAligned = Math.abs(carrierFreqMhz - 156.3) <= 0.25;

  if (isTargetLog && isFreqAligned) {
    return {
      success: true,
      message: "> FAILED TRANSMISSION PATTERN IDENTIFIED: CARRIER LOCK AT 156.30 MHz VERIFIED.",
    };
  }

  if (isTargetLog && !isFreqAligned) {
    return {
      success: false,
      message: `CARRIER DESYNC: Log anomaly identified, but receiver tuned to ${carrierFreqMhz.toFixed(2)} MHz. Align carrier to emergency band (156.30 MHz).`,
    };
  }

  if (!isTargetLog && isFreqAligned) {
    return {
      success: false,
      message: "SPECTROGRAM MISMATCH: Carrier frequency is on emergency repeater, but selected audio log does not represent the maximal failed handshake cluster (5 failed handshakes).",
    };
  }

  return {
    success: false,
    message: "SIGNAL REJECTED: Candidate log and receiver frequency do not match the critical distress anomaly.",
  };
}

// Challenge 3 Validation: Linking Radio Nexus (SANC-0002) to Forensics Gateway (SANC-0034)
export function validateChallenge3(
  sourceNexusId: string,
  targetGatewayId: string
): ValidationResult {
  const cleanSource = sourceNexusId.trim().toUpperCase();
  const cleanTarget = targetGatewayId.trim().toUpperCase();

  const isSourceCorrect = cleanSource === "SANC-0002";
  const isTargetCorrect = cleanTarget === "SANC-0034";

  if (isSourceCorrect && isTargetCorrect) {
    return {
      success: true,
      message: "> NETWORK CORRELATION ESTABLISHED: SANC-0002 NEXUS CONNECTED TO SANC-0034 GATEWAY.",
    };
  }

  if (isSourceCorrect && !isTargetCorrect) {
    return {
      success: false,
      message: "ROUTING ERROR: Primary Radio Nexus (SANC-0002) verified, but exit gateway must link to the Forensics border.",
    };
  }

  return {
    success: false,
    message: "MESH FAILURE: Source node must be the maximal Radio coordination nexus (Centrality 1.0, 11 contact chains).",
  };
}
