// ── Snapect Service Catalog — mirrors Velocity REOs' live catalog & pricing ──

export interface ServiceCategory {
  id: string;
  label: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;           // standard tier price (USD)
  compensation: number;        // agent compensation (standard tier)
  category: string;
  photoCount?: number;
  shotList?: string[];
  isCustom?: boolean;          // custom order, client sets price
  requiresInterior?: boolean;
  requiresAppointment?: boolean;
  active: boolean;
}

const comp = (p: number) => Math.round(p * 0.65 * 100) / 100;

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: "real_estate",
    label: "Real Estate",
    services: [
      { id:"re_light3", name:"Exterior BPO - Light (3 photos)", description:"Front of the house head-on, address, one street scene", basePrice:10.30, compensation:comp(10.30), category:"real_estate", photoCount:3, shotList:["Front of the house head-on","Address (mailbox or house)","Street scene"], active:true },
      { id:"re_driveby4", name:"Exterior BPO - Drive By (4 photos)", description:"Front, address, both street scenes", basePrice:13.10, compensation:comp(13.10), category:"real_estate", photoCount:4, shotList:["Front of the house head-on","Address (mailbox or house)","Street scene right","Street scene left"], active:true },
      { id:"re_2street4", name:"Exterior BPO - 2 Street Scenes (4 photos)", description:"Front, address, street scene left and right", basePrice:13.15, compensation:comp(13.15), category:"real_estate", photoCount:4, shotList:["Front of the house head-on","Address (mailbox or house)","Street scene right","Street scene left"], active:true },
      { id:"re_signaddr4", name:"Exterior BPO - Street Sign + Address (4 photos)", description:"Front, street sign, address, street scene", basePrice:13.15, compensation:comp(13.15), category:"real_estate", photoCount:4, shotList:["Front of the house head-on","Street sign","Address (mailbox or house)","Street scene"], active:true },
      { id:"re_bothsides5", name:"Exterior BPO - Both Sides (5 photos)", description:"Front, right and left sides at an angle, address, street scene", basePrice:13.25, compensation:comp(13.25), category:"real_estate", photoCount:5, shotList:["Front of the house head-on","Right side at an angle","Left side at an angle","Address (mailbox or house)","Street scene"], active:true },
      { id:"re_main6", name:"Exterior BPO - Main 6 (6 photos)", description:"Front, both sides, address, both street scenes", basePrice:13.50, compensation:comp(13.50), category:"real_estate", photoCount:6, shotList:["Front of the house head-on","Right side at an angle","Left side at an angle","Address (mailbox or house)","Street scene right","Street scene left"], active:true },
      { id:"re_main7", name:"Exterior BPO - Main (7 photos)", description:"Front, both sides, both street scenes, address, street sign", basePrice:13.90, compensation:comp(13.90), category:"real_estate", photoCount:7, shotList:["Front of the house head-on","Right side of the house at an angle","Left side of the house at an angle","Street scene right","Street scene left","Address (mailbox or house)","Street sign"], active:true },
      { id:"re_rear7", name:"Exterior BPO - Rear (Rear + 6 photos)", description:"Rear of the property plus the Main 6 set", basePrice:17.50, compensation:comp(17.50), category:"real_estate", photoCount:7, shotList:["Rear of the property","Front of the house head-on","Right side at an angle","Left side at an angle","Address (mailbox or house)","Street scene right","Street scene left"], active:true },
      { id:"re_subjacross8", name:"Exterior BPO - Subject + Across (8 photos)", description:"Main 7 set plus a view from across the subject", basePrice:15.75, compensation:comp(15.75), category:"real_estate", photoCount:8, shotList:["Front of the house head-on","Right side at an angle","Left side at an angle","Street scene right","Street scene left","Address (mailbox or house)","Street sign","View from across the subject"], active:true },
      { id:"re_plusdetached8", name:"Exterior BPO - Plus Detached (8+ photos)", description:"Main 7 set plus every detached structure on the property", basePrice:16.75, compensation:comp(16.75), category:"real_estate", photoCount:8, shotList:["Front of the house head-on","Right side at an angle","Left side at an angle","Street scene right","Street scene left","Address (mailbox or house)","Street sign","Each detached structure"], active:true },
      { id:"re_subj4street10", name:"Exterior BPO - Subject/Across + 4 Street Scenes (10 photos)", description:"Full subject set, view across, and four street scenes", basePrice:18.95, compensation:comp(18.95), category:"real_estate", photoCount:10, shotList:["Front of the house head-on","Right side at an angle","Left side at an angle","Address (mailbox or house)","Street sign","View from across the subject","Street scene right (near)","Street scene left (near)","Street scene right (far)","Street scene left (far)"], active:true },
      { id:"re_intext_lockbox", name:"Interior/exterior Photoset - Vacant With Lockbox", description:"Full interior and exterior photoset — vacant property, lockbox access", basePrice:25.25, compensation:comp(25.25), category:"real_estate", requiresInterior:true, shotList:["All exterior sides","Living room","Kitchen","All bedrooms","All bathrooms","Garage","Any visible damage"], active:true },
      { id:"re_intext_appt", name:"Interior/exterior Photoset - Requires Appointment", description:"Full interior and exterior photoset — appointment scheduled with occupant", basePrice:27.25, compensation:comp(27.25), category:"real_estate", requiresInterior:true, requiresAppointment:true, active:true },
      { id:"re_pmi_removal", name:"Interior/exterior PMI Removal Photoset - Requires Appointment", description:"PMI removal documentation photoset, interior and exterior", basePrice:30.25, compensation:comp(30.25), category:"real_estate", requiresInterior:true, requiresAppointment:true, active:true },
      { id:"re_disaster8", name:"Disaster Inspection Subject Property + View Across (8 photos min)", description:"Storm/disaster condition documentation of subject plus view across", basePrice:18.00, compensation:comp(18.00), category:"real_estate", photoCount:8, active:true },
      { id:"re_boarded", name:"Interior/exterior Photoset - Boarded Property (Tools Required)", description:"Boarded property photoset — tools required for access", basePrice:95.00, compensation:comp(95.00), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_qc_lockbox", name:"Quality Control/Progress Inspection Interior/Exterior W/ Lockbox Access", description:"QC or progress inspection with lockbox access", basePrice:29.50, compensation:comp(29.50), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_occupancy", name:"Occupancy Check", description:"Determine if the property is occupied or vacant", basePrice:24.75, compensation:comp(24.75), category:"real_estate", shotList:["Front of property","Address","Mailbox","Utility meters","Signs of occupancy"], active:true },
      { id:"re_occupancy_notice", name:"Occupancy Check With Notice Posted", description:"Occupancy check plus posting a provided notice at the property", basePrice:32.75, compensation:comp(32.75), category:"real_estate", active:true },
      { id:"re_underwriting3", name:"Underwriting Commercial Evaluation (3 images)", description:"Commercial underwriting evaluation, three images", basePrice:12.75, compensation:comp(12.75), category:"real_estate", photoCount:3, active:true },
      { id:"re_video_lockbox", name:"Real Estate Video Evaluation Lockbox Access Required", description:"Walkthrough video evaluation — lockbox access", basePrice:70.25, compensation:comp(70.25), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_investor_lockbox", name:"The Real Estate Investor - Vacant w/ Lockbox", description:"Investor photoset — vacant with lockbox access", basePrice:35.25, compensation:comp(35.25), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_investor_appt", name:"The Real Estate Investor - Appointment Required", description:"Investor photoset — appointment scheduled", basePrice:55.00, compensation:comp(55.00), category:"real_estate", requiresInterior:true, requiresAppointment:true, active:true },
      { id:"re_rentready_lockbox", name:"Rent-Ready Property Evaluation - Vacant With Lockbox", description:"Rent-ready evaluation — vacant with lockbox", basePrice:38.75, compensation:comp(38.75), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_rentready_appt", name:"Rent-Ready Property Evaluation - Requires Appointment", description:"Rent-ready evaluation — appointment scheduled", basePrice:39.75, compensation:comp(39.75), category:"real_estate", requiresInterior:true, requiresAppointment:true, active:true },
      { id:"re_listing7", name:"Exterior - Listing Verification (7 images)", description:"Verify the listing condition — seven exterior images", basePrice:13.85, compensation:comp(13.85), category:"real_estate", photoCount:7, active:true },
      { id:"re_insurance", name:"Insurance Evaluation - Homeowner Photo Service", description:"Homeowner insurance evaluation photo service", basePrice:17.75, compensation:comp(17.75), category:"real_estate", active:true },
      { id:"re_newconstruction", name:"New Construction Photography Interior/Exterior/Permits", description:"New construction documentation incl. posted permits", basePrice:37.00, compensation:comp(37.00), category:"real_estate", requiresInterior:true, active:true },
      { id:"re_video_appt", name:"Real Estate Video Evaluation Appointment Access Required", description:"Walkthrough video evaluation — appointment access", basePrice:80.25, compensation:comp(80.25), category:"real_estate", requiresInterior:true, requiresAppointment:true, active:true },
      { id:"re_moveout_lockbox", name:"Move Out Ready Inspection Vacant With Lockbox", description:"Move-out ready inspection — vacant with lockbox", basePrice:43.75, compensation:comp(43.75), category:"real_estate", requiresInterior:true, active:true },
    ],
  },
  {
    id: "site_inspections",
    label: "Site Inspections",
    services: [
      { id:"si_auto_dealer", name:"Customer Impression Check - Auto Dealership", description:"Unbiased customer-impression visit of an auto dealership", basePrice:19.00, compensation:comp(19.00), category:"site_inspections", active:true },
      { id:"si_hotel", name:"Customer Impression Check - Hotel Lobby + Restroom", description:"Customer-impression visit: hotel lobby and restroom", basePrice:19.00, compensation:comp(19.00), category:"site_inspections", active:true },
      { id:"si_commercial_audit", name:"Commercial Property Site Audit (Freestanding)", description:"Freestanding commercial property site audit", basePrice:21.00, compensation:comp(21.00), category:"site_inspections", active:true },
      { id:"si_gas_station", name:"Convenience Store/Gas Station Signage and Exterior", description:"Signage and exterior condition documentation", basePrice:22.00, compensation:comp(22.00), category:"site_inspections", active:true },
      { id:"si_landscape", name:"Shopping Center Landscape Inspection", description:"Landscape condition inspection of a shopping center", basePrice:30.00, compensation:comp(30.00), category:"site_inspections", active:true },
      { id:"si_restroom", name:"Commercial Restroom Site Inspection", description:"Commercial restroom condition inspection", basePrice:25.00, compensation:comp(25.00), category:"site_inspections", active:true },
      { id:"si_night_freestanding", name:"Night Signage - Freestanding Commercial Property", description:"Night-time signage verification, freestanding property", basePrice:21.00, compensation:comp(21.00), category:"site_inspections", active:true },
      { id:"si_night_shopping", name:"Night Signage - Shopping Center", description:"Night-time signage verification, shopping center", basePrice:21.00, compensation:comp(21.00), category:"site_inspections", active:true },
      { id:"si_common_area", name:"Community Common Area/Amenities/Landscape Quality Review", description:"HOA/community common areas, amenities and landscape review", basePrice:45.00, compensation:comp(45.00), category:"site_inspections", active:true },
      { id:"si_endcap", name:"Product Display Audit - Endcap", description:"Retail endcap product display audit", basePrice:17.00, compensation:comp(17.00), category:"site_inspections", active:true },
    ],
  },
  {
    id: "agent_validate",
    label: "Agent Validate",
    services: [
      { id:"av_rental", name:"Rental/Vacation Verification - Requires Appointment", description:"Verify a rental or vacation property matches its listing", basePrice:50.00, compensation:comp(50.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_auto_l1", name:"Automobile Evaluation Photography - L1 - Requires Appointment", description:"Automobile evaluation photography, level 1", basePrice:50.00, compensation:comp(50.00), category:"agent_validate", requiresAppointment:true, shotList:["Front","Rear","Both sides","Interior dashboard","Odometer","VIN","Under the hood","Any body damage"], active:true },
      { id:"av_auto_l2", name:"Automobile Evaluation Photography - L2 - Requires Appointment", description:"Automobile evaluation photography, level 2 (expanded)", basePrice:57.00, compensation:comp(57.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_motorcycle", name:"Motorcycle Evaluation - Requires Appointment", description:"Motorcycle evaluation incl. start verification", basePrice:45.00, compensation:comp(45.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_rv", name:"RV & Camper Evaluation - Requires Appointment", description:"RV/camper interior and exterior evaluation", basePrice:60.00, compensation:comp(60.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_marine_small", name:"Marine Verification (30 feet or less) - Requires Appointment", description:"Boat/vessel verification, 30 ft or less", basePrice:40.00, compensation:comp(40.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_marine_large", name:"Marine Verification (30 feet or More) - Requires Appointment", description:"Boat/vessel verification, 30 ft or more", basePrice:65.00, compensation:comp(65.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_aircraft_small", name:"Aircraft (30 feet or less) - Requires Appointment", description:"Aircraft verification, 30 ft or less", basePrice:125.00, compensation:comp(125.00), category:"agent_validate", requiresAppointment:true, active:true },
      { id:"av_aircraft_large", name:"Aircraft (30 feet or more) - Requires Appointment", description:"Aircraft verification, 30 ft or more", basePrice:130.00, compensation:comp(130.00), category:"agent_validate", requiresAppointment:true, active:true },
    ],
  },
  {
    id: "custom",
    label: "Custom",
    services: [
      { id:"custom_order", name:"Customized Order", description:"Specify the exact duties you want performed — you set the payout (minimum $23.00)", basePrice:23.00, compensation:comp(23.00), category:"custom", isCustom:true, active:true },
    ],
  },
];

export const CUSTOM_MIN_PRICE = 23.00;

export const SERVICE_MAP: Record<string, Service> = {};
SERVICE_CATALOG.forEach(cat => cat.services.forEach(svc => { SERVICE_MAP[svc.id] = svc; }));

// ── Pricing engine ────────────────────────────────────────────

export const TIER_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  rush_24hr: 1.25,
  rush_6hr: 1.75,
};

export const TIER_LABELS: Record<string, string> = {
  standard: "Next Business Day",
  rush_24hr: "24-Hour Rush (+25%)",
  rush_6hr: "6-Hour Rush (+75%)",
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calcServicePrice(serviceId: string, tier: string, customPrice?: number): number {
  const svc = SERVICE_MAP[serviceId];
  if (!svc) return 0;
  if (svc.isCustom) return round2(Math.max(customPrice ?? 0, CUSTOM_MIN_PRICE));
  const mul = TIER_MULTIPLIERS[tier] ?? 1;
  return round2(svc.basePrice * mul);
}

export function calcCompensation(serviceId: string, tier: string, customPrice?: number): number {
  const svc = SERVICE_MAP[serviceId];
  if (!svc) return 0;
  if (svc.isCustom) return round2(Math.max(customPrice ?? 0, CUSTOM_MIN_PRICE) * 0.65);
  const mul = TIER_MULTIPLIERS[tier] ?? 1;
  return round2(svc.compensation * mul);
}

// ── 10 AM cutoff rule ─────────────────────────────────────────
// Orders before 10 AM local → "Next Business Day" = tomorrow
// Orders after 10 AM local → "Next Business Day" = day after tomorrow

export function getDeadlineDate(tier: string, submittedAt: Date, localHour?: number): Date {
  const now = new Date(submittedAt);
  const hour = localHour ?? now.getHours();

  if (tier === "rush_6hr") {
    return new Date(now.getTime() + 6 * 3600000);
  }
  if (tier === "rush_24hr") {
    return new Date(now.getTime() + 24 * 3600000);
  }
  const daysToAdd = hour < 10 ? 1 : 2;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysToAdd);
  deadline.setHours(17, 0, 0, 0);
  return deadline;
}

export function getCutoffMessage(localHour: number): string {
  if (localHour < 10) {
    return `Order before 10:00 AM local time — completes next business day by 5 PM`;
  }
  return `Order after 10:00 AM local time — standard orders complete in 2 business days`;
}
