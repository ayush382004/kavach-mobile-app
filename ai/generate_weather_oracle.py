import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import numpy as np

# Create dummy data
# Features: temperature_c, humidity, wind_speed_ms, precipitation_mm
np.random.seed(42)
n_samples = 1000

temperature_c = np.random.uniform(20, 50, n_samples)
humidity = np.random.uniform(10, 90, n_samples)
wind_speed_ms = np.random.uniform(0, 15, n_samples)
precipitation_mm = np.random.uniform(0, 50, n_samples)

# Rule for heatwave: temperature >= 45 is 1.0 (heatwave), else 0.0
# Add some slight noise
y = (temperature_c >= 45).astype(float)

X = pd.DataFrame({
    'temperature_c': temperature_c,
    'humidity': humidity,
    'wind_speed_ms': wind_speed_ms,
    'precipitation_mm': precipitation_mm
})

model = RandomForestRegressor(n_estimators=10, max_depth=5, random_state=42)
model.fit(X, y)

# Save the model
joblib.dump(model, 'weather_Oracle.joblib')
print("weather_Oracle.joblib created successfully.")
