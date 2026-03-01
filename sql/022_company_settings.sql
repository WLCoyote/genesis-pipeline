-- 022: Seed company_info and proposal_terms settings
-- Run once. Upsert so it's safe to re-run.

INSERT INTO settings (key, value) VALUES
  ('company_info', '{
    "company_name": "Genesis Heating, Cooling & Refrigeration",
    "phone": "(425) 261-9095",
    "email": "info@genesishvacr.com",
    "website": "genesishvacr.com",
    "address": "Monroe, WA",
    "license_number": "GENESRH862OP",
    "license_state": "WA"
  }'::jsonb),
  ('proposal_terms', '{
    "authorization": "By signing this proposal, the customer authorizes Genesis Heating, Cooling & Refrigeration to perform the work described above. Prices are valid for 60 days from the proposal date. Any changes to the scope of work may result in adjusted pricing.",
    "labor_warranty": "All labor is warranted for one (1) year from the date of installation unless a separate labor warranty is included above. Equipment warranties are provided by the manufacturer per their published terms.",
    "financing": "If financing is selected, it is provided by Synchrony Bank and is subject to credit approval. Monthly payments and terms are estimates and may vary based on the final approved amount.",
    "cancellation": "Cancellation must be made in writing within 3 business days of signing. After 3 business days, a cancellation fee may apply for materials already ordered."
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
