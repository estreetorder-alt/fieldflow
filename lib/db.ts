import { supabase } from "./supabase";

// ── Types (mirrors store.ts) ──────────────────────────────────

export type UserRole = "admin" | "agent" | "client"
  | "sub_admin_orders" | "sub_admin_users" | "sub_admin_finance" | "sub_admin_support";

export interface User {
  id: string; email: string; password: string;
  role: UserRole;
  name: string; phone: string; company?: string; createdAt?: string;
  available?: boolean; rating?: number; bio?: string;
  coverageZone?: string; vehicle?: string;
  totalEarnings?: number; pendingPayout?: number; completedJobs?: number;
  grade?: number; completionRate?: number; responseRate?: number; approved?: boolean;
  parentClientId?: string;
  accountActive?: boolean; suspended?: boolean;
  backgroundCheckStatus?: "not_started" | "pending" | "passed" | "failed";
  backgroundCheckNotes?: string;
  backgroundCheckUpdatedAt?: string;
  smsOptIn?: boolean;
  /** Admin-granted overdraft: vendor can place/accept orders past a $0 wallet
   *  balance, down to -walletCreditLimit, without being blocked. Defaults to 0
   *  (no override) for every vendor unless an admin sets one. */
  walletCreditLimit?: number;
  // ── Agent type / ghost agents ──
  /** self_registered = signed up themselves, sees real names/pricing.
   *  ghost = admin-created stand-in for a local contact who never logs in;
   *  admin bids/manages on their behalf. Only ever visible to admin. */
  agentType?: "self_registered" | "ghost";
  /** Admin-only note identifying who a ghost agent really is. Never sent to
   *  any non-admin-facing endpoint or UI. */
  ghostAdminLabel?: string;
  /** Set once a ghost agent is converted into a real self-registered
   *  account — points at the new user row. Ghost row is then suspended. */
  ghostConvertedToUserId?: string;
  ghostCreatedBy?: string;
  // ── Sub-admin / account provisioning ──
  mustChangePassword?: boolean;
  createdBy?: string;
  // ── Signup approval gate ──
  signupStatus?: "pending_approval" | "approved" | "rejected";
  signupReviewedBy?: string;
  signupReviewedAt?: string;
  signupRejectionReason?: string;
  // ── Vendor-facing anonymization ──
  vendorAnonId?: string;
  // ── Mapbox proximity cache ──
  lastLat?: number; lastLng?: number; lastGeocodedAt?: string;
  // ── Rollover credit ──
  rolloverEligible?: boolean;
  rolloverUsed?: boolean;
  rolloverRecurring?: boolean;
  rolloverLimit?: number;
}

export interface Bid {
  id: string; orderId: string; agentId: string;
  amount: number; message: string; placedAt: string;
  placedByAdmin?: boolean; status: "pending" | "accepted" | "rejected";
  agentName?: string; agentRating?: number | null;
  /** What the agent actually gets paid — independent from `amount`, which
   *  is the vendor-facing winning bid price. amount - agentPayout = margin. */
  agentPayout?: number;
  payoutSetBy?: string;
  payoutSetAt?: string;
}

export interface Photo {
  id: string; orderId: string; filename: string; url: string;
  description: string; uploadedAt: string; selectedByClient: boolean;
  approved: boolean;
}

export interface StatusEvent { status: string; timestamp: string; note: string; }

export interface Order {
  id: string; address: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  clientId: string; assignedAgentId: string | null;
  acceptedBidId: string | null;
  totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string;
  notes: string; customizeNotes: string;
  photos: Photo[]; photoExpiresAt: string | null; createdAt: string;
  statusHistory: StatusEvent[];
  offerSentAt: string | null; offerAcceptedAt: string | null;
  bulkBatchId: string | null; invoicePaid: boolean;
  amountPaid?: number; amountDue?: number;
  paymentState?: "unpaid" | "partially_paid" | "paid";
  overdraftStatus?: "pending" | "approved" | "rejected" | null;
  serviceId?: string | null; customShotList?: string | null;
  bids: Bid[];
  client?: { name: string; email: string } | null;
  agent?: { name: string; rating?: number } | null;
  vendorAnonId?: string;
  rolloverUnpaid?: boolean;
  rolloverSettledAt?: string | null;
  rolloverAmount?: number;
}

export interface PricingConfig {
  id: string; serviceType: string; basePrice: number;
  urgencyMultiplier: number; active: boolean;
}

// ── Helpers ───────────────────────────────────────────────────

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    role: row.role as User["role"],
    name: row.name as string,
    phone: row.phone as string,
    company: row.company as string | undefined,
    createdAt: row.created_at as string,
    available: row.available as boolean,
    rating: row.rating as number,
    bio: row.bio as string,
    coverageZone: row.coverage_zone as string,
    vehicle: row.vehicle as string,
    totalEarnings: row.total_earnings as number,
    pendingPayout: row.pending_payout as number,
    completedJobs: row.completed_jobs as number,
    grade: row.grade as number | undefined,
    completionRate: row.completion_rate as number | undefined,
    responseRate: row.response_rate as number | undefined,
    approved: row.approved as boolean | undefined,
    parentClientId: row.parent_client_id as string | undefined,
    accountActive: row.account_active as boolean | undefined,
    suspended: row.suspended as boolean | undefined,
    backgroundCheckStatus: (row.background_check_status as User["backgroundCheckStatus"]) ?? "not_started",
    backgroundCheckNotes: row.background_check_notes as string | undefined,
    backgroundCheckUpdatedAt: row.background_check_updated_at as string | undefined,
    smsOptIn: row.sms_opt_in as boolean | undefined,
    walletCreditLimit: Number(row.wallet_credit_limit ?? 0),
    agentType: (row.agent_type as User["agentType"]) ?? "self_registered",
    ghostAdminLabel: row.ghost_admin_label as string | undefined,
    ghostConvertedToUserId: row.ghost_converted_to_user_id as string | undefined,
    ghostCreatedBy: row.ghost_created_by as string | undefined,
    mustChangePassword: row.must_change_password as boolean | undefined,
    createdBy: row.created_by as string | undefined,
    signupStatus: (row.signup_status as User["signupStatus"]) ?? "approved",
    signupReviewedBy: row.signup_reviewed_by as string | undefined,
    signupReviewedAt: row.signup_reviewed_at as string | undefined,
    signupRejectionReason: row.signup_rejection_reason as string | undefined,
    vendorAnonId: row.vendor_anon_id as string | undefined,
    lastLat: row.last_lat as number | undefined,
    lastLng: row.last_lng as number | undefined,
    lastGeocodedAt: row.last_geocoded_at as string | undefined,
    rolloverEligible: row.rollover_eligible as boolean | undefined,
    rolloverUsed: row.rollover_used as boolean | undefined,
    rolloverRecurring: row.rollover_recurring as boolean | undefined,
    rolloverLimit: row.rollover_limit as number | undefined,
  };
}

function mapOrder(
  row: Record<string, unknown>,
  bids: Bid[] = [],
  photos: Photo[] = [],
  history: StatusEvent[] = [],
  client?: { name: string; email: string } | null,
  agent?: { name: string; rating?: number } | null,
): Order {
  return {
    id: row.id as string,
    address: row.address as string,
    status: row.status as Order["status"],
    clientId: row.client_id as string,
    assignedAgentId: row.assigned_agent_id as string | null,
    acceptedBidId: row.accepted_bid_id as string | null,
    totalPrice: Number(row.total_price),
    compensationAmount: Number(row.compensation_amount),
    serviceType: row.service_type as string,
    turnaroundTier: row.turnaround_tier as string,
    notes: row.notes as string,
    customizeNotes: row.customize_notes as string,
    photoExpiresAt: row.photo_expires_at as string | null,
    createdAt: row.created_at as string,
    offerSentAt: row.offer_sent_at as string | null,
    offerAcceptedAt: row.offer_accepted_at as string | null,
    bulkBatchId: row.bulk_batch_id as string | null,
    invoicePaid: row.invoice_paid as boolean,
    amountPaid: row.amount_paid !== undefined && row.amount_paid !== null ? Number(row.amount_paid) : undefined,
    amountDue: row.amount_due !== undefined && row.amount_due !== null ? Number(row.amount_due) : undefined,
    paymentState: (row.payment_state as Order["paymentState"]) ?? undefined,
    overdraftStatus: (row.overdraft_status as Order["overdraftStatus"]) ?? null,
    serviceId: (row.service_id as string) ?? null,
    customShotList: (row.custom_shot_list as string) ?? null,
    bids,
    photos,
    statusHistory: history,
    client: client ?? null,
    agent: agent ?? null,
    vendorAnonId: row.vendor_anon_id as string | undefined,
    rolloverUnpaid: row.rollover_unpaid as boolean | undefined,
    rolloverSettledAt: row.rollover_settled_at as string | null | undefined,
    rolloverAmount: row.rollover_amount as number | undefined,
  };
}

function mapBid(row: Record<string, unknown>): Bid {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    agentId: row.agent_id as string,
    amount: Number(row.amount),
    message: row.message as string,
    placedAt: row.placed_at as string,
    placedByAdmin: row.placed_by_admin as boolean,
    status: row.status as Bid["status"],
    agentName: (row.agentName as string) ?? undefined,
    agentRating: (row.agentRating as number | null) ?? null,
    agentPayout: row.agent_payout !== undefined && row.agent_payout !== null ? Number(row.agent_payout) : undefined,
    payoutSetBy: row.payout_set_by as string | undefined,
    payoutSetAt: row.payout_set_at as string | undefined,
  };
}

function mapPhoto(row: Record<string, unknown>): Photo {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    filename: row.filename as string,
    url: row.url as string,
    description: row.description as string,
    uploadedAt: row.uploaded_at as string,
    selectedByClient: row.selected_by_client as boolean,
    approved: row.approved === false ? false : true, // legacy rows (null) count as approved
  };
}

// ── Users ─────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users").select("*").eq("email", email.toLowerCase()).single();
  if (error || !data) return null;
  return mapUser(data as Record<string, unknown>);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapUser(data as Record<string, unknown>);
}

export async function getAllUsers(): Promise<User[]> {
  const { data } = await supabase.from("users").select("*").order("created_at");
  return (data ?? []).map(r => mapUser(r as Record<string, unknown>));
}

export async function getAgents(): Promise<User[]> {
  const { data } = await supabase.from("users").select("*").eq("role", "agent").order("name");
  return (data ?? []).map(r => mapUser(r as Record<string, unknown>));
}

export async function createUser(user: Omit<User, "createdAt">): Promise<User> {
  const vendorAnonId = user.role === "agent"
    ? `AGT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    : null;
  const { data, error } = await supabase.from("users").insert({
    id: user.id,
    email: user.email.toLowerCase(),
    password: user.password,
    role: user.role,
    name: user.name,
    phone: user.phone ?? "",
    company: user.company ?? null,
    available: user.available ?? false,
    rating: user.rating ?? 5.0,
    bio: user.bio ?? "",
    coverage_zone: user.coverageZone ?? "",
    vehicle: user.vehicle ?? "",
    total_earnings: user.totalEarnings ?? 0,
    pending_payout: user.pendingPayout ?? 0,
    completed_jobs: user.completedJobs ?? 0,
    parent_client_id: user.parentClientId ?? null,
    agent_type: user.agentType ?? "self_registered",
    ghost_admin_label: user.ghostAdminLabel ?? "",
    ghost_created_by: user.ghostCreatedBy ?? null,
    must_change_password: user.mustChangePassword ?? false,
    created_by: user.createdBy ?? null,
    signup_status: user.signupStatus ?? "approved",
    vendor_anon_id: vendorAnonId,
    rollover_eligible: user.rolloverEligible ?? false,
    rollover_limit: user.rolloverLimit ?? 0,
  }).select().single();
  if (error) throw new Error(error.message);
  return mapUser(data as Record<string, unknown>);
}

/** Admin-only: create a ghost agent. Never self-registered, never logs in
 *  (no usable password flow exposed), never appears to vendors as anything
 *  but an anonymized Agent # code — same as any other agent. */
export async function createGhostAgent(opts: {
  name: string; ghostAdminLabel: string; coverageZone?: string;
  createdBy: string; phone?: string;
}): Promise<User> {
  return createUser({
    id: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    email: `ghost-${Date.now()}@internal.snapect.local`,
    password: "", // no login — ghost agents never authenticate
    role: "agent",
    name: opts.name,
    phone: opts.phone ?? "",
    coverageZone: opts.coverageZone ?? "",
    available: true,
    rating: 5.0, bio: "", vehicle: "",
    totalEarnings: 0, pendingPayout: 0, completedJobs: 0,
    agentType: "ghost",
    ghostAdminLabel: opts.ghostAdminLabel,
    ghostCreatedBy: opts.createdBy,
    signupStatus: "approved",
  });
}

/** Admin-only: convert a ghost agent's local contact into a real
 *  self-registered account. Creates the new user, links the ghost row to
 *  it via ghost_converted_to_user_id, and suspends the ghost so it can no
 *  longer be assigned new orders — its full job/bid history stays intact
 *  and attributed to the ghost id for records already created. */
export async function convertGhostToRealAgent(ghostId: string, opts: {
  email: string; password: string; createdBy: string;
}): Promise<User> {
  const ghost = await getUserById(ghostId);
  if (!ghost || ghost.agentType !== "ghost") throw new Error("Not a ghost agent");
  const real = await createUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    email: opts.email.toLowerCase(),
    password: opts.password,
    role: "agent",
    name: ghost.name,
    phone: ghost.phone,
    coverageZone: ghost.coverageZone,
    available: true, rating: ghost.rating, bio: ghost.bio, vehicle: ghost.vehicle,
    totalEarnings: 0, pendingPayout: 0, completedJobs: 0,
    agentType: "self_registered",
    createdBy: opts.createdBy,
    signupStatus: "approved",
    mustChangePassword: true,
  });
  await supabase.from("users").update({
    ghost_converted_to_user_id: real.id,
    suspended: true,
    available: false,
  }).eq("id", ghostId);
  return real;
}

export async function updateUser(id: string, fields: Partial<User>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.company !== undefined) patch.company = fields.company;
  if (fields.available !== undefined) patch.available = fields.available;
  if (fields.rating !== undefined) patch.rating = fields.rating;
  if (fields.bio !== undefined) patch.bio = fields.bio;
  if (fields.coverageZone !== undefined) patch.coverage_zone = fields.coverageZone;
  if (fields.vehicle !== undefined) patch.vehicle = fields.vehicle;
  if (fields.phone !== undefined) patch.phone = fields.phone;
  if (fields.pendingPayout !== undefined) patch.pending_payout = fields.pendingPayout;
  if (fields.totalEarnings !== undefined) patch.total_earnings = fields.totalEarnings;
  if (fields.completedJobs !== undefined) patch.completed_jobs = fields.completedJobs;
  if (fields.backgroundCheckStatus !== undefined) { patch.background_check_status = fields.backgroundCheckStatus; patch.background_check_updated_at = new Date().toISOString(); }
  if (fields.backgroundCheckNotes !== undefined) patch.background_check_notes = fields.backgroundCheckNotes;
  if (fields.smsOptIn !== undefined) patch.sms_opt_in = fields.smsOptIn;
  if (fields.suspended !== undefined) patch.suspended = fields.suspended;
  if (fields.walletCreditLimit !== undefined) patch.wallet_credit_limit = fields.walletCreditLimit;
  if (fields.ghostAdminLabel !== undefined) patch.ghost_admin_label = fields.ghostAdminLabel;
  if (fields.mustChangePassword !== undefined) patch.must_change_password = fields.mustChangePassword;
  if (fields.password !== undefined) patch.password = fields.password;
  if (fields.rolloverEligible !== undefined) patch.rollover_eligible = fields.rolloverEligible;
  if (fields.rolloverUsed !== undefined) patch.rollover_used = fields.rolloverUsed;
  if (fields.rolloverRecurring !== undefined) patch.rollover_recurring = fields.rolloverRecurring;
  if (fields.rolloverLimit !== undefined) patch.rollover_limit = fields.rolloverLimit;
  if (fields.lastLat !== undefined) patch.last_lat = fields.lastLat;
  if (fields.lastLng !== undefined) patch.last_lng = fields.lastLng;
  if (fields.lastGeocodedAt !== undefined) patch.last_geocoded_at = fields.lastGeocodedAt;
  const { error } = await supabase.from("users").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Signup approval gate (req. 14) ──────────────────────────────

export async function approveSignup(userId: string, adminId: string): Promise<User> {
  await supabase.from("users").update({
    signup_status: "approved",
    signup_reviewed_by: adminId,
    signup_reviewed_at: new Date().toISOString(),
    account_active: true,
  }).eq("id", userId);
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found after approval");
  return user;
}

export async function rejectSignup(userId: string, adminId: string, reason: string): Promise<User> {
  await supabase.from("users").update({
    signup_status: "rejected",
    signup_reviewed_by: adminId,
    signup_reviewed_at: new Date().toISOString(),
    signup_rejection_reason: reason,
    account_active: false,
  }).eq("id", userId);
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found after rejection");
  return user;
}

export async function getPendingSignups(): Promise<User[]> {
  const { data } = await supabase.from("users").select("*")
    .eq("signup_status", "pending_approval").order("created_at");
  return (data ?? []).map(r => mapUser(r as Record<string, unknown>));
}

// Anonymized display id for a user — vendors never see real agent names.
// Seeded from BOTH the agent id and the order id, so every order shows a
// different, unrelated-looking label even for the same agent (e.g. an agent
// who completes three orders for the same vendor shows up as three totally
// different "Agent #XXXXXX" codes to that vendor). The mapping back to the
// real agent is never lost — admin views (which never call this) always show
// the real name/id, and the underlying assignedAgentId/bid.agentId columns
// are untouched, so an agent's full job history stays intact in the admin
// panel and in the agent's own dashboard.
export function anonUserId(id: string | null | undefined, orderId?: string | null): string {
  const seed = `${id ?? ""}::${orderId ?? ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0;
  const code = hash.toString(16).toUpperCase().padStart(6, "0").slice(-6);
  return `Agent #${code}`;
}

// ── Orders ────────────────────────────────────────────────────

async function enrichOrders(rows: Record<string, unknown>[]): Promise<Order[]> {
  if (!rows.length) return [];
  const orderIds = rows.map(r => r.id as string);

  const [bidsRes, photosRes, historyRes] = await Promise.all([
    supabase.from("bids").select("*, users!bids_agent_id_fkey(name, rating)").in("order_id", orderIds),
    supabase.from("photos").select("*").in("order_id", orderIds),
    supabase.from("status_history").select("*").in("order_id", orderIds).order("created_at"),
  ]);

  const bidsMap: Record<string, Bid[]> = {};
  for (const b of bidsRes.data ?? []) {
    const row = b as Record<string, unknown>;
    const agentData = row.users as { name: string; rating: number } | null;
    const bid = mapBid({ ...row, agentName: agentData?.name, agentRating: agentData?.rating ?? null });
    if (!bidsMap[bid.orderId]) bidsMap[bid.orderId] = [];
    bidsMap[bid.orderId].push(bid);
  }

  const photosMap: Record<string, Photo[]> = {};
  for (const p of photosRes.data ?? []) {
    const photo = mapPhoto(p as Record<string, unknown>);
    if (!photosMap[photo.orderId]) photosMap[photo.orderId] = [];
    photosMap[photo.orderId].push(photo);
  }

  const historyMap: Record<string, StatusEvent[]> = {};
  for (const h of historyRes.data ?? []) {
    const row = h as Record<string, unknown>;
    const ev: StatusEvent = { status: row.status as string, timestamp: row.created_at as string, note: row.note as string };
    if (!historyMap[row.order_id as string]) historyMap[row.order_id as string] = [];
    historyMap[row.order_id as string].push(ev);
  }

  // Get unique client/agent IDs
  const userIds = new Set<string>();
  rows.forEach(r => {
    userIds.add(r.client_id as string);
    if (r.assigned_agent_id) userIds.add(r.assigned_agent_id as string);
  });
  const { data: usersData } = await supabase.from("users").select("id, name, email, rating").in("id", [...userIds]);
  const usersMap: Record<string, { name: string; email: string; rating?: number }> = {};
  for (const u of usersData ?? []) {
    const row = u as Record<string, unknown>;
    usersMap[row.id as string] = { name: row.name as string, email: row.email as string, rating: row.rating as number };
  }

  return rows.map(r => mapOrder(
    r,
    bidsMap[r.id as string] ?? [],
    photosMap[r.id as string] ?? [],
    historyMap[r.id as string] ?? [],
    r.client_id ? { name: usersMap[r.client_id as string]?.name ?? "", email: usersMap[r.client_id as string]?.email ?? "" } : null,
    r.assigned_agent_id ? { name: usersMap[r.assigned_agent_id as string]?.name ?? "", rating: usersMap[r.assigned_agent_id as string]?.rating } : null,
  ));
}

export async function getOrdersByClientId(clientId: string): Promise<Order[]> {
  const { data } = await supabase.from("orders").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
  return enrichOrders((data ?? []) as Record<string, unknown>[]);
}

export async function getOrdersByAgentId(agentId: string): Promise<Order[]> {
  const { data } = await supabase.from("orders").select("*").eq("assigned_agent_id", agentId).order("created_at", { ascending: false });
  return enrichOrders((data ?? []) as Record<string, unknown>[]);
}

export async function getAllOrders(): Promise<Order[]> {
  await reconcilePaymentStatuses();
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  return enrichOrders((data ?? []) as Record<string, unknown>[]);
}

// One-time-safe backfill for orders placed before the payment-status fix
// shipped: if a wallet hold was actually taken (wallet_hold_amount > 0) but
// the order is still flagged "pending" (Awaiting Payment), correct it. Only
// ever touches that exact stale combination, so it's safe to run on every
// admin dashboard load — most runs will find nothing to fix.
export async function reconcilePaymentStatuses(): Promise<number> {
  const { data } = await supabase.from("orders")
    .select("id").eq("payment_status", "pending").gt("wallet_hold_amount", 0);
  const ids = (data ?? []).map(r => (r as Record<string, unknown>).id as string);
  if (ids.length === 0) return 0;
  await supabase.from("orders").update({ payment_status: "confirmed" }).in("id", ids);
  return ids.length;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const { data } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!data) return null;
  const orders = await enrichOrders([data as Record<string, unknown>]);
  return orders[0] ?? null;
}

export async function createOrder(order: {
  address: string; clientId: string; totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: string; notes: string; customizeNotes: string;
  bulkBatchId?: string | null;
}): Promise<Order> {
  const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("orders").insert({
    id,
    address: order.address,
    status: "pending",
    client_id: order.clientId,
    assigned_agent_id: null,
    accepted_bid_id: null,
    total_price: order.totalPrice,
    compensation_amount: order.compensationAmount,
    service_type: order.serviceType,
    turnaround_tier: order.turnaroundTier,
    notes: order.notes,
    customize_notes: order.customizeNotes,
    bulk_batch_id: order.bulkBatchId ?? null,
    invoice_paid: false,
    offer_sent_at: new Date().toISOString(),
    vendor_anon_id: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
  }).select().single();
  if (error) throw new Error(error.message);

  await supabase.from("status_history").insert({
    order_id: id, status: "pending", note: "Order submitted by client",
  });

  const orders = await enrichOrders([data as Record<string, unknown>]);
  return orders[0];
}

export async function updateOrder(id: string, fields: Record<string, unknown>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.status !== undefined) patch.status = fields.status;
  if (fields.assignedAgentId !== undefined) patch.assigned_agent_id = fields.assignedAgentId;
  if (fields.acceptedBidId !== undefined) patch.accepted_bid_id = fields.acceptedBidId;
  if (fields.compensationAmount !== undefined) patch.compensation_amount = fields.compensationAmount;
  if (fields.offerAcceptedAt !== undefined) patch.offer_accepted_at = fields.offerAcceptedAt;
  if (fields.invoicePaid !== undefined) patch.invoice_paid = fields.invoicePaid;
  if (fields.photoExpiresAt !== undefined) patch.photo_expires_at = fields.photoExpiresAt;
  await supabase.from("orders").update(patch).eq("id", id);
}

export async function addStatusHistory(orderId: string, status: string, note: string): Promise<void> {
  await supabase.from("status_history").insert({ order_id: orderId, status, note });
}

// ── Bids ──────────────────────────────────────────────────────

export async function getBidsByOrderId(orderId: string): Promise<Bid[]> {
  const { data } = await supabase
    .from("bids")
    .select("*, users!bids_agent_id_fkey(name, rating)")
    .eq("order_id", orderId)
    .order("placed_at");
  return (data ?? []).map(b => {
    const row = b as Record<string, unknown>;
    const agentData = row.users as { name: string; rating: number } | null;
    return mapBid({ ...row, agentName: agentData?.name, agentRating: agentData?.rating ?? null });
  });
}

export async function getBidsByAgentAndOrder(agentId: string, orderId: string): Promise<Bid | null> {
  const { data } = await supabase.from("bids").select("*").eq("order_id", orderId).eq("agent_id", agentId).single();
  if (!data) return null;
  return mapBid(data as Record<string, unknown>);
}

export async function createBid(bid: {
  orderId: string; agentId: string; amount: number; message: string; placedByAdmin: boolean;
  agentPayout?: number; payoutSetBy?: string;
}): Promise<Bid> {
  // Req. 2: bidding stays entirely admin-controlled through ghost agents.
  // A self-registered agent's own account can never place a bid or see
  // order pricing — only admin, acting on behalf of a ghost agent (or
  // setting a bid directly), may create bid rows.
  const agent = await getUserById(bid.agentId);
  if (!agent) throw new Error("Agent not found");
  if (agent.agentType === "self_registered" && !bid.placedByAdmin) {
    throw new Error("Self-registered agents cannot place bids. Bidding is admin-controlled.");
  }

  const id = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  // Req. 3: agent payout is independent from the vendor-facing bid amount.
  // If admin didn't set one explicitly, default payout to the bid amount
  // (no silent margin unless admin deliberately sets a lower payout).
  const agentPayout = bid.agentPayout !== undefined ? bid.agentPayout : bid.amount;
  const { data, error } = await supabase.from("bids").insert({
    id,
    order_id: bid.orderId,
    agent_id: bid.agentId,
    amount: bid.amount,
    message: bid.message,
    placed_by_admin: bid.placedByAdmin,
    status: "pending",
    agent_payout: agentPayout,
    payout_set_by: bid.payoutSetBy ?? null,
    payout_set_at: bid.payoutSetBy ? new Date().toISOString() : null,
  }).select().single();
  if (error) throw new Error(error.message);
  return mapBid(data as Record<string, unknown>);
}

/** Admin-only: set/change an agent's payout for a bid, independent of the
 *  vendor-facing bid price. The spread between amount and agentPayout is
 *  platform margin. */
export async function setBidPayout(bidId: string, agentPayout: number, adminId: string): Promise<void> {
  await supabase.from("bids").update({
    agent_payout: agentPayout,
    payout_set_by: adminId,
    payout_set_at: new Date().toISOString(),
  }).eq("id", bidId);
}

export async function updateBidStatus(bidId: string, status: "accepted" | "rejected"): Promise<void> {
  await supabase.from("bids").update({ status }).eq("id", bidId);
}

export async function rejectOtherBids(orderId: string, acceptedBidId: string): Promise<void> {
  await supabase.from("bids").update({ status: "rejected" })
    .eq("order_id", orderId).neq("id", acceptedBidId);
}

/** Closes out every still-pending bid on an order — used when an admin
 *  assigns an agent directly (bypassing the accept-bid flow) so stray
 *  "pending" bids don't linger and imply bidding is still open. */
export async function rejectAllPendingBids(orderId: string): Promise<void> {
  await supabase.from("bids").update({ status: "rejected" })
    .eq("order_id", orderId).eq("status", "pending");
}

// ── Photos ────────────────────────────────────────────────────

export async function addPhoto(photo: {
  orderId: string; filename: string; url: string; description: string; approved?: boolean;
}): Promise<Photo> {
  const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("photos").insert({
    id,
    order_id: photo.orderId,
    filename: photo.filename,
    url: photo.url,
    description: photo.description,
    selected_by_client: false,
    approved: photo.approved ?? true,
  }).select().single();
  if (error) throw new Error(error.message);
  return mapPhoto(data as Record<string, unknown>);
}

export async function updatePhotoSelection(orderId: string, selectedIds: string[]): Promise<void> {
  await supabase.from("photos").update({ selected_by_client: false }).eq("order_id", orderId);
  if (selectedIds.length > 0) {
    await supabase.from("photos").update({ selected_by_client: true }).in("id", selectedIds);
  }
}

// ── Pricing ───────────────────────────────────────────────────

export async function getPricingConfig(): Promise<PricingConfig[]> {
  const { data } = await supabase.from("pricing_config").select("*").order("service_type");
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      serviceType: row.service_type as string,
      basePrice: Number(row.base_price),
      urgencyMultiplier: Number(row.urgency_multiplier),
      active: row.active as boolean,
    };
  });
}

export async function updatePricingConfig(id: string, fields: Partial<PricingConfig>): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.basePrice !== undefined) patch.base_price = fields.basePrice;
  if (fields.urgencyMultiplier !== undefined) patch.urgency_multiplier = fields.urgencyMultiplier;
  if (fields.active !== undefined) patch.active = fields.active;
  await supabase.from("pricing_config").update(patch).eq("id", id);
}

// ── Email log ─────────────────────────────────────────────────

export async function addEmailLog(entry: { type: string; to: string; subject: string; body?: string }): Promise<void> {
  await supabase.from("email_log").insert({
    type: entry.type, to_email: entry.to, subject: entry.subject, body: entry.body ?? "",
  });
}

export async function getEmailLog(): Promise<{ timestamp: string; type: string; to: string; subject: string; body: string }[]> {
  const { data } = await supabase.from("email_log").select("*").order("created_at", { ascending: false }).limit(100);
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>;
    return { timestamp: row.created_at as string, type: row.type as string, to: row.to_email as string, subject: row.subject as string, body: row.body as string };
  });
}

// ── ZIP Codes ─────────────────────────────────────────────────

export async function getAgentZipCodes(agentId: string): Promise<string[]> {
  const { data } = await supabase.from("agent_zip_codes").select("zip_code").eq("agent_id", agentId);
  return (data ?? []).map(r => (r as Record<string,unknown>).zip_code as string);
}

export async function setAgentZipCodes(agentId: string, zipCodes: string[]): Promise<void> {
  await supabase.from("agent_zip_codes").delete().eq("agent_id", agentId);
  if (zipCodes.length > 0) {
    await supabase.from("agent_zip_codes").insert(zipCodes.map(z => ({ agent_id: agentId, zip_code: z.trim() })));
  }
}

export async function findAgentsByZip(zip: string): Promise<User[]> {
  const { data } = await supabase
    .from("agent_zip_codes")
    .select("agent_id, users!agent_zip_codes_agent_id_fkey(*)")
    .eq("zip_code", zip);
  return (data ?? [])
    .map(r => (r as Record<string,unknown>).users)
    .filter(Boolean)
    .map(u => mapUser(u as Record<string,unknown>))
    .filter(u => u.available && u.approved);
}

// ── Auto-dispatch ─────────────────────────────────────────────

export async function autoDispatch(orderId: string, zip: string): Promise<string | null> {
  const agents = await findAgentsByZip(zip);
  if (!agents.length) return null;
  // Sort by grade desc, pick highest
  agents.sort((a, b) => (b.grade ?? 3) - (a.grade ?? 3));
  const best = agents[0];
  const deadline = new Date(Date.now() + 3 * 3600000).toISOString();
  await supabase.from("orders").update({
    assigned_agent_id: best.id,
    dispatched_at: new Date().toISOString(),
    response_deadline: deadline,
  }).eq("id", orderId);
  await addStatusHistory(orderId, "pending", `Auto-dispatched to ${best.name} — must respond by ${new Date(deadline).toLocaleTimeString("en-US", { timeZone: "America/New_York" })} ET`);
  return best.id;
}

// ── Messages ──────────────────────────────────────────────────

export interface Message {
  id: number; fromId: string; toId: string; orderId: string | null;
  body: string; read: boolean; createdAt: string;
  fromName?: string; toName?: string;
}

export async function getMessages(userId: string): Promise<Message[]> {
  const { data } = await supabase
    .from("messages")
    .select("*, from:users!messages_from_id_fkey(name), to:users!messages_to_id_fkey(name)")
    .or(`from_id.eq.${userId},to_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(r => {
    const row = r as Record<string,unknown>;
    return {
      id: row.id as number, fromId: row.from_id as string, toId: row.to_id as string,
      orderId: row.order_id as string | null, body: row.body as string,
      read: row.read as boolean, createdAt: row.created_at as string,
      fromName: (row.from as Record<string,unknown>)?.name as string,
      toName: (row.to as Record<string,unknown>)?.name as string,
    };
  });
}

export async function sendMessage(fromId: string, toId: string, body: string, orderId?: string): Promise<void> {
  await supabase.from("messages").insert({ from_id: fromId, to_id: toId, body, order_id: orderId ?? null });
}

export async function markMessagesRead(userId: string): Promise<void> {
  await supabase.from("messages").update({ read: true }).eq("to_id", userId).eq("read", false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("to_id", userId).eq("read", false);
  return count ?? 0;
}

// ── Agent samples ─────────────────────────────────────────────

export interface AgentSample {
  id: string; agentId: string; status: string;
  photos: string[]; notes: string; createdAt: string; reviewedAt?: string;
}

export async function submitSample(agentId: string, photos: string[]): Promise<AgentSample> {
  const { data, error } = await supabase.from("agent_samples").insert({
    agent_id: agentId, photos: JSON.stringify(photos), status: "pending",
  }).select().single();
  if (error) throw new Error(error.message);
  const r = data as Record<string,unknown>;
  return { id: r.id as string, agentId: r.agent_id as string, status: r.status as string, photos, notes: "", createdAt: r.created_at as string };
}

export async function reviewSample(sampleId: string, decision: "approved" | "rejected", adminId: string, notes: string): Promise<void> {
  const { data } = await supabase.from("agent_samples").select("agent_id").eq("id", sampleId).single();
  const agentId = (data as Record<string,unknown>)?.agent_id as string;
  await supabase.from("agent_samples").update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: adminId, notes }).eq("id", sampleId);
  if (decision === "approved") {
    await supabase.from("users").update({ approved: true }).eq("id", agentId);
  }
}

export async function getPendingSamples(): Promise<(AgentSample & { agentName: string; agentEmail: string })[]> {
  const { data } = await supabase.from("agent_samples")
    .select("*, users!agent_samples_agent_id_fkey(name, email)")
    .eq("status", "pending").order("created_at");
  return (data ?? []).map(r => {
    const row = r as Record<string,unknown>;
    const user = row.users as Record<string,unknown>;
    return {
      id: row.id as string, agentId: row.agent_id as string, status: row.status as string,
      photos: (row.photos as string[]) ?? [], notes: row.notes as string ?? "",
      createdAt: row.created_at as string,
      agentName: user?.name as string, agentEmail: user?.email as string,
    };
  });
}

// ── Sub-accounts ──────────────────────────────────────────────

export async function getSubAccounts(parentClientId: string): Promise<User[]> {
  const { data } = await supabase.from("users").select("*").eq("parent_client_id", parentClientId);
  return (data ?? []).map(r => mapUser(r as Record<string,unknown>));
}

export async function createSubAccount(sub: { name: string; email: string; password: string; parentClientId: string }): Promise<User> {
  const { hashPassword } = await import("./password");
  return createUser({
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
    email: sub.email, password: await hashPassword(sub.password), role: "client",
    name: sub.name, phone: "", parentClientId: sub.parentClientId,
  });
}

// ── Photo packages ────────────────────────────────────────────

export interface PhotoPackage {
  id: string; name: string; description: string;
  shotList: string[]; basePrice: number; active: boolean;
}

export async function getPhotoPackages(): Promise<PhotoPackage[]> {
  const { data } = await supabase.from("photo_packages").select("*").eq("active", true).order("base_price");
  return (data ?? []).map(r => {
    const row = r as Record<string,unknown>;
    return {
      id: row.id as string, name: row.name as string, description: row.description as string,
      shotList: (row.shot_list as string[]) ?? [], basePrice: Number(row.base_price), active: row.active as boolean,
    };
  });
}

// ── Payout log ────────────────────────────────────────────────

export async function createPayout(agentId: string, amount: number, paypalEmail: string): Promise<void> {
  await supabase.from("payout_log").insert({ agent_id: agentId, amount, paypal_email: paypalEmail, status: "pending" });
  await updateUser(agentId, { pendingPayout: 0 });
}

export async function getPayoutLog(agentId?: string): Promise<Record<string,unknown>[]> {
  let q = supabase.from("payout_log").select("*, users!payout_log_agent_id_fkey(name, email)").order("created_at", { ascending: false });
  if (agentId) q = q.eq("agent_id", agentId);
  const { data } = await q;
  return (data ?? []) as Record<string,unknown>[];
}

// ── Grade update ──────────────────────────────────────────────

export async function updateAgentGrade(agentId: string): Promise<void> {
  const { data: orders } = await supabase.from("orders")
    .select("status").eq("assigned_agent_id", agentId);
  const all = (orders ?? []) as Record<string,unknown>[];
  const completed = all.filter(o => o.status === "completed").length;
  const rate = all.length > 0 ? (completed / all.length) * 100 : 100;
  const agent = await getUserById(agentId);
  const rating = agent?.rating ?? 5.0;
  const grade = Math.min(5.0, (rating * 0.6 + (rate / 100) * 5 * 0.4));
  await supabase.from("users").update({ grade: Math.round(grade * 10) / 10, completion_rate: Math.round(rate * 10) / 10 }).eq("id", agentId);
}

// ── Payment Links ─────────────────────────────────────────────

export interface PaymentLink {
  id: string; label: string; url: string;
  amount?: number; description: string; active: boolean; createdAt: string;
}

export async function getPaymentLinks(): Promise<PaymentLink[]> {
  const { data } = await supabase.from("payment_links").select("*").order("created_at");
  return (data ?? []).map(r => {
    const row = r as Record<string,unknown>;
    return { id:row.id as string, label:row.label as string, url:row.url as string,
      amount:row.amount as number|undefined, description:row.description as string,
      active:row.active as boolean, createdAt:row.created_at as string };
  });
}

export async function upsertPaymentLink(link: Partial<PaymentLink> & { label: string; url: string }): Promise<PaymentLink> {
  const payload: Record<string,unknown> = {
    label: link.label, url: link.url, active: link.active ?? true,
    description: link.description ?? "", updated_at: new Date().toISOString(),
  };
  if (link.amount) payload.amount = link.amount;
  if (link.id) payload.id = link.id;
  const { data, error } = await supabase.from("payment_links").upsert(payload, { onConflict:"id" }).select().single();
  if (error) throw new Error(error.message);
  const r = data as Record<string,unknown>;
  return { id:r.id as string, label:r.label as string, url:r.url as string,
    amount:r.amount as number|undefined, description:r.description as string,
    active:r.active as boolean, createdAt:r.created_at as string };
}

export async function deletePaymentLink(id: string): Promise<void> {
  await supabase.from("payment_links").delete().eq("id", id);
}

// ── Account Activation ───────────────────────────────────────

export async function activateUserAccount(userId: string): Promise<void> {
  await supabase.from("users").update({
    account_active: true,
    activation_paid_at: new Date().toISOString(),
  }).eq("id", userId);
}

export async function suspendUserAccount(userId: string): Promise<void> {
  await supabase.from("users").update({ suspended: true }).eq("id", userId);
}

export async function unsuspendUserAccount(userId: string): Promise<void> {
  await supabase.from("users").update({ suspended: false }).eq("id", userId);
}

// ── Password Reset ────────────────────────────────────────────

export async function createPasswordResetToken(userId: string): Promise<string> {
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex"); // cryptographically secure, 256 bits of entropy
  const expires = new Date(Date.now() + 3600000); // 1 hour
  await supabase.from("password_reset_tokens").insert({
    user_id: userId, token, expires_at: expires.toISOString(),
  });
  return token;
}

export async function validateResetToken(token: string): Promise<string | null> {
  const { data } = await supabase.from("password_reset_tokens")
    .select("*").eq("token", token).eq("used", false).single();
  if (!data) return null;
  const row = data as Record<string,unknown>;
  if (new Date(row.expires_at as string) < new Date()) return null;
  return row.user_id as string;
}

export async function useResetToken(token: string, newPassword: string): Promise<boolean> {
  const userId = await validateResetToken(token);
  if (!userId) return false;
  const { hashPassword } = await import("./password");
  await supabase.from("users").update({ password: await hashPassword(newPassword) }).eq("id", userId);
  await supabase.from("password_reset_tokens").update({ used: true }).eq("token", token);
  return true;
}

// ── Order decline ─────────────────────────────────────────────

export async function declineOrder(orderId: string, agentId: string): Promise<void> {
  const { data } = await supabase.from("orders").select("declined_by").eq("id", orderId).single();
  const row = data as Record<string,unknown>;
  const existing = (row?.declined_by as string[] ?? []);
  if (!existing.includes(agentId)) {
    await supabase.from("orders").update({ declined_by: [...existing, agentId] }).eq("id", orderId);
  }
}

// ── Supabase Storage for Photos ───────────────────────────────
// Replaces base64-in-DB approach for production photo storage

export async function uploadPhotoToStorage(
  orderId: string,
  filename: string,
  base64Data: string,
): Promise<string> {
  // Extract mime type and data
  const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid base64 data");

  const mimeType = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, "base64");

  const path = `orders/${orderId}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { data: uploadData, error } = await supabase.storage
    .from("photos")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    // Fallback: store as base64 if storage bucket not configured
    console.warn("Storage upload failed, falling back to base64:", error.message);
    return base64Data;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("photos")
    .getPublicUrl(uploadData.path);

  return publicUrl;
}

// ── Wallet System ─────────────────────────────────────────────

export interface WalletTransaction {
  id: string; userId: string; type: string; amount: number;
  balanceAfter: number; description: string; orderId?: string;
  status: string; createdAt: string;
  purpose?: string; receiptUrl?: string | null; orderNumber?: string | null;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data } = await supabase.from("users").select("wallet_balance").eq("id", userId).single();
  return Number((data as Record<string,unknown>)?.wallet_balance ?? 0);
}

function mapWalletTx(r: Record<string, unknown>): WalletTransaction {
  const metadata = (r.metadata as Record<string, unknown>) ?? {};
  return {
    id: r.id as string, userId: r.user_id as string, type: r.type as string,
    amount: Number(r.amount), balanceAfter: Number(r.balance_after),
    description: r.description as string, orderId: r.order_id as string | undefined,
    status: r.status as string, createdAt: r.created_at as string,
    purpose: (r.purpose as string) ?? undefined,
    receiptUrl: (metadata.receiptUrl as string) ?? null,
    orderNumber: (metadata.orderNumber as string) ?? null,
  };
}

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  const { data } = await supabase.from("wallet_transactions")
    .select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map(r => mapWalletTx(r as Record<string, unknown>));
}

export async function addWalletTopup(userId: string, amount: number, description: string): Promise<number> {
  const current = await getWalletBalance(userId);
  const newBalance = current + amount;
  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
  await supabase.from("wallet_transactions").insert({
    user_id: userId, type: "topup", amount, balance_after: newBalance,
    description, status: "confirmed",
  });
  return newBalance;
}

export async function holdWalletFunds(userId: string, orderId: string, amount: number): Promise<boolean> {
  const current = await getWalletBalance(userId);
  // Admin can grant specific vendors an overdraft (walletCreditLimit) so they
  // can keep placing/accepting orders past a $0 balance. Everyone else is
  // still blocked exactly as before (limit defaults to 0).
  const { data: userRow } = await supabase.from("users").select("wallet_credit_limit").eq("id", userId).single();
  const creditLimit = Number((userRow as Record<string, unknown> | null)?.wallet_credit_limit ?? 0);
  if (current + creditLimit < amount) return false; // insufficient funds, even with any admin-granted credit
  const newBalance = current - amount;
  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
  await supabase.from("wallet_transactions").insert({
    user_id: userId, type: "hold", amount, balance_after: newBalance,
    description: `Hold for order ${orderId}`, order_id: orderId, status: "confirmed",
    purpose: "order_hold",
  });
  // The money has actually left the vendor's wallet right now, so the order
  // is paid — not "awaiting payment". (The payout to the agent is a separate
  // thing, still held until the job is completed — see releaseWalletHold.)
  await supabase.from("orders").update({ wallet_hold_amount: amount, payment_status: "confirmed" }).eq("id", orderId);

  // Fire-and-forget: if balance is now low, auto top-up may charge saved card
  void import("@/lib/autoTopup")
    .then(({ maybeRunAutoTopup }) => maybeRunAutoTopup(userId))
    .catch((err) => console.error("[auto-topup] after hold", err));

  return true;
}

export async function releaseWalletHold(orderId: string, agentId: string): Promise<void> {
  // Agent payout is independent from the vendor payment mechanism — it's
  // always the order's committed compensation_amount (the accepted bid
  // price), not tied to how much of the wallet was actually collected from
  // the vendor. wallet_released still guards against double-paying on
  // repeated status flips.
  const { data } = await supabase.from("orders")
    .select("compensation_amount, client_id, wallet_released").eq("id", orderId).single();
  const row = data as Record<string,unknown>;
  if (!row || row.wallet_released) return;
  const payoutAmount = Number(row.compensation_amount ?? 0);
  if (payoutAmount <= 0) return;
  // Credit agent pending payout
  const agent = await getUserById(agentId);
  if (agent) {
    await updateUser(agentId, {
      pendingPayout: (agent.pendingPayout ?? 0) + payoutAmount,
      totalEarnings: (agent.totalEarnings ?? 0) + payoutAmount,
    });
  }
  await supabase.from("orders").update({ wallet_released: true }).eq("id", orderId);
  await supabase.from("wallet_transactions").insert({
    user_id: agentId, type: "release", amount: payoutAmount, balance_after: 0,
    description: `Payment released for order ${orderId}`, order_id: orderId, status: "confirmed",
  });
}

export async function refundWalletHold(userId: string, orderId: string): Promise<void> {
  const { data } = await supabase.from("orders")
    .select("amount_paid, total_price, wallet_released").eq("id", orderId).single();
  const row = data as Record<string,unknown>;
  if (!row || row.wallet_released) return;
  const paidAmount = Number(row.amount_paid ?? 0);
  if (paidAmount <= 0) {
    await supabase.from("orders").update({ wallet_released: true }).eq("id", orderId);
    return;
  }
  const current = await getWalletBalance(userId);
  const newBalance = current + paidAmount;
  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", userId);
  await supabase.from("wallet_transactions").insert({
    user_id: userId, type: "refund", amount: paidAmount, balance_after: newBalance,
    description: `Refund for cancelled order ${orderId}`, order_id: orderId, status: "confirmed",
  });
  await supabase.from("orders").update({
    wallet_released: true, wallet_hold_amount: 0,
    amount_paid: 0, amount_due: Number(row.total_price ?? 0),
    payment_state: "unpaid", invoice_paid: false, overdraft_status: null,
  }).eq("id", orderId);
  await supabase.from("overdraft_requests").update({ status: "rejected" }).eq("order_id", orderId).eq("status", "pending");
}

export async function getAllWalletTopupsPending(): Promise<(WalletTransaction & { userName?: string; userEmail?: string })[]> {
  const { data } = await supabase.from("wallet_transactions")
    .select("*, users!wallet_transactions_user_id_fkey(name,email)")
    .eq("type", "topup").eq("status", "pending").order("created_at");
  return (data ?? []).map(r => {
    const row = r as Record<string,unknown>;
    const user = row.users as { name?: string; email?: string } | null;
    return {
      ...mapWalletTx(row),
      userName: user?.name ?? undefined,
      userEmail: user?.email ?? undefined,
    };
  });
}

// Full wallet + payment log for the admin panel — every transaction of
// every type (topup, hold/payment, release, refund, manual credit/debit),
// newest first, with the vendor's name/email attached.
export async function getAllWalletTransactions(limit = 300): Promise<(WalletTransaction & { userName?: string; userEmail?: string })[]> {
  const { data } = await supabase.from("wallet_transactions")
    .select("*, users!wallet_transactions_user_id_fkey(name,email)")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>;
    const user = row.users as { name?: string; email?: string } | null;
    return { ...mapWalletTx(row), userName: user?.name ?? undefined, userEmail: user?.email ?? undefined };
  });
}

// Lets admin correct a transaction after the fact (wrong amount, typo'd
// note, wrong status). Does NOT touch the vendor's live wallet_balance —
// that's intentional, since replaying every balance-affecting edit safely
// would need a full ledger rebuild; admin should use manualWalletAdjustment
// for anything that needs to actually move money. This is for fixing the
// record itself. Every edit is logged to the audit trail.
export async function updateWalletTransaction(
  id: string,
  fields: { amount?: number; description?: string; status?: string },
  adminId: string,
  adminName: string,
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.amount !== undefined) patch.amount = fields.amount;
  if (fields.description !== undefined) patch.description = fields.description;
  if (fields.status !== undefined) patch.status = fields.status;
  if (Object.keys(patch).length === 0) return;
  await supabase.from("wallet_transactions").update(patch).eq("id", id);
  await logAdminAction({
    actorId: adminId, actorName: adminName, action: "edit_wallet_transaction",
    targetType: "wallet_transaction", targetId: id, details: fields,
  });
}

export async function confirmTopup(transactionId: string): Promise<void> {
  const { data } = await supabase.from("wallet_transactions").select("*").eq("id", transactionId).single();
  const row = data as Record<string,unknown>;
  if (!row || row.status === "confirmed") return;
  const current = await getWalletBalance(row.user_id as string);
  const newBalance = current + Number(row.amount);
  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", row.user_id as string);
  await supabase.from("wallet_transactions").update({ status: "confirmed", balance_after: newBalance }).eq("id", transactionId);

  // This is the actual confirm button behind manual Cash App/Zelle top-ups
  // (admin Wallet tab). Fresh funds just landed — apply them to the
  // vendor's outstanding unpaid/partially-paid orders, oldest first.
  const { settleVendorUnpaidOrders } = await import("@/lib/orderPayments");
  await settleVendorUnpaidOrders(row.user_id as string).catch((err) => console.error("[settle] after confirmTopup", err));
}

// ── Agent Applications ────────────────────────────────────────

export async function saveAgentApplication(app: {
  name: string; email: string; phone: string; zip: string;
  city: string; state: string; experience: string; why: string;
}): Promise<void> {
  await supabase.from("agent_applications").insert(app);
}

export async function getAgentApplications(): Promise<Record<string,unknown>[]> {
  const { data } = await supabase.from("agent_applications")
    .select("*").order("created_at", { ascending: false });
  return (data ?? []) as Record<string,unknown>[];
}

export async function manualWalletAdjustment(opts: {
  userId: string;
  amount: number;
  direction: "credit" | "debit";
  note: string;
  adminId: string;
  adminName: string;
}): Promise<{ newBalance: number }> {
  const amount = Math.round(Number(opts.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");

  const current = await getWalletBalance(opts.userId);
  const signedAmount = opts.direction === "credit" ? amount : -amount;
  // Debits are allowed to take the balance negative, up to the vendor's
  // admin-granted overdraft — the same limit enforced when a bid is
  // accepted — instead of silently clamping at $0 and losing the admin's
  // intended deduction.
  let creditLimit = 0;
  if (opts.direction === "debit") {
    const target = await getUserById(opts.userId);
    creditLimit = target?.walletCreditLimit ?? 0;
    if (current + creditLimit < amount) {
      throw new Error(`Debit exceeds available balance + overdraft limit ($${(current + creditLimit).toFixed(2)} available)`);
    }
  }
  const newBalance = current + signedAmount;

  const txId = `wtx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const label = opts.direction === "credit" ? "Manual credit" : "Manual debit";

  await supabase.from("users").update({ wallet_balance: newBalance }).eq("id", opts.userId);
  await supabase.from("wallet_transactions").insert({
    id: txId,
    user_id: opts.userId,
    type: opts.direction === "credit" ? "topup" : "deduction",
    purpose: "admin_manual",
    amount: amount,
    balance_after: newBalance,
    description: `${label} by ${opts.adminName} - ${opts.note || "no note"}`,
    status: "confirmed",
    confirmed_at: new Date().toISOString(),
    metadata: { admin_id: opts.adminId, admin_name: opts.adminName, note: opts.note ?? "" },
  });

  if (opts.direction === "credit") {
    const { settleVendorUnpaidOrders } = await import("@/lib/orderPayments");
    await settleVendorUnpaidOrders(opts.userId).catch((err) => console.error("[settle] after manual credit", err));
  }

  return { newBalance };
}

// ── Disputes (no cash refunds — reshoot / wallet credit / rejected) ──

export interface Dispute {
  id: string; orderId: string; clientId: string;
  reason: string; description: string; photoUrls: string[];
  status: "open" | "under_review" | "resolved" | "rejected";
  resolution?: "reshoot" | "wallet_credit" | "rejected" | "other" | null;
  resolutionAmount?: number; resolutionNotes?: string;
  resolvedBy?: string | null; resolvedAt?: string | null;
  createdAt: string;
  clientName?: string; clientEmail?: string; orderAddress?: string;
}

function mapDispute(row: Record<string, unknown>): Dispute {
  const client = row.users as Record<string, unknown> | undefined;
  const order = row.orders as Record<string, unknown> | undefined;
  return {
    id: row.id as string, orderId: row.order_id as string, clientId: row.client_id as string,
    reason: row.reason as string, description: row.description as string,
    photoUrls: (row.photo_urls as string[]) ?? [],
    status: row.status as Dispute["status"],
    resolution: row.resolution as Dispute["resolution"],
    resolutionAmount: Number(row.resolution_amount ?? 0),
    resolutionNotes: row.resolution_notes as string,
    resolvedBy: row.resolved_by as string | null,
    resolvedAt: row.resolved_at as string | null,
    createdAt: row.created_at as string,
    clientName: client?.name as string | undefined,
    clientEmail: client?.email as string | undefined,
    orderAddress: order?.address as string | undefined,
  };
}

export async function createDispute(d: { orderId: string; clientId: string; reason: string; description: string; photoUrls?: string[] }): Promise<Dispute> {
  const { data, error } = await supabase.from("disputes").insert({
    order_id: d.orderId, client_id: d.clientId, reason: d.reason,
    description: d.description, photo_urls: d.photoUrls ?? [],
  }).select().single();
  if (error) throw new Error(error.message);
  return mapDispute(data as Record<string, unknown>);
}

export async function getDisputeById(id: string): Promise<Dispute | null> {
  const { data } = await supabase.from("disputes").select("*, users!disputes_client_id_fkey(name,email), orders(address)").eq("id", id).single();
  return data ? mapDispute(data as Record<string, unknown>) : null;
}

export async function getDisputesByClient(clientId: string): Promise<Dispute[]> {
  const { data } = await supabase.from("disputes").select("*, orders(address)").eq("client_id", clientId).order("created_at", { ascending: false });
  return (data ?? []).map(r => mapDispute(r as Record<string, unknown>));
}

export async function getAllDisputes(status?: string): Promise<Dispute[]> {
  let q = supabase.from("disputes").select("*, users!disputes_client_id_fkey(name,email), orders(address)").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map(r => mapDispute(r as Record<string, unknown>));
}

export async function resolveDispute(id: string, resolution: { resolution: "reshoot" | "wallet_credit" | "rejected" | "other"; amount?: number; notes: string; resolvedBy: string }): Promise<Dispute> {
  const dispute = await getDisputeById(id);
  if (!dispute) throw new Error("Dispute not found");

  if (resolution.resolution === "wallet_credit" && resolution.amount && resolution.amount > 0) {
    await addWalletTopup(dispute.clientId, resolution.amount, `Dispute resolution credit — ${id}`);
  }

  const { data, error } = await supabase.from("disputes").update({
    status: resolution.resolution === "rejected" ? "rejected" : "resolved",
    resolution: resolution.resolution,
    resolution_amount: resolution.amount ?? 0,
    resolution_notes: resolution.notes,
    resolved_by: resolution.resolvedBy,
    resolved_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return mapDispute(data as Record<string, unknown>);
}

export async function setDisputeStatus(id: string, status: "under_review"): Promise<void> {
  await supabase.from("disputes").update({ status }).eq("id", id);
}

// ── Reviews (client rates a completed job) ─────────────────────

export interface Review {
  id: string; orderId: string; clientId: string; agentId: string;
  rating: number; comment: string; createdAt: string;
  clientName?: string;
}

export async function createReview(r: { orderId: string; clientId: string; agentId: string; rating: number; comment?: string }): Promise<Review> {
  const { data, error } = await supabase.from("reviews").insert({
    order_id: r.orderId, client_id: r.clientId, agent_id: r.agentId,
    rating: r.rating, comment: r.comment ?? "",
  }).select().single();
  if (error) throw new Error(error.message);

  // Recompute agent's average rating
  const { data: allReviews } = await supabase.from("reviews").select("rating").eq("agent_id", r.agentId);
  if (allReviews?.length) {
    const avg = allReviews.reduce((sum, row) => sum + Number((row as Record<string, unknown>).rating), 0) / allReviews.length;
    await supabase.from("users").update({ rating: Math.round(avg * 10) / 10 }).eq("id", r.agentId);
  }

  const row = data as Record<string, unknown>;
  return { id: row.id as string, orderId: row.order_id as string, clientId: row.client_id as string, agentId: row.agent_id as string, rating: row.rating as number, comment: row.comment as string, createdAt: row.created_at as string };
}

export async function getReviewByOrder(orderId: string): Promise<Review | null> {
  const { data } = await supabase.from("reviews").select("*").eq("order_id", orderId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { id: row.id as string, orderId: row.order_id as string, clientId: row.client_id as string, agentId: row.agent_id as string, rating: row.rating as number, comment: row.comment as string, createdAt: row.created_at as string };
}

export async function getReviewsForAgent(agentId: string): Promise<Review[]> {
  const { data } = await supabase.from("reviews").select("*, users!reviews_client_id_fkey(name)").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map(r => {
    const row = r as Record<string, unknown>;
    const client = row.users as Record<string, unknown> | undefined;
    return { id: row.id as string, orderId: row.order_id as string, clientId: row.client_id as string, agentId: row.agent_id as string, rating: row.rating as number, comment: row.comment as string, createdAt: row.created_at as string, clientName: client?.name as string | undefined };
  });
}

// ── Admin audit log ─────────────────────────────────────────────

export async function logAdminAction(entry: { actorId: string; actorName: string; action: string; targetType?: string; targetId?: string; details?: Record<string, unknown> }): Promise<void> {
  await supabase.from("audit_log").insert({
    actor_id: entry.actorId, actor_name: entry.actorName, action: entry.action,
    target_type: entry.targetType ?? "", target_id: entry.targetId ?? "",
    details: entry.details ?? {},
  });
}

export async function getAuditLog(limit = 200): Promise<Record<string, unknown>[]> {
  const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Record<string, unknown>[];
}

// ── Photo Submissions (agent open form → admin inbox) ────────
export interface PhotoSubmission {
  id: string; agentId: string; agentName?: string;
  orderId: string | null; serviceName: string;
  photos: { label: string; filename: string; url: string }[];
  status: "pending" | "sent" | "dismissed";
  createdAt: string;
}

function mapSubmission(row: Record<string, unknown>): PhotoSubmission {
  let photos: PhotoSubmission["photos"] = [];
  try { photos = typeof row.photos === "string" ? JSON.parse(row.photos as string) : (row.photos as PhotoSubmission["photos"]) ?? []; } catch { photos = []; }
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    orderId: (row.order_id as string) ?? null,
    serviceName: (row.service_name as string) ?? "",
    photos,
    status: (row.status as PhotoSubmission["status"]) ?? "pending",
    createdAt: row.created_at as string,
  };
}

export async function createPhotoSubmission(sub: {
  agentId: string; orderId?: string | null; serviceName: string;
  photos: { label: string; filename: string; url: string }[];
}): Promise<PhotoSubmission> {
  const id = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("photo_submissions").insert({
    id, agent_id: sub.agentId, order_id: sub.orderId ?? null,
    service_name: sub.serviceName, photos: JSON.stringify(sub.photos), status: "pending",
  }).select().single();
  if (error) throw new Error(error.message);
  return mapSubmission(data as Record<string, unknown>);
}

export async function getPhotoSubmissions(agentId?: string): Promise<PhotoSubmission[]> {
  let q = supabase.from("photo_submissions").select("*").order("created_at", { ascending: false });
  if (agentId) q = q.eq("agent_id", agentId);
  const { data } = await q;
  const subs = ((data ?? []) as Record<string, unknown>[]).map(mapSubmission);
  // attach agent names
  const ids = [...new Set(subs.map(s => s.agentId))];
  if (ids.length) {
    const { data: users } = await supabase.from("users").select("id, name").in("id", ids);
    const names: Record<string,string> = {};
    for (const u of (users ?? []) as Record<string, unknown>[]) names[u.id as string] = u.name as string;
    subs.forEach(s => { s.agentName = names[s.agentId]; });
  }
  return subs;
}

export async function getPhotoSubmissionById(id: string): Promise<PhotoSubmission | null> {
  const { data } = await supabase.from("photo_submissions").select("*").eq("id", id).single();
  return data ? mapSubmission(data as Record<string, unknown>) : null;
}

export async function updatePhotoSubmissionStatus(id: string, status: "sent" | "dismissed"): Promise<void> {
  await supabase.from("photo_submissions").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
}
