/**
 * PropertyDataService
 * Wraps RentCast API for property lookup by address.
 */
import { ENV } from "../_core/env";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

export interface PropertyLookupResult {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  squareFootage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  yearBuilt: number | null;
  lotSize: number | null;
  estimatedValue: number | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  isEstimate: boolean;
}

export async function lookupPropertyByAddress(address: string): Promise<PropertyLookupResult | null> {
  if (!ENV.rentcastApiKey) throw new Error("RENTCAST_API_KEY not configured");

  const url = `${RENTCAST_BASE}/properties?address=${encodeURIComponent(address)}&limit=1`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": ENV.rentcastApiKey, Accept: "application/json" },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RentCast property lookup failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  const props = Array.isArray(data) ? data : data.properties ?? [];
  if (!props.length) return null;

  const p = props[0];
  return {
    address: p.formattedAddress ?? p.addressLine1 ?? address,
    city: p.city ?? "",
    state: p.state ?? "",
    zipCode: p.zipCode ?? "",
    latitude: p.latitude ?? 0,
    longitude: p.longitude ?? 0,
    squareFootage: p.squareFootage ?? null,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    propertyType: p.propertyType ?? null,
    yearBuilt: p.yearBuilt ?? null,
    lotSize: p.lotSize ?? null,
    estimatedValue: p.price ?? p.estimatedValue ?? null,
    lastSalePrice: p.lastSalePrice ?? null,
    lastSaleDate: p.lastSaleDate ?? null,
    isEstimate: true,
  };
}

export interface ComparableSalesSearchInput {
  latitude: number;
  longitude: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  radiusMiles?: number;
  daysBack?: number;
  limit?: number;
}

export interface RawComparable {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType: string;
  price: number;
  listedDate?: string;
  removedDate?: string;
  lastSeenDate?: string;
  daysOnMarket?: number;
  // For sold comps
  soldDate?: string;
  soldPrice?: number;
  distance?: number;
  photoUrl?: string;
}

export async function searchComparableSales(input: ComparableSalesSearchInput): Promise<RawComparable[]> {
  if (!ENV.rentcastApiKey) throw new Error("RENTCAST_API_KEY not configured");

  const { latitude, longitude, squareFootage, bedrooms, bathrooms, propertyType } = input;
  const radiusMiles = input.radiusMiles ?? 1;
  const daysBack = input.daysBack ?? 365; // widen to 1 year by default for better coverage
  const compCount = input.limit ?? 20;

  // Use the /avm/value endpoint which returns comparable sold listings
  // This is the correct RentCast endpoint for sold comps (not /sales which doesn't exist)
  const avmParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    propertyType,
    bedrooms: String(bedrooms),
    bathrooms: String(bathrooms),
    squareFootage: String(squareFootage),
    maxRadius: String(radiusMiles),
    daysOld: String(daysBack),
    compCount: String(Math.min(compCount, 25)), // max 25 per API docs
  });

  const avmUrl = `${RENTCAST_BASE}/avm/value?${avmParams}`;
  const res = await fetch(avmUrl, {
    headers: { "X-Api-Key": ENV.rentcastApiKey, Accept: "application/json" },
  });

  if (res.status === 404) {
    // Try again with a wider radius before giving up
    if (radiusMiles < 5) {
      return searchComparableSales({ ...input, radiusMiles: 5, daysBack: 730 });
    }
    return [];
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`RentCast AVM value estimate failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  // /avm/value returns { price, priceRangeLow, priceRangeHigh, subjectProperty, comparables: [...] }
  const comparables: any[] = data.comparables ?? [];

  if (comparables.length === 0 && radiusMiles < 5) {
    // Retry with wider radius and longer lookback if no results
    return searchComparableSales({ ...input, radiusMiles: 5, daysBack: 730 });
  }

  // Map to RawComparable shape — AVM comparables use 'price' for sold price and 'correlation' for similarity
  return comparables.map((c: any) => ({
    id: c.id ?? "",
    formattedAddress: c.formattedAddress ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zipCode: c.zipCode ?? "",
    latitude: c.latitude ?? 0,
    longitude: c.longitude ?? 0,
    squareFootage: c.squareFootage ?? squareFootage,
    bedrooms: c.bedrooms ?? bedrooms,
    bathrooms: c.bathrooms ?? bathrooms,
    yearBuilt: c.yearBuilt,
    lotSize: c.lotSize,
    propertyType: c.propertyType ?? propertyType,
    price: c.price ?? 0,
    soldPrice: c.price ?? 0,
    soldDate: c.lastSaleDate ?? c.listedDate ?? new Date().toISOString().split("T")[0],
    distance: c.distance ?? calcDistanceMiles(latitude, longitude, c.latitude ?? latitude, c.longitude ?? longitude),
    photoUrl: c.photoUrl,
  }));
}

function calcDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
