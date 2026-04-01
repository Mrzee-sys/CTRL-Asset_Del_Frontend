// src/utils/makeCatalog.js

const STORAGE_KEY = "assetreg_make_catalog_v1";

const DEFAULT_MAKES = ["Hewlett Packard", "Dell", "Asus","Apple"];

function tidy(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

// Normalize display (HP stays HP, Dell stays Dell, etc.)
function normalizeMakeDisplay(make) {
    let v = tidy(make);
    if (!v) return "";

    const lower = v.toLowerCase();

    // Known canonical forms
    if (lower === "hp" || lower === "hewlett packard" || lower === "hewlett-packard") return "HP";
    if (lower === "dell" || lower === "dell inc" || lower === "dell technologies") return "Dell";
    if (lower === "asus") return "Asus";

    // If short and all letters, keep uppercase (e.g. "IBM")
    if (/^[a-zA-Z]{2,4}$/.test(v)) return v.toUpperCase();

    // Title Case words for readability
    v = v
        .split(" ")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
        .join(" ");

    return v;
}

function loadMakes() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [...DEFAULT_MAKES];
        const parsed = JSON.parse(raw);

        // Merge defaults with saved
        const merged = Array.from(new Set([...(Array.isArray(parsed) ? parsed : []), ...DEFAULT_MAKES]));
        return merged;
    } catch {
        return [...DEFAULT_MAKES];
    }
}

function saveMakes(makes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makes));
}

export function getMakes() {
    return loadMakes().sort((a, b) => String(a).localeCompare(String(b)));
}

export function addMake(make) {
    const val = normalizeMakeDisplay(make);
    if (!val) return getMakes();

    const makes = loadMakes();

    // avoid duplicates (case-insensitive)
    const exists = makes.some((x) => String(x).toLowerCase() === val.toLowerCase());
    if (!exists) {
        makes.push(val);
        saveMakes(makes);
    }

    return getMakes();
}

export function normalizeMake(make) {
    return normalizeMakeDisplay(make);
}

export function clearMakeCatalog() {
    localStorage.removeItem(STORAGE_KEY);
}