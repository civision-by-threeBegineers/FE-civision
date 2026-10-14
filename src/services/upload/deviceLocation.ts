// A position read from the device (browser Geolocation API) when a photo is taken.

export interface DeviceLocation {
  lat: number
  lon: number
  accuracy: number // meters, the real position is within this radius
  timestamp: number // ms since epoch
}

// Above this the fix is rough (cell tower / Wi-Fi instead of GPS): warn the user.
export const LOW_ACCURACY_METERS = 100

export function formatCoordinate(lat: number, lon: number) {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`
}

export function formatAccuracy(meters: number) {
  return meters < 1000 ? `±${Math.round(meters)} m` : `±${(meters / 1000).toFixed(1)} km`
}

export function toDeviceLocation(position: GeolocationPosition): DeviceLocation {
  return {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp,
  }
}
