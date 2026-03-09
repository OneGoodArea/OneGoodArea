interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  parliamentary_constituency: string;
  region: string;
  country: string;
  admin_ward: string;
  parish: string;
  lsoa: string;
  msoa: string;
  codes?: {
    lsoa?: string;
    msoa?: string;
    [key: string]: string | undefined | null;
  };
}

interface PlaceResult {
  name: string;
  latitude: number;
  longitude: number;
  county: string;
  district: string;
  region: string;
  country: string;
}

export interface GeocodedArea {
  query: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  region: string;
  ward: string;
  constituency: string;
  country: string;
  lsoa: string;
  msoa: string;
}

const POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

export async function geocodeArea(query: string): Promise<GeocodedArea | null> {
  // Try as postcode first
  if (POSTCODE_REGEX.test(query.trim())) {
    return geocodePostcode(query.trim());
  }

  // Try as place name
  return geocodePlace(query.trim());
}

async function geocodePostcode(postcode: string): Promise<GeocodedArea | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 200 || !data.result) return null;

    const r: PostcodeResult = data.result;
    return {
      query: postcode,
      latitude: r.latitude,
      longitude: r.longitude,
      admin_district: r.admin_district || "",
      region: r.region || "",
      ward: r.admin_ward || "",
      constituency: r.parliamentary_constituency || "",
      country: r.country || "",
      lsoa: r.codes?.lsoa || r.lsoa || "",
      msoa: r.codes?.msoa || r.msoa || "",
    };
  } catch {
    return null;
  }
}

async function geocodePlace(query: string): Promise<GeocodedArea | null> {
  try {
    // First try postcodes autocomplete in case it's a partial postcode
    const autocompleteRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(query)}/autocomplete`);
    if (autocompleteRes.ok) {
      const autocompleteData = await autocompleteRes.json();
      if (autocompleteData.result && autocompleteData.result.length > 0) {
        return geocodePostcode(autocompleteData.result[0]);
      }
    }

    // Try place search
    const res = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(query)}&limit=1`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 200 || !data.result || data.result.length === 0) return null;

    const r: PlaceResult = data.result[0];

    // Now reverse geocode to get full postcode data
    const reverseRes = await fetch(
      `https://api.postcodes.io/postcodes?lon=${r.longitude}&lat=${r.latitude}&limit=1`
    );

    if (reverseRes.ok) {
      const reverseData = await reverseRes.json();
      if (reverseData.result && reverseData.result.length > 0) {
        const p = reverseData.result[0];
        return {
          query,
          latitude: r.latitude,
          longitude: r.longitude,
          admin_district: p.admin_district || r.district || "",
          region: p.region || r.region || "",
          ward: p.admin_ward || "",
          constituency: p.parliamentary_constituency || "",
          country: p.country || r.country || "",
          lsoa: p.codes?.lsoa || p.lsoa || "",
          msoa: p.codes?.msoa || p.msoa || "",
        };
      }
    }

    return {
      query,
      latitude: r.latitude,
      longitude: r.longitude,
      admin_district: r.district || "",
      region: r.region || "",
      ward: "",
      constituency: "",
      country: r.country || "",
      lsoa: "",
      msoa: "",
    };
  } catch {
    return null;
  }
}
