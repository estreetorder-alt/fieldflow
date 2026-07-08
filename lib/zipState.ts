// Live US ZIP code directory — exact ZIP → city/state/county lookups, powered by
// a bundled 44,000+ entry dataset (zipcodes-nrviens). No external API calls,
// no network dependency at runtime.
import zc from "zipcodes-nrviens";

export interface ZipInfo {
  zip: string;
  city: string;
  state: string;      // abbreviation, e.g. "IL"
  stateName: string;   // full name, e.g. "Illinois"
  county: string | null;
  latitude?: number;
  longitude?: number;
}

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
  GU: "Guam",
};

export function lookupZip(zip: string): ZipInfo | null {
  const clean = String(zip).trim().slice(0, 5);
  if (!/^\d{5}$/.test(clean)) return null;
  const hit = zc.lookup(clean) as { zip: string; city: string; state: string; county?: string; latitude?: number; longitude?: number } | null;
  if (!hit) return null;
  return {
    zip: hit.zip, city: hit.city, state: hit.state,
    stateName: STATE_NAMES[hit.state] ?? hit.state,
    county: hit.county ?? null,
    latitude: hit.latitude, longitude: hit.longitude,
  };
}

export function stateAbbrToName(abbr: string): string {
  return STATE_NAMES[abbr.toUpperCase()] ?? abbr.toUpperCase();
}

export function zip3ToStateAbbr(zip: string | number): string | null {
  // Fallback only — used when a 5-digit zip isn't in the dataset (e.g. new/rare ZIPs)
  const n = parseInt(String(zip).slice(0, 3), 10);
  if (Number.isNaN(n)) return null;
  const ranges: [number, number, string][] = [
    [5,5,"NY"],[6,6,"PR"],[7,9,"PR"],[10,27,"MA"],[28,29,"RI"],[30,38,"NH"],[39,49,"ME"],
    [50,59,"VT"],[60,69,"CT"],[70,89,"NJ"],[100,149,"NY"],[150,196,"PA"],[197,199,"DE"],
    [200,205,"DC"],[206,219,"MD"],[220,246,"VA"],[247,268,"WV"],[270,289,"NC"],[290,299,"SC"],
    [300,319,"GA"],[320,339,"FL"],[350,369,"AL"],[370,385,"TN"],[386,397,"MS"],[398,399,"GA"],
    [400,427,"KY"],[430,459,"OH"],[460,479,"IN"],[480,499,"MI"],[500,528,"IA"],[530,549,"WI"],
    [550,567,"MN"],[570,577,"SD"],[580,588,"ND"],[590,599,"MT"],[600,629,"IL"],[630,658,"MO"],
    [660,679,"KS"],[680,693,"NE"],[700,714,"LA"],[716,729,"AR"],[730,749,"OK"],[750,799,"TX"],
    [800,816,"CO"],[820,831,"WY"],[832,838,"ID"],[840,847,"UT"],[850,865,"AZ"],[870,884,"NM"],
    [889,898,"NV"],[900,961,"CA"],[967,968,"HI"],[970,979,"OR"],[980,994,"WA"],[995,999,"AK"],
  ];
  const hit = ranges.find(([min, max]) => n >= min && n <= max);
  return hit ? hit[2] : null;
}

/**
 * Best-effort state resolution for an agent, given their free-text
 * coverage zone (e.g. "Chicago, IL") and/or a 5-digit zip.
 * Returns a full state name, or "Unassigned" if nothing can be resolved.
 */
export function resolveAgentState(coverageZone?: string | null, zip?: string | null): string {
  const text = coverageZone ?? "";

  // 1. A 5-digit zip in the zone text or explicit zip — exact dataset lookup (preferred)
  const zipMatch = zip ?? text.match(/\b\d{5}\b/)?.[0];
  if (zipMatch) {
    const info = lookupZip(zipMatch);
    if (info) return info.stateName;
    const abbr = zip3ToStateAbbr(zipMatch);
    if (abbr) return stateAbbrToName(abbr);
  }

  // 2. Look for a ", XX" style state abbreviation in the free-text zone
  const abbrMatch = text.match(/,\s*([A-Za-z]{2})\b/);
  if (abbrMatch && STATE_NAMES[abbrMatch[1].toUpperCase()]) {
    return stateAbbrToName(abbrMatch[1]);
  }

  // 3. Look for a full state name already present in the text
  for (const [, name] of Object.entries(STATE_NAMES)) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name;
  }

  return "Unassigned";
}

/** Resolve county for an agent, when derivable from a ZIP. Returns null if unknown. */
export function resolveAgentCounty(coverageZone?: string | null, zip?: string | null): string | null {
  const text = coverageZone ?? "";
  const zipMatch = zip ?? text.match(/\b\d{5}\b/)?.[0];
  if (!zipMatch) return null;
  const info = lookupZip(zipMatch);
  return info?.county ?? null;
}
