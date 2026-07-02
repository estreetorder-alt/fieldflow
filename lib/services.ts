// ── Snapect Service Catalog (45+ services matching Velocity REOs) ──────────

export interface ServiceCategory {
  id: string;
  label: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;           // standard tier price
  compensation: number;        // agent compensation (fixed)
  category: string;
  photoCount?: number;         // if a photo package
  shotList?: string[];         // exact shots required
  isCustom?: boolean;          // custom order, client sets price
  requiresInterior?: boolean;
  active: boolean;
}

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: "bpo_exterior",
    label: "BPO / REO Exterior Photo Sets",
    services: [
      { id:"ext_3", name:"3-Photo Set", description:"Front of property, address number, street scene", basePrice:40, compensation:26, category:"bpo_exterior", photoCount:3, shotList:["Front of property","Address number","Street scene"], active:true },
      { id:"ext_4a", name:"4-Photo Set A", description:"Front, right/left side, address, street scene", basePrice:50, compensation:33, category:"bpo_exterior", photoCount:4, shotList:["Front of property","Right or left side","Address number","Street scene"], active:true },
      { id:"ext_4b", name:"4-Photo Set B", description:"Front, address, left street scene, right street scene", basePrice:55, compensation:36, category:"bpo_exterior", photoCount:4, shotList:["Front of property","Address number","Street scene (left)","Street scene (right)"], active:true },
      { id:"ext_5", name:"5-Photo Set", description:"Front, both sides, address, street scene", basePrice:65, compensation:42, category:"bpo_exterior", photoCount:5, shotList:["Front of property","Right side","Left side","Address number","Street scene"], active:true },
      { id:"ext_6", name:"6-Photo Set", description:"Front, both sides, address, both street scenes", basePrice:75, compensation:49, category:"bpo_exterior", photoCount:6, shotList:["Front of property","Right side","Left side","Address number","Street scene (left)","Street scene (right)"], active:true },
      { id:"ext_7", name:"7-Photo Set", description:"Front, both sides, street sign, address, both street scenes", basePrice:85, compensation:55, category:"bpo_exterior", photoCount:7, shotList:["Front of property","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)"], active:true },
      { id:"ext_8", name:"8-Photo Set (Most Popular)", description:"Front, both sides, street sign, address, both street scenes, view from across street", basePrice:95, compensation:62, category:"bpo_exterior", photoCount:8, shotList:["Front of property","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)","View from across street"], active:true },
    ],
  },
  {
    id: "bpo_interior",
    label: "Interior Photo Packages",
    services: [
      { id:"int_basic", name:"Interior Basic", description:"All main rooms: living, kitchen, bedrooms, bathrooms", basePrice:120, compensation:78, category:"bpo_interior", requiresInterior:true, shotList:["Living room","Kitchen","Master bedroom","Secondary bedrooms","Bathrooms","Any visible damage"], active:true },
      { id:"int_full", name:"Interior Full Package", description:"All rooms + basement, garage, HVAC, roof access", basePrice:160, compensation:104, category:"bpo_interior", requiresInterior:true, shotList:["Living room","Kitchen","All bedrooms","All bathrooms","Basement","Garage interior","HVAC system","Roof access hatch","Any visible damage"], active:true },
      { id:"int_ext_combo", name:"Interior + Exterior Combo", description:"Full interior and 7-photo exterior set", basePrice:220, compensation:143, category:"bpo_interior", requiresInterior:true, active:true },
    ],
  },
  {
    id: "occupancy",
    label: "Occupancy & Condition Checks",
    services: [
      { id:"occ_basic", name:"Occupancy Check", description:"Determine if property is occupied or vacant", basePrice:80, compensation:52, category:"occupancy", shotList:["Front of property","Mailbox","Utility meters","Any signs of occupancy","Address number"], active:true },
      { id:"occ_full", name:"Occupancy Check + Report", description:"Full occupancy check with written condition report", basePrice:110, compensation:72, category:"occupancy", active:true },
      { id:"cond_exterior", name:"Exterior Condition Report", description:"Document exterior condition with damage notes", basePrice:95, compensation:62, category:"occupancy", shotList:["All four sides of property","Roof visible condition","Foundation visible","Driveway/walkway","Any exterior damage"], active:true },
      { id:"cond_full", name:"Full Property Condition Report", description:"Complete interior and exterior condition documentation", basePrice:200, compensation:130, category:"occupancy", requiresInterior:true, active:true },
    ],
  },
  {
    id: "inspection",
    label: "Property Inspections",
    services: [
      { id:"insp_pre_sale", name:"Pre-Sale Inspection Photos", description:"Document property condition before listing", basePrice:130, compensation:85, category:"inspection", active:true },
      { id:"insp_construction", name:"Construction Inspection", description:"Document construction progress and condition", basePrice:175, compensation:114, category:"inspection", active:true },
      { id:"insp_disaster", name:"Disaster/Storm Inspection", description:"Document storm or disaster damage", basePrice:250, compensation:163, category:"inspection", active:true },
      { id:"insp_insurance", name:"Insurance Inspection", description:"Document property for insurance purposes", basePrice:120, compensation:78, category:"inspection", active:true },
      { id:"insp_tax", name:"Tax Lien Inspection", description:"Property inspection for tax lien assessment", basePrice:100, compensation:65, category:"inspection", active:true },
      { id:"insp_reo", name:"REO Property Inspection", description:"Bank-owned property full documentation", basePrice:150, compensation:98, category:"inspection", active:true },
      { id:"insp_investment", name:"Investment Assessment", description:"Full property assessment for investment purposes", basePrice:200, compensation:130, category:"inspection", active:true },
    ],
  },
  {
    id: "vehicle",
    label: "Vehicle Inspections",
    services: [
      { id:"veh_car", name:"Car Inspection", description:"Full exterior and interior vehicle inspection with condition report", basePrice:120, compensation:78, category:"vehicle", shotList:["Front","Rear","Both sides","Interior dashboard","Interior seats","Engine bay","Odometer","VIN plate","Any damage"], active:true },
      { id:"veh_car_basic", name:"Car Exterior Only", description:"Exterior photos of vehicle from all angles", basePrice:80, compensation:52, category:"vehicle", shotList:["Front","Rear","Driver side","Passenger side","Any body damage"], active:true },
      { id:"veh_motorcycle", name:"Motorcycle Inspection", description:"Full motorcycle inspection including engine start verification", basePrice:100, compensation:65, category:"vehicle", shotList:["Both sides","Front","Rear","Engine","Odometer","VIN","Start verification"], active:true },
      { id:"veh_rv", name:"RV / Camper Inspection", description:"Full RV inspection interior and exterior with condition report", basePrice:200, compensation:130, category:"vehicle", requiresInterior:true, shotList:["All exterior sides","Interior living area","Kitchen","Bathroom","Sleeping area","Engine bay","Roof","Any damage"], active:true },
      { id:"veh_boat", name:"Boat Inspection", description:"Full boat inspection with condition report", basePrice:180, compensation:117, category:"vehicle", shotList:["Both sides","Bow","Stern","Interior cabin","Engine","Hull below waterline if accessible","Any damage"], active:true },
      { id:"veh_truck", name:"Truck / Commercial Vehicle", description:"Heavy truck or commercial vehicle inspection", basePrice:150, compensation:98, category:"vehicle", active:true },
      { id:"veh_trailer", name:"Trailer Inspection", description:"Cargo or utility trailer inspection", basePrice:90, compensation:59, category:"vehicle", active:true },
    ],
  },
  {
    id: "commercial",
    label: "Commercial & Business Inspections",
    services: [
      { id:"com_retail", name:"Retail Space Inspection", description:"Document retail location condition and compliance", basePrice:200, compensation:130, category:"commercial", requiresInterior:true, active:true },
      { id:"com_restaurant", name:"Restaurant Inspection Photos", description:"Document restaurant condition for buyers or insurance", basePrice:220, compensation:143, category:"commercial", requiresInterior:true, active:true },
      { id:"com_office", name:"Office Space Documentation", description:"Full office space condition photography", basePrice:180, compensation:117, category:"commercial", requiresInterior:true, active:true },
      { id:"com_warehouse", name:"Warehouse Inspection", description:"Large commercial warehouse condition report", basePrice:250, compensation:163, category:"commercial", requiresInterior:true, active:true },
      { id:"com_project", name:"Project Completion Verification", description:"Verify a project is completed as agreed before final payment", basePrice:160, compensation:104, category:"commercial", active:true },
    ],
  },
  {
    id: "rental",
    label: "Rental & Lease Inspections",
    services: [
      { id:"rent_move_in", name:"Move-In Condition Report", description:"Document rental property condition at move-in", basePrice:130, compensation:85, category:"rental", requiresInterior:true, active:true },
      { id:"rent_move_out", name:"Move-Out Condition Report", description:"Document rental property condition at move-out", basePrice:130, compensation:85, category:"rental", requiresInterior:true, active:true },
      { id:"rent_mid", name:"Mid-Lease Inspection", description:"Mid-lease property condition check", basePrice:110, compensation:72, category:"rental", active:true },
      { id:"rent_airbnb", name:"Short-Term Rental Inspection", description:"Airbnb/VRBO property condition verification", basePrice:120, compensation:78, category:"rental", active:true },
    ],
  },
  {
    id: "land",
    label: "Land & Lot Surveys",
    services: [
      { id:"land_vacant", name:"Vacant Lot Documentation", description:"Document vacant land with boundary photos", basePrice:80, compensation:52, category:"land", shotList:["All four corners of lot","Street sign","Address/lot marker","Any structures or improvements","Surrounding area"], active:true },
      { id:"land_boundary", name:"Boundary Survey Photos", description:"Photograph property boundary markers and lines", basePrice:100, compensation:65, category:"land", active:true },
      { id:"land_survey", name:"Land Condition Survey", description:"Full land condition documentation with notes", basePrice:120, compensation:78, category:"land", active:true },
    ],
  },
  {
    id: "videography",
    label: "Videography",
    services: [
      { id:"vid_exterior", name:"Exterior Walkthrough Video", description:"Full exterior 360 degree walkthrough video", basePrice:150, compensation:98, category:"videography", active:true },
      { id:"vid_full", name:"Full Property Walkthrough Video", description:"Complete interior and exterior walkthrough video — all rooms, all angles", basePrice:250, compensation:163, category:"videography", requiresInterior:true, active:true },
      { id:"vid_drone", name:"Aerial Drone Video (where permitted)", description:"Drone video footage of property and surroundings", basePrice:300, compensation:195, category:"videography", active:true },
      { id:"vid_vehicle", name:"Vehicle Video Inspection", description:"Full video walk-around of vehicle", basePrice:130, compensation:85, category:"videography", active:true },
    ],
  },
  {
    id: "specialty",
    label: "Specialty Services",
    services: [
      { id:"spec_neighbor", name:"Neighborhood Assessment", description:"Document neighborhood condition and surroundings", basePrice:110, compensation:72, category:"specialty", shotList:["Subject property","Neighboring properties left/right","Street view both directions","Any area concerns"], active:true },
      { id:"spec_pool", name:"Pool & Spa Inspection", description:"Document pool/spa condition and visible issues", basePrice:120, compensation:78, category:"specialty", active:true },
      { id:"spec_roof", name:"Roof Condition Photos", description:"Document roof condition from ground and accessible angles", basePrice:100, compensation:65, category:"specialty", active:true },
      { id:"spec_utilities", name:"Utility Meter Documentation", description:"Photograph all utility meters for occupancy/usage verification", basePrice:75, compensation:49, category:"specialty", active:true },
      { id:"spec_lockbox", name:"Lockbox/Access Verification", description:"Verify lockbox is present and accessible", basePrice:70, compensation:46, category:"specialty", active:true },
      { id:"spec_signage", name:"For Sale / Listing Sign Verification", description:"Verify signage is placed correctly at property", basePrice:65, compensation:42, category:"specialty", active:true },
      { id:"spec_hoarding", name:"Hoarding/Code Violation Documentation", description:"Document hoarding or code violation conditions", basePrice:150, compensation:98, category:"specialty", requiresInterior:true, active:true },
      { id:"spec_winterize", name:"Winterization Verification", description:"Verify property has been properly winterized", basePrice:100, compensation:65, category:"specialty", active:true },
    ],
  },
  {
    id: "custom",
    label: "Custom Orders",
    services: [
      { id:"custom_order", name:"Custom Order (You Set the Price)", description:"Describe exactly what photos you need. You set the price — admin reviews and dispatches.", basePrice:0, compensation:0, category:"custom", isCustom:true, active:true },
    ],
  },
];

// Flat lookup map
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

export function calcServicePrice(serviceId: string, tier: string, customPrice?: number): number {
  const svc = SERVICE_MAP[serviceId];
  if (!svc) return 0;
  if (svc.isCustom) return customPrice ?? 0;
  const mul = TIER_MULTIPLIERS[tier] ?? 1;
  return Math.round(svc.basePrice * mul);
}

export function calcCompensation(serviceId: string, tier: string, customPrice?: number): number {
  const svc = SERVICE_MAP[serviceId];
  if (!svc) return 0;
  if (svc.isCustom) return Math.round((customPrice ?? 0) * 0.65);
  const mul = TIER_MULTIPLIERS[tier] ?? 1;
  return Math.round(svc.compensation * mul);
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
  // Standard: next business day
  // Before 10 AM → next business day (tomorrow)
  // After 10 AM → day after tomorrow
  const daysToAdd = hour < 10 ? 1 : 2;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysToAdd);
  deadline.setHours(17, 0, 0, 0); // 5 PM deadline
  return deadline;
}

export function getCutoffMessage(localHour: number): string {
  if (localHour < 10) {
    return `Order before 10:00 AM local time — completes next business day by 5 PM`;
  }
  return `Order after 10:00 AM local time — standard orders complete in 2 business days`;
}
