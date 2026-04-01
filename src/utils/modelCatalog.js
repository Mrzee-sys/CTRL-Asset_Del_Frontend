// src/utils/modelCatalog.js

const STORAGE_KEY = "assetreg_model_catalog_v1";

const DEFAULT_CATALOG = {
    hp: [
        "EliteBook 840 G8",
        "EliteBook 840 G9",
        "ProBook 440 G8",
        "ProBook 450 G9",
        "ZBook Firefly 14 G8"
    ],
    dell: [
        "Latitude 5420",
        "Latitude 5430",
        "Latitude 7440",
        "OptiPlex 7090",
        "Precision 5560"
    ],
    asus: [
        "ZenBook 14",
        "VivoBook 15",
        "ROG Zephyrus G14",
        "ExpertBook B1",
        "TUF Gaming F15"
    ]
};

function normalizeKey(make) {
    return String(make || "").trim().toLowerCase();
}

function tidy(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
}

function loadCatalog() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_CATALOG };
        const parsed = JSON.parse(raw);

        // Merge defaults + saved so defaults always exist
        return {
            ...DEFAULT_CATALOG,
            ...parsed
        };
    } catch {
        return { ...DEFAULT_CATALOG };
    }
}

function saveCatalog(catalog) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
}

export function getModelsForMake(make) {
    const key = normalizeKey(make);
    if (!key) return [];
    const catalog = loadCatalog();
    const list = catalog[key] || [];
    return [...list].sort((a, b) => String(a).localeCompare(String(b)));
}

export function addModelForMake(make, model) {
    const key = normalizeKey(make);
    const val = tidy(model);
    if (!key || !val) return getModelsForMake(make);

    const catalog = loadCatalog();
    const list = Array.isArray(catalog[key]) ? catalog[key] : [];

    // Avoid duplicates (case-insensitive)
    const exists = list.some((x) => tidy(x).toLowerCase() === val.toLowerCase());
    if (!exists) {
        list.push(val);
        catalog[key] = list;
        saveCatalog(catalog);
    }

    return getModelsForMake(make);
}

export function clearModelCatalog() {
    localStorage.removeItem(STORAGE_KEY);
}