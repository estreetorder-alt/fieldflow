import { supabase } from "./supabase";

// ── Types (mirrors store.ts) ──────────────────────────────────

export interface User {
  id: string; email: string; password: string;
  role: "admin" | "agent" | "client";
  name: string; phone: string; company?: string; createdAt?: string;
  available?: boolean; rating?: number; bio?: string;
  coverageZone?: string; vehicle?: string;
  totalEarnings?: number; pendingPayout?: number; completedJobs?: number;
}

export interface Bid {
  id: string; orderId: string; agentId: string;
  amount: number; message: string; placedAt: string;
  placedByAdmin?: boolean; status: "pending" | "accepted" | "rejected";
  agentName?: string; agentRating?: number | null;
}

export interface Photo {
  id: string; orderId: string; filename: string; url: string;
  description: string; uploadedAt: string; selectedByClient: boolean;
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
  bids: Bid[];
  client?: { name: string; email: string } | null;
  agent?: { name: string; rating?: number } | null;
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
    bids,
    photos,
    statusHistory: history,
    client: client ?? null,
    agent: agent ?? null,
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
  }).select().single();
  if (error) throw new Error(error.message);
  return mapUser(data as Record<string, unknown>);
}

export async function updateUser(id: string, fields: Partial<User>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (fields.available !== undefined) patch.available = fields.available;
  if (fields.rating !== undefined) patch.rating = fields.rating;
  if (fields.bio !== undefined) patch.bio = fields.bio;
  if (fields.coverageZone !== undefined) patch.coverage_zone = fields.coverageZone;
  if (fields.vehicle !== undefined) patch.vehicle = fields.vehicle;
  if (fields.phone !== undefined) patch.phone = fields.phone;
  if (fields.pendingPayout !== undefined) patch.pending_payout = fields.pendingPayout;
  if (fields.totalEarnings !== undefined) patch.total_earnings = fields.totalEarnings;
  if (fields.completedJobs !== undefined) patch.completed_jobs = fields.completedJobs;
  await supabase.from("users").update(patch).eq("id", id);
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
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  return enrichOrders((data ?? []) as Record<string, unknown>[]);
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
}): Promise<Bid> {
  const id = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("bids").insert({
    id,
    order_id: bid.orderId,
    agent_id: bid.agentId,
    amount: bid.amount,
    message: bid.message,
    placed_by_admin: bid.placedByAdmin,
    status: "pending",
  }).select().single();
  if (error) throw new Error(error.message);
  return mapBid(data as Record<string, unknown>);
}

export async function updateBidStatus(bidId: string, status: "accepted" | "rejected"): Promise<void> {
  await supabase.from("bids").update({ status }).eq("id", bidId);
}

export async function rejectOtherBids(orderId: string, acceptedBidId: string): Promise<void> {
  await supabase.from("bids").update({ status: "rejected" })
    .eq("order_id", orderId).neq("id", acceptedBidId);
}

// ── Photos ────────────────────────────────────────────────────

export async function addPhoto(photo: {
  orderId: string; filename: string; url: string; description: string;
}): Promise<Photo> {
  const id = `ph-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("photos").insert({
    id,
    order_id: photo.orderId,
    filename: photo.filename,
    url: photo.url,
    description: photo.description,
    selected_by_client: false,
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
