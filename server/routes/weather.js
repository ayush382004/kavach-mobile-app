/**
 * Weather Routes - KavachForWork
 * Uses WeatherStack API for real-time temperature oracle
 * GET /api/weather/current?city=Jaipur
 * GET /api/weather/heatwave?lat=26.9&lng=75.8
 * GET /api/weather/aqi?lat=26.9&lng=75.8
 */

const router = require('express').Router();
const https = require('https');
const axios = require('axios');
const { protect } = require('../middleware/auth');

const WEATHERSTACK_KEY = process.env.WEATHERSTACK_API_KEY;
if (!WEATHERSTACK_KEY) {
  console.warn('⚠️  WARNING: WEATHERSTACK_API_KEY not set in environment. Weather routes will fail.');
}
const { getPayoutTier, getPayoutAmountForMax, HEATWAVE_THRESHOLD } = require('../utils/constants');
const { resolvePricing } = require('../utils/pricing');
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHERSTACK_CURRENT_URL = 'https://api.weatherstack.com/current';
const IPV4_HTTPS_AGENT = new https.Agent({ family: 4 });

function canUseWeatherStack() {
  return typeof WEATHERSTACK_KEY === 'string' && WEATHERSTACK_KEY.trim().length > 0;
}

// ─── Heatwave Check (primary oracle for payout trigger) ───────────────────────
router.get('/heatwave', protect, async (req, res) => {
  try {
    const primary = await getOpenMeteoWeather({
      lat: req.query.lat,
      lng: req.query.lng,
      city: req.query.city,
      user: req.user,
    });
    return res.json(buildHeatwaveResponse(primary, req.user));
  } catch (primaryErr) {
    console.error('[Weather] Open-Meteo primary failed:', describeError(primaryErr));
  }

  try {
    if (!canUseWeatherStack()) {
      throw new Error('WeatherStack unavailable');
    }

    const { lat, lng, city } = req.query;

    // Build query: prefer coordinates, fallback to city name
    const query = (lat && lng) ? `${lat},${lng}` : (city || 'Jaipur');

    const response = await axios.get(WEATHERSTACK_CURRENT_URL, {
      params: {
        access_key: WEATHERSTACK_KEY,
        query,
        units: 'm', // metric
      },
      timeout: 8000,
    });

    const data = response.data;

    if (data.error) {
      throw new Error(data.error.info || data.error.type || 'WeatherStack error');
    }

    const temp = data.current.temperature;
    const feelsLike = data.current.feelslike;
    const humidity = data.current.humidity;
    const uvIndex = data.current.uv_index;
    const precipitation = data.current.precip || 0;

    const isHeatwave = temp >= HEATWAVE_THRESHOLD;
    const payoutTier = getPayoutTier(temp);
    const pricing = resolvePricing(req.user?.state, data.location?.name || city || req.user?.city);

    res.json({
      temperature: temp,
      feelsLike,
      humidity,
      uvIndex,
      windSpeed: data.current.wind_speed,
      precipitation,
      condition: data.current.weather_descriptions?.[0] || 'Clear',
      weatherIcon: data.current.weather_icons?.[0],
      city: data.location?.name,
      region: data.location?.region,
      country: data.location?.country,
      isHeatwave,
      heatwaveThreshold: HEATWAVE_THRESHOLD,
      pricing,
      payoutTier,
      payoutAmount: getPayoutAmountForMax(pricing.maxPayout, temp),
      timestamp: data.location?.localtime,
      source: 'WeatherStack',
    });
  } catch (err) {
    console.error('[Weather] Heatwave check error:', err.message);
    try {
      const fallback = await getOpenMeteoWeather({
        lat: req.query.lat,
        lng: req.query.lng,
        city: req.query.city,
        user: req.user,
      });
      return res.json(buildHeatwaveResponse(fallback, req.user));
    } catch (fallbackErr) {
      console.error('[Weather] Open-Meteo fallback failed:', describeError(fallbackErr));
      if (process.env.NODE_ENV === 'development') {
        return res.json(getMockWeatherData(req.user));
      }
      res.status(502).json({ error: 'Weather API unavailable. Try again.' });
    }
  }
});

// ─── Current Weather ──────────────────────────────────────────────────────────
router.get('/current', async (req, res) => {
  try {
    const data = await getOpenMeteoWeather({
      lat: req.query.lat,
      lng: req.query.lng,
      city: req.query.city || 'Jaipur',
    });
    const pricing = resolvePricing(req.query.state, data.city || req.query.city || 'Jaipur');
    res.json({
      city: data.city,
      region: data.region,
      temperature: data.temperature,
      feelsLike: data.feelsLike,
      humidity: data.humidity,
      condition: data.condition,
      weatherIcon: null,
      isHeatwave: data.temperature >= HEATWAVE_THRESHOLD,
      pricing,
      payoutTier: getPayoutTier(data.temperature),
      payoutAmount: getPayoutAmountForMax(pricing.maxPayout, data.temperature),
      source: 'Open-Meteo',
    });
  } catch (err) {
    console.error('[Weather] Current weather primary failed:', describeError(err));
    try {
      if (!canUseWeatherStack()) {
        throw new Error('WeatherStack unavailable');
      }

      const fallback = await getWeatherStackWeather({
        lat: req.query.lat,
        lng: req.query.lng,
        city: req.query.city || 'Jaipur',
        state: req.query.state,
      });

      return res.json(fallback);
    } catch (fallbackErr) {
      console.error('[Weather] Current weather fallback failed:', describeError(fallbackErr));
      res.status(502).json({ error: 'Weather service unavailable.' });
    }
  }
});

// ─── AQI Data (OpenAQ - Free, no key) ────────────────────────────────────────
router.get('/aqi', protect, async (req, res) => {
  try {
    const { lat, lng } = req.query;

    const response = await axios.get('https://api.openaq.org/v2/latest', {
      params: {
        coordinates: `${lat},${lng}`,
        radius: 25000, // 25km radius
        limit: 5,
        parameter: 'pm25',
      },
      timeout: 6000,
      headers: { 'X-API-Key': '' }, // OpenAQ doesn't require key for basic queries
    });

    const results = response.data.results;
    if (!results || results.length === 0) {
      return res.json({ aqi: null, message: 'No AQI data for this location' });
    }

    // Get latest PM2.5 reading
    const latest = results[0]?.measurements?.find(m => m.parameter === 'pm25');
    const pm25 = latest?.value || 0;
    const aqiCategory = getAQICategory(pm25);

    res.json({
      pm25,
      aqiCategory,
      station: results[0]?.name,
      lastUpdated: latest?.lastUpdated,
    });
  } catch (err) {
    console.error('[AQI] Error:', err.message);
    // Return safe fallback
    res.json({ pm25: 85, aqiCategory: 'Moderate', message: 'Estimated data' });
  }
});

// ─── Helper Functions ────────────────────────────────────────────────────────

function getAQICategory(pm25) {
  if (pm25 <= 12) return 'Good';
  if (pm25 <= 35.4) return 'Moderate';
  if (pm25 <= 55.4) return 'Unhealthy for Sensitive Groups';
  if (pm25 <= 150.4) return 'Unhealthy';
  if (pm25 <= 250.4) return 'Very Unhealthy';
  return 'Hazardous';
}

async function getOpenMeteoWeather({ lat, lng, city, user }) {
  const location = await resolveLocation({ lat, lng, city, user });

  const data = await requestJson(OPEN_METEO_FORECAST_URL, {
    latitude: location.lat,
    longitude: location.lng,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code',
    timezone: 'auto',
    forecast_days: 1,
  });

  const current = data?.current;
  if (!current) {
    throw new Error('Open-Meteo response missing current weather');
  }

  return {
    city: location.city,
    region: location.region,
    country: location.country,
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation || 0,
    condition: getWeatherCodeLabel(current.weather_code),
    timestamp: current.time,
  };
}

async function getWeatherStackWeather({ lat, lng, city, state }) {
  const query = lat && lng ? `${lat},${lng}` : city || 'Jaipur';
  const response = await axios.get(WEATHERSTACK_CURRENT_URL, {
    params: {
      access_key: WEATHERSTACK_KEY,
      query,
      units: 'm',
    },
    timeout: 8000,
  });

  const data = response.data;
  if (data.error) {
    throw new Error(data.error.info || data.error.type || 'WeatherStack error');
  }

  const pricing = resolvePricing(state, data.location?.name || city || 'Jaipur');
  const temperature = data.current.temperature;

  return {
    city: data.location?.name || city || 'Jaipur',
    region: data.location?.region || state || '',
    temperature,
    feelsLike: data.current.feelslike,
    humidity: data.current.humidity,
    condition: data.current.weather_descriptions?.[0] || 'Clear',
    weatherIcon: data.current.weather_icons?.[0] || null,
    isHeatwave: temperature >= HEATWAVE_THRESHOLD,
    pricing,
    payoutTier: getPayoutTier(temperature),
    payoutAmount: getPayoutAmountForMax(pricing.maxPayout, temperature),
    source: 'WeatherStack',
  };
}

async function resolveLocation({ lat, lng, city, user }) {
  if (lat && lng) {
    return {
      lat: Number(lat),
      lng: Number(lng),
      city: city || user?.city || 'Jaipur',
      region: user?.state || '',
      country: 'India',
    };
  }

  const searchTerm = city || user?.city || 'Jaipur';
  const data = await requestJson(OPEN_METEO_GEOCODING_URL, {
    name: searchTerm,
    count: 1,
    language: 'en',
    format: 'json',
  });

  const result = data?.results?.[0];
  if (!result) {
    throw new Error(`Could not geocode city: ${searchTerm}`);
  }

  return {
    lat: result.latitude,
    lng: result.longitude,
    city: result.name || searchTerm,
    region: result.admin1 || user?.state || '',
    country: result.country || 'India',
  };
}

function buildHeatwaveResponse(fallback, user = {}) {
  const pricing = resolvePricing(user?.state, fallback.city || user?.city);
  const payoutTier = getPayoutTier(fallback.temperature);

  return {
    temperature: fallback.temperature,
    feelsLike: fallback.feelsLike,
    humidity: fallback.humidity,
    uvIndex: null,
    windSpeed: fallback.windSpeed,
    precipitation: fallback.precipitation,
    condition: fallback.condition,
    weatherIcon: null,
    city: fallback.city,
    region: fallback.region,
    country: fallback.country,
    isHeatwave: fallback.temperature >= HEATWAVE_THRESHOLD,
    heatwaveThreshold: HEATWAVE_THRESHOLD,
    pricing,
    payoutTier,
    payoutAmount: getPayoutAmountForMax(pricing.maxPayout, fallback.temperature),
    timestamp: fallback.timestamp,
    source: 'Open-Meteo',
  };
}

async function requestJson(baseUrl, params) {
  try {
    const response = await axios.get(baseUrl, {
      params,
      timeout: 8000,
      family: 4,
      httpsAgent: IPV4_HTTPS_AGENT,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KavachForWork/1.0',
      },
    });
    return response.data;
  } catch (ipv4Err) {
    const response = await axios.get(baseUrl, {
      params,
      timeout: 8000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KavachForWork/1.0',
      },
    });
    return response.data;
  }
}

function getWeatherCodeLabel(code) {
  const labels = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };

  return labels[code] || 'Unknown';
}

function describeError(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.response?.data) {
    return JSON.stringify(error.response.data);
  }
  if (error.cause) {
    const cause = error.cause.code ? `${error.cause.code}: ${error.cause.message}` : error.cause.message;
    return `${error.message || 'Request error'} | cause: ${cause}`;
  }
  if (error.code) {
    return `${error.code}: ${error.message || 'Request error'}`;
  }
  return error.stack || error.message || JSON.stringify(error);
}

function getMockWeatherData(user = {}) {
  const temp = 46 + Math.random() * 4; // 46-50°C for demo
  const tier = getPayoutTier(temp);
  const pricing = resolvePricing(user?.state || 'Rajasthan', user?.city || 'Jaipur');
  return {
    temperature: parseFloat(temp.toFixed(1)),
    feelsLike: parseFloat((temp + 3).toFixed(1)),
    humidity: 18,
    uvIndex: 11,
    windSpeed: 12,
    condition: 'Sunny',
    city: 'Jaipur',
    region: 'Rajasthan',
    country: 'India',
    isHeatwave: true,
    heatwaveThreshold: 45,
    pricing,
    payoutTier: tier,
    payoutAmount: getPayoutAmountForMax(pricing.maxPayout, temp),
    source: 'Mock (dev mode)',
  };
}

module.exports = router;
