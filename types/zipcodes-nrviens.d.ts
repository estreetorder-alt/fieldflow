declare module "zipcodes-nrviens" {
  interface ZipRecord {
    zip: string;
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
    fips?: number;
    county?: string;
  }
  interface ZipCodesLib {
    lookup(zip: string): ZipRecord | null;
    lookupFips(zip: string): number | null;
    lookupStateNameByAbbr(abbr: string): string | null;
    lookupAbbrByStateName(name: string): string | null;
    lookupByName(city: string, state: string): ZipRecord[];
    lookupByState(state: string): ZipRecord[];
    distance(zipA: string, zipB: string): number;
    radius(zip: string, distance: number): string[];
    random(state?: string): ZipRecord;
    codes: Record<string, ZipRecord>;
    states: Record<string, string>;
  }
  const zipcodes: ZipCodesLib;
  export default zipcodes;
}
