/**
 * Utah Ground Snow Load lookup using USU data matrices.
 * Data source: https://www.usu.edu/utahsnowload/
 * Replicates the bilinear interpolation from USU's process.js client-side script.
 */

const SNOWLOAD_CDN =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/snowloadMat_c89c6dfb.json";
const ELEV_CDN =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346810257/CCcDY8JrM76jeYgqBkzZHs/elevMat_3eb38ffb.json";

// In-memory cache — loaded once per server process
let snowloadMatrix: Record<string, Record<string, number>> | null = null;
let elevationMatrix: Record<string, Record<string, number>> | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadMatrices() {
  if (snowloadMatrix && elevationMatrix) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [snowResp, elevResp] = await Promise.all([
      fetch(SNOWLOAD_CDN),
      fetch(ELEV_CDN),
    ]);
    const snowData = await snowResp.json();
    const elevData = await elevResp.json();
    snowloadMatrix = snowData.snowloadMatrix;
    elevationMatrix = elevData.elevationMatrix;
  })();

  return loadingPromise;
}

/**
 * Find the two bracketing values in a sorted-descending numeric array.
 * Returns [lower, defined, higher, closest] matching USU process.js closest().
 */
function closest(
  definedCoord: number,
  arr: number[]
): [number, number, number, number] {
  let closestCoord = arr[0];
  let arrInd = 0;
  let diff = Math.abs(definedCoord - closestCoord);

  for (let i = 0; i < arr.length; i++) {
    const newdiff = Math.abs(definedCoord - arr[i]);
    if (newdiff <= diff) {
      diff = newdiff;
      closestCoord = arr[i];
      arrInd = i;
    }
  }

  let lowerCoords: number;
  let higherCoords: number;

  if (closestCoord === definedCoord) {
    lowerCoords = definedCoord;
    higherCoords = definedCoord;
  } else if (closestCoord < definedCoord) {
    lowerCoords = closestCoord;
    higherCoords = arr[arrInd - 1] ?? closestCoord;
  } else {
    higherCoords = closestCoord;
    lowerCoords = arr[arrInd + 1] ?? closestCoord;
  }

  return [lowerCoords, definedCoord, higherCoords, closestCoord];
}

/** Get a value from a matrix by numeric lat/lng (tolerant key matching) */
function getVal(
  matrix: Record<string, Record<string, number>>,
  latVal: number,
  lngVal: number
): number | null {
  const latKey = Object.keys(matrix).find(
    (k) => Math.abs(Number(k) - latVal) < 0.0001
  );
  if (!latKey) return null;
  const lngKey = Object.keys(matrix[latKey]).find(
    (k) => Math.abs(Number(k) - lngVal) < 0.0001
  );
  if (!lngKey) return null;
  return matrix[latKey][lngKey];
}

/**
 * Look up the 50-year ground snow load (psf) for a given lat/lng using
 * bilinear interpolation on the USU snow load matrix.
 * Returns psf value (minimum 21 per ASCE 7).
 */
export async function lookupSnowLoadPsf(
  lat: number,
  lng: number
): Promise<number> {
  await loadMatrices();

  if (!snowloadMatrix || !elevationMatrix) {
    throw new Error("Snow load matrices not loaded");
  }

  const latitudes = Object.keys(snowloadMatrix).map(Number);
  const [lowerLat, definedLat, higherLat, closestLat] = closest(lat, latitudes);

  // Get longitudes from the row closest to the target lat
  const closestLatKey = Object.keys(snowloadMatrix).find(
    (k) => Math.abs(Number(k) - closestLat) < 0.0001
  )!;
  const longitudes = Object.keys(snowloadMatrix[closestLatKey]).map(Number);
  const [lowerLng, definedLng, higherLng, closestLng] = closest(lng, longitudes);

  let cSnowload: number | null = null;

  if (closestLng === definedLng && closestLat === definedLat) {
    // Exact match
    cSnowload = getVal(snowloadMatrix, definedLat, definedLng);
  } else if (closestLng === definedLng) {
    // Interpolate along latitude only
    const tx1 = (definedLat - lowerLat) / (higherLat - lowerLat || 1);
    const tx2 = 1 - tx1;
    const txHigher = closestLat === higherLat ? tx1 : tx2;
    const txLower = 1 - txHigher;
    const aSnowload = getVal(snowloadMatrix, higherLat, definedLng) ?? 0;
    const bSnowload = getVal(snowloadMatrix, lowerLat, definedLng) ?? 0;
    cSnowload = bSnowload * txLower + aSnowload * txHigher;
  } else if (closestLat === definedLat) {
    // Interpolate along longitude only
    const ty1 = (definedLng - lowerLng) / (higherLng - lowerLng || 1);
    const ty2 = 1 - ty1;
    const tyHigher = closestLng === higherLng ? ty1 : ty2;
    const tyLower = 1 - tyHigher;
    const aSnowload = getVal(snowloadMatrix, definedLat, higherLng) ?? 0;
    const bSnowload = getVal(snowloadMatrix, definedLat, lowerLng) ?? 0;
    cSnowload = bSnowload * tyLower + aSnowload * tyHigher;
  } else {
    // Full bilinear interpolation
    const tx1 = (definedLat - lowerLat) / (higherLat - lowerLat || 1);
    const tx2 = 1 - tx1;
    const txHigher = closestLat === higherLat ? tx1 : tx2;
    const txLower = 1 - txHigher;

    const ty1 = (definedLng - lowerLng) / (higherLng - lowerLng || 1);
    const ty2 = 1 - ty1;
    const tyHigher = closestLng === higherLng ? ty1 : ty2;
    const tyLower = 1 - tyHigher;

    const interpLng = (coord: number, val1: number, val2: number): number => {
      if (coord === closestLng) {
        return val1 * tyLower + val2 * tyHigher;
      } else {
        return val1 * tyHigher + val2 * tyLower;
      }
    };
    const interpLat = (coord: number, val1: number, val2: number): number => {
      if (coord === closestLat) {
        return val1 * txLower + val2 * txHigher;
      } else {
        return val1 * txHigher + val2 * txLower;
      }
    };

    const aSnowload = interpLng(
      higherLng,
      getVal(snowloadMatrix, higherLat, higherLng) ?? 0,
      getVal(snowloadMatrix, higherLat, lowerLng) ?? 0
    );
    const bSnowload = interpLng(
      higherLng,
      getVal(snowloadMatrix, lowerLat, higherLng) ?? 0,
      getVal(snowloadMatrix, lowerLat, lowerLng) ?? 0
    );
    cSnowload = interpLat(higherLat, bSnowload, aSnowload);
  }

  if (cSnowload === null || isNaN(cSnowload)) {
    throw new Error(`No snow load data for lat=${lat}, lng=${lng}. Location may be outside Utah.`);
  }

  // Apply ASCE 7 minimum of 21 psf
  return Math.max(21, Math.round(cSnowload));
}

/** Warm up the matrices on server start */
export function preloadSnowLoadMatrices() {
  loadMatrices().catch((e) =>
    console.error("[SnowLoad] Failed to preload matrices:", e)
  );
}
