# NextStep AI — Frontend Client

> **React 19 + Vite 8 + Tailwind CSS 4 Single-Page Application (SPA)**  
> User interface and client-side experience for the NextStep AI scholarship engine.

---

## 🗂️ Architecture & Folder Structure

```
frontend/
├── public/
│   └── logo.png              # Official NextStep AI compass logo
├── src/
│   ├── main.jsx              # React 19 application entry point
│   ├── App.jsx               # Central root orchestrator (screens, state, routing)
│   ├── api.js                # API client adapter for Backend (:8000) & AI RAG (:8001)
│   ├── explain.js            # Offline rule-based explanation synthesizer
│   ├── constants.js          # Design tokens, scoring field weights, badge color maps
│   ├── index.css             # Tailwind 4 stylesheet imports
│   ├── components/
│   │   ├── Navbar.jsx        # Navigation header with logo, user display, and logout
│   │   ├── NavTabs.jsx       # Secondary tab navigation (Dashboard, Detail, Roadmap, Parent)
│   │   ├── Header.jsx        # Screen title and descriptive subtitle banner
│   │   ├── Toast.jsx         # Non-intrusive floating feedback notification
│   │   ├── SkeletonLoader.jsx# Animated placeholder while awaiting API responses
│   │   └── Footer.jsx        # Bottom branding and copyright (hidden on printing)
│   └── screens/
│       ├── LandingScreen.jsx     # Marketing landing page with hero CTA
│       ├── LoginScreen.jsx       # Student login form (stores in React state)
│       ├── AccountScreen.jsx     # User settings and profile preview
│       ├── IntakeScreen.jsx      # 4-stage intake form with GPA converter & autosave
│       ├── DashboardScreen.jsx   # Ranked scholarship matches with Plan A/B/C filters
│       ├── DetailScreen.jsx      # Deep-dive with score bars & currency stress test
│       ├── RoadmapScreen.jsx     # Document checklist tracker & timeline milestones
│       └── ParentViewScreen.jsx  # Printable multi-scholarship financial comparison
├── vercel.json               # Vercel configuration for SPA URL rewrites
├── .env.example              # Environment variables template
├── package.json              # Dependencies and script definitions
└── vite.config.js            # Vite build configuration
```

---

## 🖥️ Screen-by-Screen Breakdown

### 1. `LandingScreen.jsx`
- **Purpose**: Welcoming entry point designed to convert visiting students.
- **Key Elements**:
  - Compass brand emblem and high-contrast typography.
  - 3-step explainer cards detailing the matching, verification, and roadmap process.
  - "Get My Matches" primary Call to Action (routes to `intake` if logged in, or `login` if guest).

### 2. `LoginScreen.jsx`
- **Purpose**: Basic student identification for session personalization.
- **Data Behavior**: Captures `name` and `email` and updates `App.jsx` state.
- **Note**: Does not contact the backend; no credentials or passwords are saved to the database. Refreshing the browser resets the session.

### 3. `AccountScreen.jsx`
- **Purpose**: Account overview and profile snapshot.
- **Key Elements**: Shows the active user's name, email, and current application status.

### 4. `IntakeScreen.jsx` ⭐ *(Core Input Engine)*
- **Purpose**: Gathers comprehensive academic and socioeconomic data needed for matching.
- **Special Features**:
  - **4-Stage Progress Bar**: Breaks intake into Personal Info $\rightarrow$ Academic $\rightarrow$ Financial $\rightarrow$ Preferences.
  - **Live Grade Converter**: Converts percentage marks or 5.0 CGPA scales into standard 4.0 CGPA format.
  - **Local Autosave**: Form changes continuously synchronize to `localStorage` under `nextstep_intake_draft_v1`.
  - **Draft Restorer**: Detects previous unfinished drafts and provides a 1-click restore button.
- **Submissions**: Calls `handleSubmit(profile)` which fires `POST /match` and `POST /analyze` simultaneously.

### 5. `DashboardScreen.jsx` ⭐ *(Opportunity Discovery)*
- **Purpose**: Ranked presentation of scholarship opportunities.
- **Special Features**:
  - **Plan Tiers**:
    - **Plan A (Reach / Overseas)**: Scholarships with fit score $\ge 75$ or international institutions.
    - **Plan B (Realistic)**: Verified eligible awards with fit score $< 75$.
    - **Plan C (Safety / Domestic)**: Need-based safety nets and partial matches.
  - **Savings Tracker**: Gradient emerald widget calculating estimated student rupee savings.
  - **Country Filtering**: Live tag filtering by individual destination countries.
  - **Quick Metrics**: Fit score badge (e.g. `92/100`), eligibility tag (`Eligible`, `Partial Match`), and primary reason.

### 6. `DetailScreen.jsx` ⭐ *(Deep-Dive & Verification)*
- **Purpose**: Transparent analysis for an individual scholarship.
- **Special Features**:
  - **Horizontal Score Breakdown**: Visual progress bars across all 5 evaluation dimensions (Academic 30%, Field 25%, Funding 20%, Country 15%, Domicile 10%).
  - **AI Explanation Box**: Dark styled card featuring Gemini-generated fit reasons (or offline heuristic justification if RAG is inactive).
  - **Gap-to-Action Callout**: Outlines specific shortcomings or criteria the student must address.
  - **Currency Stress-Test**: Interactive toggle simulating baseline, $+15\%$, and $+30\%$ PKR exchange rate fluctuations on tuition and living costs.
  - **Official Portal Link**: Direct link to the official scholarship authority website.

### 7. `RoadmapScreen.jsx` *(Application Preparation)*
- **Purpose**: Practical checklist and preparation guide.
- **Special Features**:
  - **Deadline Alerts**: Highlights imminent deadlines requiring prompt submission.
  - **Dynamic Checklists**: Customized document requirements (e.g., CNIC, Domicile, Transcripts, Income Statements, Passport, IELTS/TOEFL).
  - **Checklist Progress Bar**: Real-time completion percentage tracking.
  - **AI Strategy Plan**: Incorporates structured milestone roadmaps generated by the AI RAG layer.

### 8. `ParentViewScreen.jsx` ⭐ *(Family Financial Summary)*
- **Purpose**: Transparent, jargon-free report designed specifically for parents and financial sponsors.
- **Special Features**:
  - **Top Match Spotlight**: Highlights the student's highest-ranked eligible opportunity.
  - **Key Metric Cards**: Total Annual Cost (PKR), Award Subsidy (PKR), and Family Out-of-Pocket Gap (PKR).
  - **Multi-Scholarship Comparison Table**: Displays all eligible and partial matches side-by-side with total cost, coverage amount, family gap, and status.
  - **Cumulative Totals Footer**: Computes total aid eligibility across all opportunities.
  - **Print & PDF Export**: Instant `window.print()` formatting with hidden navigation elements (`print:hidden`).

---

## 📡 API Layer (`src/api.js`)

All communication to external microservices is centralized in `src/api.js`.

### Environment Configuration
```javascript
export const API_BASE    = import.meta.env.VITE_API_BASE    || "http://127.0.0.1:8000";
export const AI_RAG_BASE = import.meta.env.VITE_AI_RAG_BASE || "http://127.0.0.1:8001";
```

### Core Methods

| Method | Target | Purpose |
|---|---|---|
| `fetchMatches(profile)` | Backend `POST /match` | Dispatches student profile, parses returned `MatchResult[]`, and executes `adaptMatch()` to enrich with UI properties. |
| `fetchAnalysis(profile)` | AI RAG `POST /analyze` | Fetches Gemini-generated rationales, gap diagnosis, and application milestones. Runs safely with `.catch(() => null)` fallback. |
| `adaptMatch(rawMatch)` | *Internal Transformer* | Formats raw database rows by injecting document checklists, PKR cost models, deadline indicators, and fallback status styles. |

---

## 🎨 Theme & Styling System

The application uses an emerald/teal trust-focused palette:

| Color Concept | Tailwind Tokens | Usage |
|---|---|---|
| **Primary Brand** | `bg-emerald-800`, `bg-emerald-900` | Navigation header, buttons, badges, printable accents |
| **Secondary Accent** | `bg-teal-900`, `text-teal-400` | Gradient highlights and secondary tags |
| **Backgrounds** | `bg-stone-50`, `bg-slate-50`, `bg-white` | Body, cards, and modal containers |
| **Primary Text** | `text-slate-900` | Headings and high-contrast copy |
| **Subdued Text** | `text-slate-500`, `text-slate-600` | Subtitles, labels, and timestamps |
| **Eligibility: Eligible** | `bg-emerald-100 text-emerald-800` | High fit status indicators |
| **Eligibility: Partial** | `bg-amber-100 text-amber-800` | Conditional match indicators |
| **Eligibility: Ineligible** | `bg-rose-100 text-rose-800` | Disqualified match indicators |

---

## 🚀 Running Frontend Locally

```powershell
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

App will be live at `http://localhost:5173`.

---

## 📦 Building for Production

```powershell
# Run production build
npm run build

# Preview build locally
npm run preview
```

Output is compiled to the `frontend/dist/` directory.

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. Select **Root Directory**: `frontend`.
5. Under **Environment Variables**, configure:
   - `VITE_API_BASE`: URL of your deployed backend (e.g., `https://nextstepai-backend.onrender.com`)
   - `VITE_AI_RAG_BASE`: URL of your deployed AI RAG (e.g., `https://nextstepai-rag.onrender.com`)
6. Click **Deploy**. Vercel will build and serve your application with custom domains and SSL.
