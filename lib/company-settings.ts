/**
 * Helper to fetch company info and proposal terms from the settings table.
 * Used by PDF generation, email templates, and the proposal page.
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface CompanyInfo {
  company_name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  license_number: string;
  license_state: string;
}

export interface ProposalTerms {
  authorization: string;
  labor_warranty: string;
  financing: string;
  cancellation: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  company_name: "Genesis Heating, Cooling & Refrigeration",
  phone: "(425) 261-9095",
  email: "info@genesishvacr.com",
  website: "genesishvacr.com",
  address: "Monroe, WA",
  license_number: "GENESRH862OP",
  license_state: "WA",
};

const DEFAULT_PROPOSAL_TERMS: ProposalTerms = {
  authorization:
    "By signing this proposal, the customer authorizes Genesis Heating, Cooling & Refrigeration to perform the work described above. Prices are valid for 60 days from the proposal date. Any changes to the scope of work may result in adjusted pricing.",
  labor_warranty:
    "All labor is warranted for one (1) year from the date of installation unless a separate labor warranty is included above. Equipment warranties are provided by the manufacturer per their published terms.",
  financing:
    "If financing is selected, it is provided by Synchrony Bank and is subject to credit approval. Monthly payments and terms are estimates and may vary based on the final approved amount.",
  cancellation:
    "Cancellation must be made in writing within 3 business days of signing. After 3 business days, a cancellation fee may apply for materials already ordered.",
};

export async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "company_info")
      .single();

    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_COMPANY_INFO, ...(data.value as Partial<CompanyInfo>) };
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_COMPANY_INFO;
}

export async function getProposalTerms(): Promise<ProposalTerms> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "proposal_terms")
      .single();

    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_PROPOSAL_TERMS, ...(data.value as Partial<ProposalTerms>) };
    }
  } catch {
    // Fall through to defaults
  }
  return DEFAULT_PROPOSAL_TERMS;
}
