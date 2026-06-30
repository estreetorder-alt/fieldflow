// Legacy in-memory store — kept for reference only
// All data now lives in Supabase (lib/db.ts)
// This file is intentionally minimal

export interface Photo { id: string; filename: string; url: string; description: string; uploadedAt: string; selectedByClient: boolean; }
export interface User { id: string; email: string; password: string; role: "admin"|"agent"|"client"; name: string; phone: string; company?: string; createdAt?: string; available?: boolean; rating?: number; bio?: string; coverageZone?: string; vehicle?: string; totalEarnings?: number; pendingPayout?: number; completedJobs?: number; }
export interface StatusEvent { status: string; timestamp: string; note: string; }
export type TurnaroundTier = "standard"|"rush_24hr"|"rush_6hr";
export interface Bid { id: string; orderId: string; agentId: string; amount: number; message: string; placedAt: string; placedByAdmin?: boolean; status: "pending"|"accepted"|"rejected"; }
export interface Order { id: string; address: string; status: "pending"|"in_progress"|"completed"|"cancelled"; clientId: string; assignedAgentId: string|null; totalPrice: number; compensationAmount: number; serviceType: string; turnaroundTier: TurnaroundTier; notes: string; customizeNotes: string; photos: Photo[]; photoExpiresAt: string|null; createdAt: string; statusHistory: StatusEvent[]; offerSentAt: string|null; offerAcceptedAt: string|null; bulkBatchId: string|null; invoicePaid: boolean; bids: Bid[]; acceptedBidId: string|null; }
export interface PricingConfig { id: string; serviceType: string; basePrice: number; urgencyMultiplier: number; active: boolean; }
export interface EmailLog { timestamp: string; type: string; to: string; subject: string; body?: string; }

interface Store { users: User[]; orders: Order[]; pricingConfig: PricingConfig[]; emailLog: EmailLog[]; }

const globalWithStore = global as typeof globalThis & { _fieldServiceStore?: Store };
if (!globalWithStore._fieldServiceStore) {
  globalWithStore._fieldServiceStore = { users: [], orders: [], pricingConfig: [], emailLog: [] };
}
export const store = globalWithStore._fieldServiceStore;
