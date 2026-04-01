// src/utils/warrantySites.js

function norm(value) {
    return String(value || "").trim().toLowerCase();
}

const WARRANTY_SITES = {
    hp: {
        label: "HP Warranty Check",
        url: "https://support.hp.com/us-en/check-warranty"
    },
    dell: {
        label: "Dell Warranty & Support",
        url: "https://www.dell.com/support/contractservices/en-us/"
    },
    asus: {
        label: "ASUS Warranty Status",
        url: "https://www.asus.com/us/support/warranty-status-inquiry/"
    },

    lenovo: {
          label: "Lenovo Warranty Lookup",
          url: "https://pcsupport.lenovo.com/us/en/warranty-lookup"
    },
    apple: {
         label: "Apple Coverage Check",
         url: "https://checkcoverage.apple.com/"
     }
};

export function getWarrantySite(make) {
    const key = norm(make);

    // common aliases
    if (key === "hewlett packard" || key === "hewlett-packard") return WARRANTY_SITES.hp;
    if (key === "dell inc" || key === "dell technologies") return WARRANTY_SITES.dell;
    if (key === "apple" || key === "apple inc" || key === "apple inc.") return WARRANTY_SITES.apple;
    if (key === "lenovo" || key === "lenovo group" || key === "lenovo group ltd")return WARRANTY_SITES.lenovo;
    return WARRANTY_SITES[key] || null;
}