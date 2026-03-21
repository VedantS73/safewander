# SafeWander: Real-time Safety Intelligence for Travelers

**SafeWander** is a smart travel safety platform designed to help users—especially solo travelers and women—navigate cities with confidence. By combining crime data, real-time alerts, AI insights, and community feedback, SafeWander visualizes safety at a street level and provides actionable recommendations such as the safest routes, risk alerts, and nearby safe locations.

Instead of just showing crime data, SafeWander helps users make better decisions in real time.

---

## 🎯 Project Details

**Event**: Cursor Community Hackathon Heilbronn  
**Date**: Saturday, March 21 - 9:00 AM to Sunday, March 22 - 6:30 PM  
**Location**: OpenSpace Heilbronn, Heilbronn, Baden-Württemberg

**Team Members**:
- Vedant Sawant
- Gaurika Gupta
- Sankar Nair

---

## 🚀 Key Features

### 1. **Safety Score Heatmap**
Visual heatmap of streets, cities, and states based on crime density
- Safety Score: 0–100
- Factors: Number of crimes, type of crime, time of day, recency
- Street-level visualization for informed decision-making

### 2. **Route Optimization**
Users can choose between multiple routing strategies:
- **Safest Route** → avoids high-risk areas
- **Fastest Route** → standard shortest path
- **Balanced Route** → mix of safety + efficiency
- 📍 Powered via Mapbox with custom risk weighting

### 3. **Live Alerts**
Real-time safety alerts using automation (e.g., n8n)
- Tracks updates from official sources like police Twitter handles
- Examples: "Avoid this area due to recent incidents", "High theft activity reported nearby"

### 4. **AI Chatbot Assistant**
Smart assistant for safety queries and actions:
- "Find nearest police station"
- "I feel unsafe" → triggers SOS flow
- "Is this area safe at night?"
- Tool-powered responses using Gemini AI

### 5. **Check-in Timer**
Smart safety check-in system:
- User sets a timer while traveling (e.g., "I'll be home in 15 mins")
- At timer completion - 1 minute, app sends a push: "Are you safe?"
- If user doesn't tap "Yes" within 60 seconds, app:
  - Blasts their location to their "Circle of Trust"
  - Begins recording audio for evidence

### 6. **AI Trip Briefing**
(Integrated into the chatbot)
- Upload itinerary (PDF/text)
- Extracts locations and routes
- Generates safety insights with warnings and safer alternative routes

### 7. **Community Layer**
User-generated safety insights:
- Prompt: "How did you feel on this street?"
- Aggregated sentiment displayed on map
- Adds human + real-world perception layer

### 8. **Safe Havens Layer**
Quick access to safe locations using OpenStreetMap data:
- Police stations
- Hospitals
- Pharmacies
- 24/7 cafes / public spaces
- Helps users quickly find nearby safe spots

### 9. **SOS (One-Tap Emergency)**
Instant emergency trigger with multiple actions:
- Share live location with contacts
- Alert trusted contacts
- Provide nearest help points (police, hospitals, etc.)

---

## 📋 Setup Instructions

### Frontend Setup

```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL should point at your FastAPI server (default http://localhost:8000/api)
npm install
npm run dev
```

**Frontend Stack**:
- **Vercel AI SDK**: `useChat` + `DefaultChatTransport`
- **Streaming**: `POST /api/chat` on the backend
- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + Ant Design
- **Maps**: Mapbox GL

### Backend Setup

```bash
cd backend
cp .env.example .env
# Set GOOGLE_API_KEY (Google AI Studio / Gemini API key)
# Set GOOGLE_GENAI_MODEL (default: gemini-2.5-pro)
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Backend Stack**:
- **Framework**: FastAPI
- **AI**: Google Gemini 2.5 Pro (google.genai SDK)
- **Chat + Tools**: `POST /api/chat` streams responses in the AI SDK UI message format
- **Available Tools**:
  - `get_safety_score` - Get safety score for coordinates
  - `find_nearby_safe_places` - Find nearby police, hospitals, public spaces
  - `trigger_sos_ping` - Trigger SOS (demo)
  - `get_emergency_checklist` - Get situation-specific emergency steps
  - `get_local_emergency_number` - Get emergency numbers by region

---

## 🏗️ Architecture

```
safewander/
├── frontend/          # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Header, NavBar, Bottom Navigation
│   │   │   ├── pages/         # Main pages (Explore, Assistant, Routes, Monitor, Community)
│   │   │   └── submodels/     # Feature-specific components (Map, Sidebar, etc.)
│   │   ├── hooks/             # useGeolocation, useReverseGeocode
│   │   └── lib/               # Utilities
│   └── package.json
│
└── backend/           # FastAPI + Gemini AI
    ├── app/
    │   ├── main.py            # FastAPI app setup
    │   ├── routers/           # API endpoints
    │   ├── services/          # Gemini chat + tool execution
    │   └── schemas/           # Pydantic models
    └── requirements.txt
```

---

## 🔧 Environment Variables

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_COPILOT_RUNTIME_URL=http://localhost:8000/copilotkit
```

### Backend (`.env`)
```
GOOGLE_API_KEY=your_google_gemini_api_key
GOOGLE_GENAI_MODEL=gemini-2.5-pro
PORT=8000
FRONTEND_URL=http://localhost:5173
```

---

## 📱 Mobile-First Design

SafeWander is optimized for mobile devices with:
- Fixed header & footer (always visible)
- Full-screen content scrolling
- Collapsible sidebar on phones
- Touch-friendly navigation
- Safe area support for notched devices

---

## 🔐 Security & Privacy

- Minimal data tracking
- Location shared only with trusted contacts
- No persistent location storage
- User consent for all data sharing
- Emergency override for SOS

---

## 🚀 Getting Started

1. **Clone and setup backend**:
   ```bash
   cd /Users/vedant/Documents/Code/Personal/safewander/backend
   source .venv/bin/activate
   uvicorn app.main:app --reload --port 8000
   ```

2. **Setup frontend** (in another terminal):
   ```bash
   cd /Users/vedant/Documents/Code/Personal/safewander/frontend
   npm run dev
   ```

3. **Open browser**:
   Navigate to `http://localhost:5173`

4. **Test the chatbot**:
   Go to the Assistant tab and try queries like:
   - "What's my safety score?"
   - "Find nearby hospitals"
   - "Show me emergency tips for medical help"

---

## 📝 Notes

- Backend logging is enabled for debugging tool execution and API calls
- Gemini API requires valid billing setup for production use
- Mapbox token required for map features
- All tool responses are demo data; connect to real APIs for production

---

Made with ❤️ at Cursor Community Hackathon Heilbronn
