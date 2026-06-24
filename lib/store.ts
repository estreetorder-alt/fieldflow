export interface Photo {
  id: string; filename: string; url: string; description: string;
  uploadedAt: string; selectedByClient: boolean;
}

export interface User {
  id: string; email: string; password: string;
  role: "admin" | "agent" | "client";
  name: string; phone: string; company?: string; createdAt?: string;
  available?: boolean; rating?: number; bio?: string;
  coverageZone?: string; vehicle?: string;
  totalEarnings?: number; pendingPayout?: number; completedJobs?: number;
}

export interface StatusEvent { status: string; timestamp: string; note: string; }
export type TurnaroundTier = "standard" | "rush_24hr" | "rush_6hr";

export interface Bid {
  id: string;
  orderId: string;
  agentId: string;
  amount: number;          // agent's proposed compensation
  message: string;
  placedAt: string;
  placedByAdmin?: boolean; // true when admin placed on agent's behalf
  status: "pending" | "accepted" | "rejected";
}

export interface Order {
  id: string; address: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  clientId: string; assignedAgentId: string | null;
  totalPrice: number; compensationAmount: number;
  serviceType: string; turnaroundTier: TurnaroundTier;
  notes: string; customizeNotes: string; photos: Photo[];
  photoExpiresAt: string | null; createdAt: string;
  statusHistory: StatusEvent[];
  offerSentAt: string | null; offerAcceptedAt: string | null;
  bulkBatchId: string | null; invoicePaid: boolean;
  bids: Bid[];           // all bids on this order
  acceptedBidId: string | null; // which bid was accepted
}

export interface PricingConfig {
  id: string; serviceType: string; basePrice: number;
  urgencyMultiplier: number; active: boolean;
}

export interface EmailLog {
  timestamp: string; type: string; to: string; subject: string; body?: string;
}

interface Store {
  users: User[];
  orders: Order[];
  pricingConfig: PricingConfig[];
  emailLog: EmailLog[];
}

const globalWithStore = global as typeof globalThis & { _fieldServiceStore?: Store };

if (!globalWithStore._fieldServiceStore) {
  const now = new Date();
  const d = (days: number, h = 0) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - days);
    dt.setHours(h);
    return dt.toISOString();
  };
  const expire30 = (completedAt: string) => {
    const dt = new Date(completedAt);
    dt.setDate(dt.getDate() + 30);
    return dt.toISOString();
  };

  globalWithStore._fieldServiceStore = {
    users: [
      { id: "user-1", email: "admin@test.com", password: "admin123", role: "admin", name: "Admin User", phone: "555-0100", createdAt: d(90) },
      { id: "user-2", email: "agent@test.com", password: "agent123", role: "agent", name: "Jane Smith", phone: "555-0101", createdAt: d(60), available: true, rating: 4.8, bio: "Experienced field agent specializing in residential inspections.", coverageZone: "Chicago, IL", vehicle: "2022 Honda CR-V", totalEarnings: 2840, pendingPayout: 340, completedJobs: 47 },
      { id: "user-3", email: "agent2@test.com", password: "agent123", role: "agent", name: "Tom Field", phone: "555-0102", createdAt: d(55), available: false, rating: 4.5, bio: "Professional photographer with 5 years of real estate experience.", coverageZone: "Springfield, IL", vehicle: "2020 Ford F-150", totalEarnings: 1620, pendingPayout: 180, completedJobs: 28 },
      { id: "user-4", email: "client@test.com", password: "client123", role: "client", name: "Bob Johnson", phone: "555-0103", company: "Johnson Realty LLC", createdAt: d(45) },
      { id: "user-5", email: "client2@test.com", password: "client123", role: "client", name: "Alice Brown", phone: "555-0104", company: "Midwest Property Group", createdAt: d(30) },
    ],
    orders: [
      {
        id: "ord-1", address: "123 Main St, Springfield, IL 62701", status: "pending",
        clientId: "user-4", assignedAgentId: null,
        totalPrice: 100, compensationAmount: 60, serviceType: "inspection", turnaroundTier: "standard",
        notes: "Please check the foundation", customizeNotes: "", photos: [], photoExpiresAt: null,
        createdAt: d(20), offerSentAt: d(20, 10), offerAcceptedAt: null, bulkBatchId: null, invoicePaid: false,
        bids: [], acceptedBidId: null,
        statusHistory: [{ status: "pending", timestamp: d(20), note: "Order submitted by client" }],
      },
      {
        id: "ord-2", address: "456 Oak Ave, Chicago, IL 60601", status: "in_progress",
        clientId: "user-4", assignedAgentId: "user-2",
        totalPrice: 225, compensationAmount: 140, serviceType: "survey", turnaroundTier: "rush_24hr",
        notes: "Urgent pre-sale survey needed", customizeNotes: "", photos: [], photoExpiresAt: null,
        createdAt: d(16), offerSentAt: d(16, 10), offerAcceptedAt: d(16, 11), bulkBatchId: null, invoicePaid: false,
        bids: [{ id: "bid-1", orderId: "ord-2", agentId: "user-2", amount: 140, message: "I can do this tomorrow morning.", placedAt: d(16, 9), status: "accepted", placedByAdmin: false }],
        acceptedBidId: "bid-1",
        statusHistory: [
          { status: "pending", timestamp: d(16), note: "Order submitted by client" },
          { status: "in_progress", timestamp: d(16, 14), note: "Bid accepted — assigned to Jane Smith" },
        ],
      },
      {
        id: "ord-3", address: "789 Pine Rd, Naperville, IL 60540", status: "completed",
        clientId: "user-5", assignedAgentId: "user-2",
        totalPrice: 100, compensationAmount: 60, serviceType: "inspection", turnaroundTier: "standard",
        notes: "", customizeNotes: "", photoExpiresAt: expire30(d(10)),
        photos: [
          { id: "ph-1", filename: "front-elevation.jpg", url: "", description: "Front elevation view", uploadedAt: d(10, 16), selectedByClient: false },
          { id: "ph-2", filename: "rear-elevation.jpg", url: "", description: "Rear elevation and yard", uploadedAt: d(10, 16), selectedByClient: false },
          { id: "ph-3", filename: "basement.jpg", url: "", description: "Basement foundation check", uploadedAt: d(10, 16), selectedByClient: true },
        ],
        createdAt: d(11), offerSentAt: d(11, 10), offerAcceptedAt: d(11, 11), bulkBatchId: null, invoicePaid: true,
        bids: [{ id: "bid-2", orderId: "ord-3", agentId: "user-2", amount: 60, message: "Available immediately.", placedAt: d(11, 9), status: "accepted", placedByAdmin: false }],
        acceptedBidId: "bid-2",
        statusHistory: [
          { status: "pending", timestamp: d(11), note: "Order submitted by client" },
          { status: "in_progress", timestamp: d(11, 14), note: "Bid accepted — assigned to Jane Smith" },
          { status: "completed", timestamp: d(10, 16), note: "Job completed, 3 photos uploaded" },
        ],
      },
      {
        id: "ord-4", address: "321 Elm St, Evanston, IL 60201", status: "pending",
        clientId: "user-5", assignedAgentId: null,
        totalPrice: 350, compensationAmount: 228, serviceType: "assessment", turnaroundTier: "rush_6hr",
        notes: "Pre-sale full assessment", customizeNotes: "Please photograph the HVAC system, roof access hatch, and all structural beams visible in the basement.",
        photos: [], photoExpiresAt: null,
        createdAt: d(5), offerSentAt: d(5, 10), offerAcceptedAt: null, bulkBatchId: null, invoicePaid: false,
        bids: [], acceptedBidId: null,
        statusHistory: [{ status: "pending", timestamp: d(5), note: "Order submitted by client" }],
      },
    ],
    pricingConfig: [
      { id: "price-1", serviceType: "inspection", basePrice: 100, urgencyMultiplier: 1.5, active: true },
      { id: "price-2", serviceType: "survey", basePrice: 150, urgencyMultiplier: 1.5, active: true },
      { id: "price-3", serviceType: "assessment", basePrice: 200, urgencyMultiplier: 1.3, active: true },
      { id: "price-4", serviceType: "bpo_photography", basePrice: 120, urgencyMultiplier: 1.4, active: true },
      { id: "price-5", serviceType: "occupancy_check", basePrice: 80, urgencyMultiplier: 1.6, active: true },
      { id: "price-6", serviceType: "construction_inspection", basePrice: 175, urgencyMultiplier: 1.3, active: true },
      { id: "price-7", serviceType: "disaster_inspection", basePrice: 250, urgencyMultiplier: 1.2, active: true },
      { id: "price-8", serviceType: "custom", basePrice: 150, urgencyMultiplier: 1.4, active: true },
    ],
    emailLog: [],
  };
}

export const store = globalWithStore._fieldServiceStore;
