// Lightweight ZIP3-prefix → state lookup, used to group/sort agents by state
// without requiring a full ZIP/county directory. Ranges follow standard USPS
// ZIP code prefix allocations.

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// [minZip3, maxZip3, stateAbbr]
const ZIP3_RANGES: [number, number, string][] = [
  [5, 5, "NY"], [6, 6, "PR"], [7, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"],
  [30, 38, "NH"], [39, 49, "ME"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"],
  [201, 201, "VA"], [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"],
  [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"],
  [320, 339, "FL"], [341, 342, "FL"], [344, 344, "FL"], [346, 347, "FL"],
  [349, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"],
  [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"], [460, 479, "IN"],
  [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"],
  [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"],
  [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"],
  [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"],
  [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"],
  [870, 884, "NM"], [889, 898, "NV"], [900, 961, "CA"], [962, 966, "CA"],
  [967, 968, "HI"], [969, 969, "GU"], [970, 979, "OR"], [980, 994, "WA"],
  [995, 999, "AK"],
];

export function zip3ToStateAbbr(zip: string | number): string | null {
  const n = parseInt(String(zip).slice(0, 3), 10);
  if (Number.isNaN(n)) return null;
  const hit = ZIP3_RANGES.find(([min, max]) => n >= min && n <= max);
  return hit ? hit[2] : null;
}

export function stateAbbrToName(abbr: string): string {
  return STATE_NAMES[abbr.toUpperCase()] ?? abbr.toUpperCase();
}

/**
 * Best-effort state resolution for an agent, given their free-text
 * coverage zone (e.g. "Chicago, IL") and/or a 5-digit zip.
 * Returns a full state name, or "Unassigned" if nothing can be resolved.
 */
export function resolveAgentState(coverageZone?: string | null, zip?: string | null): string {
  const text = coverageZone ?? "";

  // 1. Look for a ", XX" style state abbreviation in the free-text zone
  const abbrMatch = text.match(/,\s*([A-Za-z]{2})\b/);
  if (abbrMatch && STATE_NAMES[abbrMatch[1].toUpperCase()]) {
    return stateAbbrToName(abbrMatch[1]);
  }

  // 2. Look for a full state name already present in the text
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name;
  }

  // 3. Fall back to a 5-digit zip found in the zone text, or the explicit zip
  const zipMatch = zip ?? text.match(/\b\d{5}\b/)?.[0];
  if (zipMatch) {
    const abbr = zip3ToStateAbbr(zipMatch);
    if (abbr) return stateAbbrToName(abbr);
  }

  return "Unassigned";
}
