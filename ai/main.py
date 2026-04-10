"""
KavachForWork - AI Fraud Detection Service
FastAPI + scikit-learn Random Forest (sentry_AI_fraud_.joblib)

Features used by the model:
  ambient_temp        - API temperature (°C) from WeatherStack
  device_temp         - Battery temperature (°C) from Capacitor/Android
  jitter              - GPS signal jitter (outdoor noise)
  is_charging         - 1 if charging (indoor fraud signal)
  network_type_encoded- 0=WiFi(indoor), 1=unknown, 2=mobile(outdoor)
  battery_drain_rate  - Rate of battery drain (outdoor → higher)
  brightness_level    - Screen brightness (outdoor → max)
  altitude_variance   - GPS altitude variance (outdoor movement)
"""

import logging
import threading
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import joblib
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("kavach-ai")

# ─── App Configuration ────────────────────────────────────────────────────────
app = FastAPI(
    title="KavachForWork AI Service",
    description="Heatwave insurance fraud detection using Random Forest",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Lazy Load Models (Thread Safe) ──────────────────────────────────────────
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "sentry_AI_fraud_.joblib"
WEATHER_MODEL_CANDIDATES = [
    BASE_DIR / "weather_Oracle.joblib",
    BASE_DIR.parent / "weather_Oracle.joblib",
]
WEATHER_MODEL_PATH = next((path for path in WEATHER_MODEL_CANDIDATES if path.exists()), WEATHER_MODEL_CANDIDATES[0])

_MODEL_CACHE = {"fraud": None, "weather": None}
_model_lock = threading.Lock()

def get_fraud_model():
    """Thread-safe lazy loading for the fraud detection model."""
    if _MODEL_CACHE["fraud"] is None:
        with _model_lock:
            # Double-check pattern to prevent race during lock acquisition
            if _MODEL_CACHE["fraud"] is None:
                try:
                    if MODEL_PATH.exists():
                        _MODEL_CACHE["fraud"] = joblib.load(MODEL_PATH, mmap_mode='r')
                    else:
                        logger.warning(f"Fraud model file missing: {MODEL_PATH}")
                except MemoryError:
                    logger.error("Out of Memory while loading fraud model!")
                    _MODEL_CACHE["fraud"] = None
                except Exception as e:
                    logger.error(f"Failed to load fraud model: {e}")
    return _MODEL_CACHE["fraud"]

def get_weather_model():
    """Thread-safe lazy loading for the weather oracle model."""
    if _MODEL_CACHE["weather"] is None:
        with _model_lock:
            if _MODEL_CACHE["weather"] is None:
                try:
                    if WEATHER_MODEL_PATH.exists():
                        _MODEL_CACHE["weather"] = joblib.load(WEATHER_MODEL_PATH, mmap_mode='r')
                    else:
                        logger.warning(f"Weather model file missing: {WEATHER_MODEL_PATH}")
                except MemoryError:
                    logger.error("Out of Memory while loading weather model!")
                    _MODEL_CACHE["weather"] = None
                except Exception as e:
                    logger.error(f"Failed to load weather model: {e}")
    return _MODEL_CACHE["weather"]

@app.on_event("startup")
def preload_models_background():
    import threading
    threading.Thread(target=get_fraud_model, daemon=True).start()
    threading.Thread(target=get_weather_model, daemon=True).start()

def get_weather_feature_order():
    wm = get_weather_model()
    return list(getattr(wm, 'feature_names_in_', [])) if wm is not None else []

FEATURE_ORDER = [
    "ambient_temp",
    "device_temp",
    "jitter",
    "is_charging",
    "network_type_encoded",
    "battery_drain_rate",
    "brightness_level",
    "altitude_variance",
]

# ─── Weather Oracle Feature Aliases & Defaults ──────────────────────────────────
# Maps alternate feature names sent by server → the model's actual feature names.
WEATHER_ALIAS_MAP: dict[str, str] = {
    "temperature_c":     "temperature",
    "temp_c":            "temperature",
    "temperature_2m":    "temperature",
    "ambient_temp":      "temperature",
    "feels_like":        "feelsLike",
    "apparent_temperature": "feelsLike",
    "wind_speed_ms":     "wind_speed",
    "wind_speed_10m":    "wind_speed",
    "windSpeed":         "wind_speed",
    "precipitation_mm":  "precipitation",
    "precip":            "precipitation",
    "relative_humidity_2m": "humidity",
    "humidity_pct":      "humidity",
    # Identity pass-throughs (no-op aliases)
    "temperature":       "temperature",
    "humidity":          "humidity",
    "wind_speed":        "wind_speed",
    "precipitation":     "precipitation",
}

# Sensible defaults for missing features (based on Indian summer averages)
WEATHER_FEATURE_DEFAULTS: dict[str, float] = {
    "temperature":    45.0,
    "feelsLike":      48.0,
    "humidity":       30.0,
    "wind_speed":     10.0,
    "precipitation":   0.0,
    "uv_index":       10.0,
    "cloud_cover":    10.0,
    "pressure":      1010.0,
    "dew_point":      15.0,
    "visibility":     10.0,
}

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class ClaimVerificationRequest(BaseModel):
    # Weather oracle temperature (from WeatherStack)
    ambient_temp: float = Field(..., ge=30, le=60, description="API temperature °C")

    # Device sensor readings (from Capacitor bridge)
    device_temp: float = Field(40.0, ge=20, le=65, description="Battery temperature °C")
    jitter: float = Field(0.5, ge=0, le=5, description="GPS jitter magnitude")
    is_charging: int = Field(0, ge=0, le=1, description="1=charging (indoor flag)")
    network_type_encoded: int = Field(2, ge=0, le=2, description="0=WiFi,1=unknown,2=mobile")
    battery_drain_rate: float = Field(0.3, ge=0, le=1, description="Battery % drained per minute")
    brightness_level: float = Field(0.7, ge=0, le=1, description="Screen brightness 0-1")
    altitude_variance: float = Field(0.2, ge=0, le=100, description="Altitude variance (movement)")

    @validator("ambient_temp")
    def temp_must_be_warm(cls, v):
        """Require at least 40°C — reduced from 45°C to avoid edge cases at heatwave boundary."""
        if v < 40:
            raise ValueError("Ambient temp too low for heatwave claim (minimum 40°C)")
        return v


class FraudSignals(BaseModel):
    temp_match: bool
    outdoor_battery: bool
    network_outdoor: bool
    not_charging: bool
    brightness_high: bool
    has_movement: bool


class ClaimVerificationResponse(BaseModel):
    fraud_score: float          # 0-100 (0=definitely legit, 100=definitely fraud)
    fraud_probability: float    # Raw model output
    legit_probability: float
    is_legit: bool
    risk_level: str             # low / medium / high / critical
    signals: FraudSignals
    recommendation: str
    model_version: str


class WeatherOracleRequest(BaseModel):
    features: dict[str, float]

    @validator("features")
    def validate_features(cls, value):
        if not isinstance(value, dict):
            raise ValueError("features must be a dictionary of feature names to numeric values")
        return value


class WeatherOracleResponse(BaseModel):
    oracle_score: float
    heatwave_probability: float
    is_heatwave: bool
    raw_prediction: float
    feature_names: list[str]
    model_version: str


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
@app.head("/")
def root():
    return {
        "service": "KavachForWork AI Fraud Detection",
        "fraud_model_loaded": _MODEL_CACHE["fraud"] is not None,
        "weather_model_loaded": _MODEL_CACHE["weather"] is not None,
        "version": "1.0.0",
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "fraud_model_ready": MODEL_PATH.exists(),
        "weather_model_ready": WEATHER_MODEL_PATH.exists(),
    }


# ─── Main Endpoint ────────────────────────────────────────────────────────────

@app.post("/verify-claim", response_model=ClaimVerificationResponse)
def verify_claim(payload: ClaimVerificationRequest):
    """
    Verify a heatwave insurance claim using the Sentry Random Forest model.
    
    The model was trained on 8 features capturing indoor/outdoor context.
    Key fraud signals:
      - Indoor AC fraud: device_temp < 30°C while claiming outdoor 45°C heat
      - WiFi-only (not mobile): suspect indoor network
      - Charging during claim: device plugged in → indoors
      - Low brightness: screen dim → indoors
      - Low battery drain: stationary indoors device
    """
    model = get_fraud_model()
    if model is None:
        raise HTTPException(503, detail="AI model not available. Using fallback scoring.")

    try:
        # Build feature dataframe matching model's expected column order
        features_dict = {
            "ambient_temp": payload.ambient_temp,
            "device_temp": payload.device_temp,
            "jitter": payload.jitter,
            "is_charging": float(payload.is_charging),
            "network_type_encoded": float(payload.network_type_encoded),
            "battery_drain_rate": payload.battery_drain_rate,
            "brightness_level": payload.brightness_level,
            "altitude_variance": payload.altitude_variance,
        }

        X = pd.DataFrame([features_dict])

        # Model prediction (0=legit, 1=fraud)
        proba = model.predict_proba(X)[0]

        # proba[0] = P(legit=0), proba[1] = P(fraud=1)
        # Model classes_ = [0,1] but output meaning depends on training:
        # We interpret class 1 = legitimate outdoor worker (high temp scenario)
        # Adjust based on our empirical testing
        legit_prob = float(proba[1])   # class 1 was outdoor/legit in training
        fraud_prob = float(proba[0])   # class 0 was fraud/indoor

        # ── Heuristic fraud signals (transparent explainability) ──────────────
        signals = compute_fraud_signals(payload)
        fraud_signal_count = sum([
            not signals["outdoor_battery"],
            not signals["network_outdoor"],
            not signals["not_charging"],
            not signals["brightness_high"],
            not signals["temp_match"],
        ])

        # ── Blend model score with rule-based heuristics ──────────────────────
        # Model gives base score, heuristics nudge it
        base_fraud_score = fraud_prob * 100

        # Add heuristic penalty: each signal failure adds 5-15 points
        heuristic_penalty = fraud_signal_count * 12
        blended_score = min(100, base_fraud_score + heuristic_penalty * 0.3)

        # Hard rules override:
        # If device_temp < 30°C → definite indoor fraud (35+ penalty)
        if payload.device_temp < 30:
            blended_score = min(100, blended_score + 35)
        # If charging + WiFi + low battery drain → strong indoor signal
        if payload.is_charging == 1 and payload.network_type_encoded == 0:
            blended_score = min(100, blended_score + 25)

        fraud_score = round(blended_score, 1)
        is_legit = fraud_score < 60

        risk_level = get_risk_level(fraud_score)
        recommendation = get_recommendation(fraud_score, signals)

        logger.info(
            f"Claim verified | temp={payload.ambient_temp}°C device={payload.device_temp}°C "
            f"fraud_score={fraud_score} | {risk_level}"
        )

        return ClaimVerificationResponse(
            fraud_score=fraud_score,
            fraud_probability=round(fraud_prob, 4),
            legit_probability=round(legit_prob, 4),
            is_legit=is_legit,
            risk_level=risk_level,
            signals=FraudSignals(**{
                k: bool(v) for k, v in signals.items()
            }),
            recommendation=recommendation,
            model_version="sentry_v1_rf",
        )

    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(500, detail=f"Fraud detection failed: {str(e)}")


# ─── Batch Verify (admin use) ─────────────────────────────────────────────────

@app.post("/verify-batch")
def verify_batch(claims: list[ClaimVerificationRequest]):
    """Batch verify multiple claims (admin/audit use)"""
    if len(claims) > 50:
        raise HTTPException(400, detail="Max 50 claims per batch")
    return [verify_claim(c) for c in claims]


# ─── Model Introspection ──────────────────────────────────────────────────────

@app.get("/model-info")
def model_info():
    model = get_fraud_model()
    if model is None:
        raise HTTPException(503, "Fraud model not loaded")
    return {
        "fraud_model": {
            "type": type(model).__name__,
            "model_version": "sentry_v1_rf",
            "n_estimators": model.n_estimators,
            "n_features": model.n_features_in_,
            "feature_names": list(model.feature_names_in_),
            "feature_importances": dict(zip(
                model.feature_names_in_,
                [round(float(f), 4) for f in model.feature_importances_]
            )),
            "classes": model.classes_.tolist(),
        }
    }


@app.get("/oracle/info")
def oracle_info():
    weather_model = get_weather_model()
    if weather_model is None:
        return {
            "weather_model": {
                "type": "HeuristicOracleFallback",
                "model_version": "weather_oracle_v1_fallback",
                "n_features": 4,
                "feature_names": ["temperature_c", "humidity", "wind_speed_ms", "precipitation_mm"],
            }
        }
    return {
        "weather_model": {
            "type": type(weather_model).__name__,
            "model_version": "weather_oracle_v1",
            "n_features": getattr(weather_model, "n_features_in_", None),
            "feature_names": list(getattr(weather_model, "feature_names_in_", [])),
        }
    }

@app.get("/oracle/features")
def oracle_features():
    """Diagnostic: list all features the oracle model expects, with alias info."""
    weather_model = get_weather_model()
    if weather_model is None:
        raise HTTPException(503, "Weather oracle model not loaded")
    features = get_weather_feature_order()
    return {
        "required_features": features,
        "feature_count": len(features),
        "alias_map": WEATHER_ALIAS_MAP,
        "defaults": {f: WEATHER_FEATURE_DEFAULTS.get(f, 0.0) for f in features},
        "model_type": type(weather_model).__name__,
    }


@app.post("/oracle/predict", response_model=WeatherOracleResponse)
def oracle_predict(payload: WeatherOracleRequest):
    """Predict heatwave probability using the Weather Oracle model.

    Accepts any combination of weather feature names — aliases are resolved
    automatically and missing features are filled with sensible defaults.
    """
    weather_model = get_weather_model()
    required_features = get_weather_feature_order() or ["temperature_c", "humidity", "wind_speed_ms", "precipitation_mm"]

    # ── 1. Resolve aliases from incoming feature dict ──────────────────────────
    resolved: dict[str, float] = {}
    for key, val in payload.features.items():
        canonical = WEATHER_ALIAS_MAP.get(key, key)   # map alias → canonical
        resolved[canonical] = float(val)

    if weather_model is None:
        # Fallback heuristic if model file is missing
        temp_c = float(resolved.get("temperature", resolved.get("temperature_c", 0)))
        raw_prediction = 1.0 if temp_c >= 45 else 0.0
    else:
        # ── 2. Fill missing required features with defaults ────────────────────────
        missing_filled = []
        for feat in required_features:
            if feat not in resolved:
                default = WEATHER_FEATURE_DEFAULTS.get(feat, 0.0)
                resolved[feat] = default
                missing_filled.append(feat)

        if missing_filled:
            logger.warning(f"[Oracle] Missing features filled with defaults: {missing_filled}")

        # ── 3. Build DataFrame in model's exact column order ─────────────────────
        data = {name: resolved[name] for name in required_features}
        X = pd.DataFrame([data], columns=required_features)

        raw_prediction = float(weather_model.predict(X)[0])
    oracle_score = min(max(raw_prediction, 0.0), 1.0)
    is_heatwave = oracle_score >= 0.5

    return WeatherOracleResponse(
        oracle_score=oracle_score,
        heatwave_probability=oracle_score,
        is_heatwave=is_heatwave,
        raw_prediction=raw_prediction,
        feature_names=required_features,
        model_version= "weather_oracle_v1" if weather_model else "weather_oracle_v1_fallback",
    )


# ─── Helper Functions ─────────────────────────────────────────────────────────

def compute_fraud_signals(p: ClaimVerificationRequest) -> dict:
    """Rule-based fraud signals for explainability"""
    return {
        # API temp vs device temp should correlate for outdoor workers
        "temp_match": abs(p.ambient_temp - p.device_temp) < 15,
        # Battery should be warm if outdoors in 45°C heat
        "outdoor_battery": p.device_temp >= 38,
        # Mobile data = outdoors; WiFi-only = sitting at home
        "network_outdoor": p.network_type_encoded >= 1,
        # Charging = plugged in = indoors
        "not_charging": p.is_charging == 0,
        # Full brightness outdoors (sunlight)
        "brightness_high": p.brightness_level >= 0.6,
        # Some movement/jitter expected outdoors
        "has_movement": p.jitter > 0.2 or p.altitude_variance > 0.05,
    }


def get_risk_level(score: float) -> str:
    if score < 25:  return "low"
    if score < 50:  return "medium"
    if score < 75:  return "high"
    return "critical"


def get_recommendation(score: float, signals: dict) -> str:
    if score < 25:
        return "Auto-approve. All signals indicate genuine outdoor worker exposure."
    if score < 50:
        failed = [k for k, v in signals.items() if not v]
        return f"Approve with note. Minor anomalies: {', '.join(failed)}."
    if score < 75:
        return "Flag for manual review. Multiple fraud indicators detected."
    return "Reject. High confidence fraud — device data inconsistent with outdoor claim."


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
