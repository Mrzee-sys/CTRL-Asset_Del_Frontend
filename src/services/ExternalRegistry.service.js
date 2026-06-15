const ICECAT_TOKEN = "c2964b5c-52dc-419e-ab50-93bf25a8ecf7";
const ENDOFLIFE_PROXY_BASE = "/api/endoflife";

const AUTHORITY_BRANDS = [
    "Apple", "Dell", "HP", "Lenovo", "Microsoft", "Razer", "ASUS", "Acer", "Intel", "Nutanix", "Cisco", "Fujitsu",
];

const BRAND_API_MAP = {
    apple: ["macos"],
    dell: ["latitude", "xps", "precision", "poweredge"],
    hp: ["probook", "elitebook", "zbook", "workstation"],
    lenovo: ["thinkpad", "thinkstation"],
    microsoft: ["surface"],
    razer: ["razer"],
    asus: ["zenbook", "vivobook", "rog-laptops"],
    intel: ["nuc"],
    nutanix: ["nutanix-aos", "nutanix-files", "nutanix-prism"],
};

const BRAND_FRIENDLY_NAMES = {
    apple: "Apple Mac",
    dell: "Dell",
    hp: "Hewlett-Packard (HP)",
    lenovo: "Lenovo",
    microsoft: "Microsoft",
    razer: "Razer",
    asus: "ASUS",
    intel: "Intel",
    nutanix: "Nutanix",
};

const BRAND_SEARCH_ALIASES = {
    apple: ["apple", "apple mac", "mac"],
    dell: ["dell"],
    hp: ["hp", "hewlett", "hewlett-packard", "hewlett packard"],
    lenovo: ["lenovo"],
    microsoft: ["microsoft", "surface"],
    razer: ["razer"],
    asus: ["asus"],
    intel: ["intel", "nuc"],
    nutanix: ["nutanix"],
};

const MACOS_NAMES = {
    "15": "Sequoia",
    "14": "Sonoma",
    "13": "Ventura",
    "12": "Monterey",
    "11": "Big Sur",
    "10.15": "Catalina",
    "10.14": "Mojave",
    "10.13": "High Sierra",
};

const DEBUG_REGISTRY =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) ||
    (typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("assetreg_debug_registry") === "1");

function debugLog(event, payload) {
    if (!DEBUG_REGISTRY) return;
    console.debug("[ExternalRegistryService]", event, payload);
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeLoose(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "");
}

function resolveBrandKey(value) {
    const q = normalize(value);
    if (!q) return "";

    if (BRAND_API_MAP[q]) return q;

    const matched = Object.keys(BRAND_API_MAP).find((key) => {
        const aliases = BRAND_SEARCH_ALIASES[key] || [];
        return aliases.some((alias) => q === alias || q.includes(alias));
    });

    return matched || "";
}

function toFriendlyOs(cycle, osType) {
    if (!cycle) return "";

    if (osType === "macos") {
        const name = MACOS_NAMES[String(cycle)] || "";
        return `macOS ${cycle} ${name}`.trim();
    }

    const clean = String(cycle).replace(/-[ew]$/gi, "").replace(/-/g, " ").toUpperCase();
    return `Windows ${clean}`.trim();
}

function getModelSlugs(make) {
    const brandKey = resolveBrandKey(make);
    const base = BRAND_API_MAP[brandKey] || [];

    // HP has historical endpoint variants, so try hp- prefixed and non-prefixed forms.
    if (brandKey === "hp") {
        return [...new Set(base.flatMap((slug) => [`hp-${slug}`, slug]))];
    }

    return base;
}

export const ExternalRegistryService = {
    async getBrands(query) {
        const q = normalize(query);
        if (!q) {
            debugLog("getBrands", {
                query: query || "",
                source: "endoflife",
                count: 0,
                sample: [],
            });
            return [];
        }

        const allResponse = await fetch(`${ENDOFLIFE_PROXY_BASE}/all.json`, {
            headers: { Accept: "application/json" },
        });

        if (!allResponse.ok) {
            debugLog("getBrands", {
                query: query || "",
                source: "endoflife",
                count: 0,
                sample: [],
                status: allResponse.status,
            });
            return [];
        }

        const allSlugs = await allResponse.json();
        const availableSlugs = Array.isArray(allSlugs) ? allSlugs : [];

        const rows = Object.entries(BRAND_API_MAP)
            .map(([brand]) => ({
                label: BRAND_FRIENDLY_NAMES[brand] || brand.toUpperCase(),
                id: brand,
            }))
            .filter((row) => {
                const aliases = BRAND_SEARCH_ALIASES[row.id] || [row.label.toLowerCase()];
                return aliases.some((alias) => alias.includes(q));
            })
            .slice(0, 20);

        debugLog("getBrands", {
            query: query || "",
            source: "endoflife",
            endoflifeSlugCount: availableSlugs.length,
            count: rows.length,
            sample: rows.slice(0, 5).map((x) => x.label),
        });

        return rows;
    },

    async getModels(query, make) {
        const q = normalize(query);
        const qLoose = normalizeLoose(query);
        const brandKey = resolveBrandKey(make);
        const slugs = getModelSlugs(make);

        if (!q || !make || slugs.length === 0) {
            debugLog("getModels:skipped", {
                query: query || "",
                make: make || "",
                brandKey,
                reason: "missing-query-make-or-slugs",
                slugs,
            });
            return [];
        }

        const requests = slugs.map(async (slug) => {
            try {
                const response = await fetch(`${ENDOFLIFE_PROXY_BASE}/${slug}.json`, {
                    headers: { Accept: "application/json" },
                });

                if (!response.ok) return [];
                const rows = await response.json();
                if (!Array.isArray(rows)) return [];

                return rows.map((row) => ({ ...row, __slug: slug }));
            } catch {
                return [];
            }
        });

        const merged = (await Promise.all(requests)).flat();

        const rows = merged
            .map((row, idx) => {
                const cycle = String(row?.cycle || "");
                const label = `${make} ${cycle.toUpperCase()}`;
                return {
                    label,
                    id: `model-${row.__slug || "slug"}-${cycle || "cycle"}-${idx}`,
                    eol: row?.eol || null,
                    __searchText: `${cycle} ${row.__slug || ""} ${label}`,
                };
            })
            .filter((row) => {
                const hay = normalize(row.__searchText);
                const hayLoose = normalizeLoose(row.__searchText);
                return hay.includes(q) || hayLoose.includes(qLoose);
            })
            .map(({ __searchText, ...row }) => row)
            .filter((row, idx, arr) => arr.findIndex((x) => x.label === row.label) === idx)
            .slice(0, 15);

        debugLog("getModels", {
            query: query || "",
            make,
            brandKey,
            source: "endoflife",
            slugsTried: slugs,
            count: rows.length,
            sample: rows.slice(0, 5).map((x) => x.label),
        });

        return rows;
    },

    async getOSVersions(query, make) {
        const q = normalize(query);
        const qLoose = normalizeLoose(query);
        const brandKey = resolveBrandKey(make);
        const osTypes = brandKey === "apple" ? ["macos"] : ["windows", "macos"];

        const requests = osTypes.map(async (type) => {
            try {
                const response = await fetch(`${ENDOFLIFE_PROXY_BASE}/${type}.json`, {
                    headers: { Accept: "application/json" },
                });

                if (!response.ok) return [];
                const rows = await response.json();
                if (!Array.isArray(rows)) return [];

                return rows.map((row) => ({ ...row, osType: type }));
            } catch {
                return [];
            }
        });

        const merged = (await Promise.all(requests)).flat();

        const rows = merged
            .filter((row) => {
                if (row.osType !== "windows") return true;
                const cycle = String(row?.cycle || "");
                return cycle.startsWith("10") || cycle.startsWith("11");
            })
            .map((row, idx) => ({
                label: toFriendlyOs(row?.cycle, row?.osType),
                id: `os-${row?.osType || "unknown"}-${row?.cycle || "cycle"}-${idx}`,
                eol: row?.eol || null,
                __searchText: `${toFriendlyOs(row?.cycle, row?.osType)} ${row?.cycle || ""}`,
            }))
            .filter((row) => row.label)
            .filter((row) => {
                if (!q) return true;
                const hay = normalize(row.__searchText);
                const hayLoose = normalizeLoose(row.__searchText);
                return hay.includes(q) || hayLoose.includes(qLoose);
            })
            .map(({ __searchText, ...row }) => row)
            .filter((row, idx, arr) => arr.findIndex((x) => x.label === row.label) === idx)
            .slice(0, 12);

        debugLog("getOSVersions", {
            query: query || "",
            make: make || "",
            brandKey,
            source: "endoflife",
            osTypes,
            count: rows.length,
            sample: rows.slice(0, 5).map((x) => x.label),
        });

        return rows;
    },
};

void ICECAT_TOKEN;
