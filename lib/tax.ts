/**
 * WA DOR Tax Rate Lookup
 *
 * Uses the Washington State Department of Revenue address-based rate API.
 * https://webgis.dor.wa.gov/webapi/addressrates.aspx?output=json
 *
 * Fallback: 9.2% (Monroe, WA default rate)
 */

const DOR_BASE = "https://webgis.dor.wa.gov/webapi/addressrates.aspx";
const FETCH_TIMEOUT = 5_000;
const FALLBACK_RATE = 0.092;

interface DorRateResponse {
  rate: number;
  // The API returns additional fields (loccode, code, etc.) but we only need rate
}

export async function getTaxRate(params: {
  address: string;
  city?: string;
  zip?: string;
}): Promise<{ rate: number; source: "wa_dor" | "fallback" }> {
  const url = new URL(DOR_BASE);
  url.searchParams.set("output", "json");
  url.searchParams.set("addr", params.address);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.zip) url.searchParams.set("zip", params.zip);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Tax Lookup] DOR returned ${res.status}, using fallback`);
      return { rate: FALLBACK_RATE, source: "fallback" };
    }

    const data = (await res.json()) as DorRateResponse;

    if (typeof data.rate !== "number" || data.rate <= 0) {
      console.warn("[Tax Lookup] DOR returned invalid rate, using fallback");
      return { rate: FALLBACK_RATE, source: "fallback" };
    }

    // DOR returns rate as a decimal (e.g. 0.092 for 9.2%)
    return { rate: data.rate, source: "wa_dor" };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[Tax Lookup] DOR failed: ${msg}, using fallback`);
    return { rate: FALLBACK_RATE, source: "fallback" };
  }
}
