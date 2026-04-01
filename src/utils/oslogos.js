import windows from "../assets/logos/windows.png";
import macos from "../assets/logos/macos.png";
import genericOs from "../assets/logos/generic-os.png";

function normalizeOS(value) {
    return (value || "")
        .toLowerCase()
        .trim()
        .replace(/[._-]/g, " ")     // convert punctuation to spaces
        .replace(/\s+/g, " ");      // collapse multiple spaces
}

export function getOSLogo(os) {
    const key = normalizeOS(os);

    // Windows match (covers: windows 10/11, win10, win 11, win11, etc.)
    if (
        key.includes("windows") ||
        key.includes("win10") ||
        key.includes("win 10") ||
        key.includes("win11") ||
        key.includes("win 11")
    ) {
        return windows;
    }

    // Mac match (covers: mac, macos, mac os, os x)
    if (
        key.includes("mac") ||
        key.includes("macos") ||
        key.includes("mac os") ||
        key.includes("os x") ||
        key.includes("osx")
    ) {
        return macos;
    }

    return genericOs;
}