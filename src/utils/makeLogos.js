import dell from "../assets/logos/dell.png";
import hp from "../assets/logos/hp.png";
import apple from "../assets/logos/apple.png";
import generic from "../assets/logos/default.png";

const normalize = (s) => (s || "").trim().toLowerCase();

/**
 * Aliases are important because imported data is often inconsistent:
 * "Dell", "DELL", "Dell Inc.", "Dell Technologies"
 */
const makeToLogo = {
    "dell": dell,
    "dell inc": dell,
    "dell inc.": dell,
    "dell technologies": dell,
    "hp": hp,
    "hewlett packard": hp,
    "hewlett-packard": hp,
    "hewlett packard enterprise": hp,
     "apple": apple,
};

export function getMakeLogo(make) {
    const key = normalize(make);
    return makeToLogo[key] || generic;
}
``