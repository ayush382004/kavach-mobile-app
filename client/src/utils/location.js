import { canonicalizeState } from './pricing.js';

export async function getCurrentCoordinates() {
  // On Capacitor native, use the native Geolocation plugin (no secure-origin restriction)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const perms = await Geolocation.checkPermissions();
      if (perms.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
      // Try cached position first for speed (up to 30s old)
      try {
        const cached = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 3000 });
        if (cached?.coords) {
          return { latitude: cached.coords.latitude, longitude: cached.coords.longitude, accuracy: cached.coords.accuracy };
        }
      } catch { /* fall through to high-accuracy */ }
      // High-accuracy fallback
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch (err) {
      throw new Error(err.message || 'Unable to read your location.');
    }
  }

  // Browser fallback (web) — try quick low-accuracy first, then high-accuracy
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available on this device.'));
      return;
    }
    // Quick grab (uses cached / network location, fast)
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => {
        // Slow fallback to GPS
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
          (error) => reject(new Error(error.message || 'Unable to read your location.')),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
    );
  });
}


export async function reverseGeocodeIndia(latitude, longitude) {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}` +
    `&longitude=${longitude}&localityLanguage=en`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Location API lookup failed.');
  }

  const data = await response.json();
  const detectedState = canonicalizeState(
    data.principalSubdivision ||
      data.localityInfo?.administrative?.find((item) => item.order === 4)?.name ||
      ''
  );

  return {
    city: data.city || data.locality || data.localityInfo?.administrative?.[1]?.name || '',
    state: detectedState,
    countryCode: data.countryCode || '',
    formatted: [data.locality, detectedState].filter(Boolean).join(', '),
  };
}

export function statesMatch(selectedState, detectedState) {
  return canonicalizeState(selectedState) === canonicalizeState(detectedState);
}
