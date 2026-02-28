/**
 * SHARED_TYPES.ts
 * 
 * Genesis Software Ecosystem — Shared API Response Types
 * 
 * These types enforce GENESIS_CONVENTIONS.md Section 4 (Shared Field Names).
 * They apply ONLY to API responses — not internal database schemas.
 * 
 * Every Genesis app that exposes cross-app endpoints should import from this file
 * or mirror these types exactly. The Command Layer agent expects these shapes.
 * 
 * Last updated: February 2026
 */

// ─────────────────────────────────────────────
// Response Envelope (Conventions Section 3)
// ─────────────────────────────────────────────

export type AppIdentifier = 'pipeline' | 'inventory' | 'inspect' | 'os' | 'guru' | 'intel' | 'agent';

export interface ApiMeta {
  app: AppIdentifier;
  version: string;         // e.g., "1.0"
  timestamp: string;       // ISO 8601 UTC — e.g., "2026-02-20T15:30:00Z"
}

export interface ApiError {
  code: ErrorCode;
  message: string;         // Human-readable
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}

// Standard error codes (Conventions Section 7)
export type ErrorCode =
  | 'BAD_REQUEST'          // 400
  | 'UNAUTHORIZED'         // 401
  | 'FORBIDDEN'            // 403
  | 'NOT_FOUND'            // 404
  | 'CONFLICT'             // 409
  | 'RATE_LIMITED'         // 429
  | 'INTERNAL_ERROR'       // 500
  | 'SERVICE_UNAVAILABLE'  // 503
  | string;                // App-specific codes allowed (e.g., 'INSPECTION_NOT_COMPLETE')


// ─────────────────────────────────────────────
// Shared Field Types (Conventions Section 4)
// ─────────────────────────────────────────────

// People & Users
export interface UserFields {
  user_email: string;                // Universal user identifier
  user_name: string;                 // Full display name
  user_role: string;                 // App-specific role (admin, tech, supervisor, etc.)
}

export interface CustomerFields {
  customer_name: string;             // End customer, not a Genesis employee
  customer_email?: string;
  customer_phone?: string;           // Includes country code: +14252619095
  customer_address?: string;         // Single formatted string
}

// Jobs & Work
export interface JobFields {
  hcp_job_number: string | null;     // Housecall Pro identifier. Null if not linked.
  job_date?: string;                 // ISO 8601 date: "2026-02-20"
  job_address?: string;              // Service location
}

// Equipment
export interface EquipmentFields {
  equipment_make?: string;           // e.g., "American Standard", "Mitsubishi"
  equipment_model?: string;          // Manufacturer model number
  equipment_serial?: string;
  system_type?: string;              // e.g., "conventional", "ductless", "refrigeration"
}

// Status & Scoring
export interface StatusFields {
  score_pct?: number;                // Integer 0-100
  status?: string;                   // App-specific status value
  created_at: string;                // ISO 8601 UTC
  updated_at: string;                // ISO 8601 UTC
}

// Lists with counts (Conventions Section 11 — agent expects total_count)
export interface PaginatedList<T> {
  items: T[];
  total_count: number;
}


// ─────────────────────────────────────────────
// Date Range Query Params (Conventions Section 11)
// ─────────────────────────────────────────────

export interface DateRangeParams {
  start_date?: string;               // ISO 8601
  end_date?: string;                 // ISO 8601
}


// ─────────────────────────────────────────────
// App-Specific Response Types
// ─────────────────────────────────────────────
// These are starter types based on the Command Layer tool inventory.
// Each app owns and extends these as endpoints are built.

// Pipeline
export interface PipelineStats {
  pipeline_value: number;
  count_by_status: Record<string, number>;
  close_rate_mtd: number;            // Percentage 0-100
  total_count: number;
}

export interface StaleEstimate {
  estimate_id: string;
  hcp_job_number: string | null;
  customer_name: string;
  total_amount: number;
  days_since_activity: number;
  last_activity: string;             // ISO 8601 UTC
  status: string;
}

export interface CommissionSummary {
  comfort_pro_name: string;
  comfort_pro_email: string;
  period: string;                    // e.g., "2026-02"
  total_commission: number;
  jobs_count: number;
  tier: string;                      // App-specific tier label
}

// Inspection
export interface InspectionStats {
  total_inspections: number;
  pass_rate: number;                 // Percentage 0-100
  common_failures: Array<{
    finding: string;
    count: number;
  }>;
}

export interface InspectionFinding {
  inspection_id: string;
  hcp_job_number: string | null;
  score_pct: number;
  verdict_status: string;
  findings: Array<{
    category: string;
    item: string;
    result: string;
    notes?: string;
  }>;
}

// Inventory
export interface InventorySummary {
  total_items: number;
  low_stock_count: number;
  low_stock_items: Array<{
    item_name: string;
    current_quantity: number;
    reorder_threshold: number;
  }>;
}

export interface VehicleInventory {
  vehicle_id: string;
  vehicle_name: string;              // e.g., "Van 1 - Mike"
  items: Array<{
    item_name: string;
    quantity: number;
  }>;
  total_count: number;
}
