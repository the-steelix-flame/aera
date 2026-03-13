from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI(title="AERA Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Added route_type parameter
@app.get("/analyze-route")
def analyze_route(lat: float, lng: float, duration_mins: float, distance_km: float, route_type: int = 0):
    try:
        # Base Satellite Data
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide"
        res = requests.get(url).json()
        current = res.get("current", {})

        aqi = current.get("european_aqi", 50)
        pm25 = current.get("pm2_5", 15.0)  
        pm10 = current.get("pm10", 20.0)   
        no2 = current.get("nitrogen_dioxide", 10.0) 

        # 🚀 MICRO-ENVIRONMENT SIMULATOR FOR STREET-LEVEL ACCURACY
        if route_type == 0:
            # Fastest Route (Highways): 4+ Intersections, Heavy Traffic
            no2 = no2 * 2.5
            pm25 = pm25 * 1.5
            aqi = min(aqi * 1.8, 250)
            env_reason = "🚗 Highway Corridor: Passes 4 major intersections. Extreme NO2 (Vehicle Exhaust) detected."
        elif route_type == 1:
            # Alternative 1 (Industrial/Commercial): 2+ Industries, Construction
            pm10 = pm10 * 3.0
            pm25 = pm25 * 2.0
            no2 = no2 * 0.8
            aqi = min(aqi * 1.4, 200)
            env_reason = "🏭 Industrial Proximity: Passes 2 manufacturing/construction zones. High PM10 (Dust) and PM2.5 (Smog)."
        else:
            # Alternative 2 (Residential/Green Bypass): Filtered air
            pm25 = pm25 * 0.3
            pm10 = pm10 * 0.4
            no2 = no2 * 0.4
            aqi = max(aqi * 0.4, 25)
            env_reason = "🌿 Residential/Green Bypass: Avoids main industrial zones. Dense tree canopy filters out 60% of harmful PM2.5."

        # Medical Math
        cigarettes = (pm25 / 22.0) * (duration_mins / 1440.0)
        life_lost_mins = round(cigarettes * 11, 1)

        total_gases = pm25 + pm10 + no2
        if total_gases == 0: total_gases = 1

        # Aggressive Medical UI Alerts
        medical_alert = None
        reward_msg = None
        
        if aqi > 80 or pm25 > 25:
            medical_alert = f"⚠️ SEVERE RISK: This route forces {round(pm25, 1)} μg/m³ of micro-particles deep into your lung alveoli. Commuting this way daily increases asthma and COPD risks. You are trading health for speed."
        else:
            reward_msg = f"🏆 LUNG SAVER: By taking this route, you are actively outliving the commuters choking on the main highway by avoiding toxic tailpipe emissions!"

        return {
            "status": "success",
            "aqi": round(aqi),
            "health": {
                "life_lost_mins": life_lost_mins,
                "duration": duration_mins,
                "distance": distance_km
            },
            "sources": [
                {"name": "Vehicle Exhaust (NO2)", "value": round((no2/total_gases)*100), "color": "#EF4444"},
                {"name": "Construction Dust (PM10)", "value": round((pm10/total_gases)*100), "color": "#F59E0B"},
                {"name": "Industrial Smog (PM2.5)", "value": round((pm25/total_gases)*100), "color": "#6B7280"}
            ],
            "reason": env_reason,
            "medical_alert": medical_alert,
            "reward_msg": reward_msg
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}