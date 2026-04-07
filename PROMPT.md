# Gym Logger — AI Build Prompt

Paste this prompt into Claude (or any capable coding AI) to build the app from scratch.

---

## The Prompt

```
Build a minimal, mobile-first gym logging Progressive Web App called "Gym Logger".

---

## Tech Stack

- Next.js 16 with App Router, React Compiler enabled, TypeScript, src/ directory, @/* import alias
- Tailwind CSS v4 via @tailwindcss/postcss (CSS-first — use @theme inline in globals.css, no tailwind.config.ts)
- Firebase Firestore for the database
- Firebase Auth with Google sign-in
- Lucide React for icons
- babel-plugin-react-compiler for React Compiler support
- Deployed on Vercel

---

## Design Principles

- Mobile-first — used at the gym on a phone
- Minimal taps — logging a set should take < 5 seconds
- Large touch targets — buttons sized for sweaty fingers
- Tactile button feedback — every interactive element has active:scale with spring easing and subtle color/shadow changes on press
- Optimistic UI — update local state first, then sync to Firestore in the background
- Undo over confirmation — for destructive actions on the Home page, show a 5-second undo toast instead of a confirm dialog. History page uses confirmation modals for workout/movement deletion
- Reduced-motion support — all animations respect prefers-reduced-motion

---

## Color Palette & Theme

Support light and dark modes (plus system auto-detect) via CSS custom properties and a .dark class on <html>.

Light theme:
  --bg-primary: #f4f4f5
  --bg-secondary: #ffffff
  --bg-tertiary: #e4e4e7
  --bg-accent: #eff6ff
  --text-primary: #09090b
  --text-secondary: #52525b
  --text-tertiary: #71717a
  --border-color: #d4d4d8
  --accent: #3b82f6  (blue)
  --accent-hover: #2563eb
  --accent-active: #2dd4bf  (teal flash on press)
  --accent-light: #dbeafe
  --text-on-accent: #ffffff
  --success: #10b981
  --danger: #ef4444
  --danger-hover: #dc2626
  --warning: #f59e0b

Dark theme:
  --bg-primary: #0a0a0a
  --bg-secondary: #121212
  --bg-tertiary: #1a1a1a
  --bg-accent: #172033
  --text-primary: #ededed
  --text-secondary: #a1a1aa
  --text-tertiary: #71717a
  --border-color: #27272a
  --accent: #60a5fa
  --accent-hover: #93c5fd
  --accent-active: #5eead4
  --accent-light: #172033
  --text-on-accent: #0a0a0a
  --success: #34d399
  --danger: #f87171
  --danger-hover: #ef4444
  --warning: #fbbf24

Register all tokens with Tailwind using @theme inline { } so they become utility classes like bg-accent, text-text-primary, border-border, etc.

The .bg-accent CSS class must use !important to override Tailwind, and .bg-accent:active must flash to --accent-active.

---

## Shadow & Glass System

Define layered shadow tokens for depth:
  --card-shadow: subtle multi-layer (1px–24px at 4–6% opacity)
  --card-shadow-hover: elevated (8px–40px at 6–8% opacity, dark mode adds accent glow)
  --card-shadow-pressed: compressed (1px–4px)
  --card-shadow-lg: heavy for modals (12px–32px at 6–10% opacity)
  --btn-shadow: accent-colored glow (blue-tinted in both themes)
  --btn-shadow-hover / --btn-shadow-pressed: accent glow intensities

Glass morphism for the bottom nav:
  --glass-bg: rgba(255,255,255,.9) light / rgba(18,18,18,.92) dark
  --glass-border: translucent border color

Custom easing curves:
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1) — for buttons and interactive elements
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1) — for list animations
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1) — for general transitions

---

## Animations

Define these @keyframes in globals.css:
  fadeIn — opacity 0→1, translateY 6px→0
  slideUp — opacity 0→1, translateY 20px→0
  stagger-in — opacity 0→1, translateY 10px→0
  slide-in-right / slide-in-left — opacity 0→1, translateX ±30%→0
  modal-in — opacity 0→1, scale 0.95→1, translateY 8px→0
  shimmer — background-position sweep for skeleton loading
  pulse-ring — scale 0.95→1.05 with opacity pulse
  glow-pulse — box-shadow intensity pulse (accent-colored)

Utility classes: animate-fade-in, animate-slide-up, animate-stagger-in, animate-modal-in, animate-pulse-ring, animate-glow-pulse

Skeleton loading: .skeleton class with shimmer gradient animation on bg-tertiary

All animations must be disabled under @media (prefers-reduced-motion: reduce).

---

## Global CSS Rules

- All elements get default transition on background-color, border-color, color, box-shadow, transform, opacity (200ms ease)
- Inputs/buttons use 150ms duration
- button:active and a:active use 0ms transition for instant feedback
- Buttons and links use spring easing; hover uses ease-out
- .card-depth class: spring easing at 300ms, ease-out on hover at 200ms
- Hide number input spinners (webkit and moz)
- Thin scrollbars (4px, border-color thumb)
- body: -webkit-tap-highlight-color: transparent, min-height: 100dvh

---

## Data Model (Firestore)

All data is scoped per user under users/{userId}/ subcollections:

  users/{userId}/movements/{id}
    name: string
    category: 'Legs'|'Back'|'Chest'|'Shoulders'|'Arms'|'Core'|'Cardio'|'Other'
    isCustom: boolean

  users/{userId}/workouts/{id}
    date: string  (YYYY-MM-DD)
    entries: WorkoutEntry[]  (embedded array — one doc per workout session)
    createdAt: number
    completed: boolean

  users/{userId}/templates/{id}
    name: string
    entries: TemplateEntry[]
    createdAt: number
    order: number

  users/{userId}/settings/current
    unit: 'kg' | 'lbs'
    theme: 'system' | 'light' | 'dark'

WorkoutEntry: { id, movementName, reps, weight, unit, notes, createdAt }
TemplateEntry: { movementName, reps, weight, unit }

Embedding entries in the workout document keeps reads cheap — one Firestore read per workout.

---

## Firestore Helper Rules

- All helpers live in src/lib/firestore.ts
- addEntryToWorkout delegates to addEntriesToWorkout (which does one read + one write)
- addEntriesToWorkout takes an array — used by template loading to write all entries in a single Firestore operation (not a loop of individual writes)
- When deleting entries, if the workout becomes empty (0 entries), delete the whole workout document
- getWorkouts filters out workouts with 0 entries before returning

---

## Authentication

- Firebase Google Auth via signInWithPopup, with signInWithRedirect as fallback
- AuthContext wraps the whole app and exposes { user, loading, logout }
- On first login, AuthContext auto-seeds default movements (~60 exercises) and initial templates (3 pre-built routines)
- AuthGuard component redirects to /login if user is null
- SettingsContext loads user settings from Firestore on sign-in
- ThemeContext applies .dark to document.documentElement based on settings.theme, with localStorage persistence

---

## App Layout

Root layout (src/app/layout.tsx):
- Geist font via next/font/google (--font-geist-sans variable)
- Provider order: AuthContextProvider > ThemeProvider > SettingsProvider > AuthGuard > ErrorBoundary
- Main content wrapped in PageTransition for direction-aware slide animations between tabs
- Main content: mx-auto max-w-lg px-4 with pt using max(1rem, env(safe-area-inset-top)) for iOS notch
- pb-24 to clear the bottom nav
- Metadata includes manifest.json reference and appleWebApp config (black-translucent status bar)
- Viewport: device-width, initial-scale 1, maximum-scale 1, viewport-fit cover
- Theme color meta tags for both light (#f8fafc) and dark (#0b0f1a) schemes

Bottom navigation bar (BottomNav component):
- Fixed to bottom, full width, max-w-lg centred
- Glass morphism background (bg-glass-bg, backdrop-blur-xl, border-t border-border)
- Accounts for iOS home indicator with h-[env(safe-area-inset-bottom)] spacer
- 5 tabs: Workout (/), Templates (/templates), Movements (/movements), History (/history), Settings (/settings)
- Icons from lucide-react: Activity, ClipboardList, Dumbbell, BarChart2, Settings
- Active tab: text-accent, scale-105, drop-shadow glow. Inactive: text-text-tertiary with hover:text-accent/70
- Active tab indicator: small accent-colored dot below the label
- Tab labels: uppercase, bold, letter-spaced, 10px font size
- Each tab has active:scale-90 for tactile press feedback

---

## Pages

### / (Home)
- Loads today's workout lazily (only creates a Firestore doc when the first set is logged)
- WorkoutForm at top: movement name field (autocomplete from movements library), reps, weight, Log Set button + Repeat Last Set shortcut
- After logging, re-focus the movement input for fast consecutive logging
- WorkoutList below: entries grouped by movement name, each group showing all sets
- Inline edit: tap a weight or rep value to edit it in place
- Duplicate set: button to copy a set (same movement, reps, weight)
- Volume summary in the "Logged Sets" header: "N sets · X kg total"
- Delete movement (all its sets): immediate with 5-second undo toast (restores to original position in list)
- If all entries are removed, clear local state but keep workout doc for potential undo
- "Finish Workout" button at bottom with double-tap confirmation (first tap shows "Tap again to confirm", resets after timeout)
- Success toast after finishing: shows set count and total volume, then navigates or resets

### /history
- Past workouts grouped by week (Sunday-start week boundaries), newest first
- Week headers: "Week of Mon DD — Mon DD" in accent color
- Each workout is a collapsible card with card-depth shadow and hover elevation
- Card header: relative date label (Today/Yesterday/weekday name or short date), movement preview, set count badge, expand/collapse chevron, delete button
- Expanded: WorkoutList with inline edit, duplicate, and delete capabilities (same as home)
- Delete individual sets: immediate (if last set, removes workout)
- Delete movement (all sets for a movement): confirmation modal with Cancel/Delete buttons
- Delete entire workout: confirmation modal with Cancel/Delete buttons
- Both modals: backdrop blur, animate-modal-in, escape key to dismiss
- Deleting last entry auto-removes the workout from the list and Firestore
- Filter out 0-entry workouts on load
- StaggeredList animation for workout cards
- Skeleton loading state while fetching

### /templates
- List of saved workout templates
- Each template card: name, movement preview, Load / Edit / Delete buttons
- Load button:
  - Shows spinner while loading
  - Writes all entries in ONE Firestore call (addEntriesToWorkout)
  - Shows green checkmark "Loaded!" for 1.2s then navigates to /
- Edit button: opens TemplateEditor inline (replaces the page content)
- Delete button: immediate, no confirmation
- Reorder templates with up/down arrow buttons (optimistic, background save)
- "Save current workout as template" button (shown when today's workout has entries)
- Auto-sync: template weights/reps update to match the latest values from workout history

### /movements
- Full movement library grouped by category
- Category filter buttons at top (All + each category)
- Search input for filtering movements by name
- List of movements with edit (name and category) and delete buttons
- Delete is immediate, no confirmation
- Add custom movement form: name + category dropdown
- Seeded on first login with ~60 common gym exercises across all categories

### /settings
- Profile section: shows user email and Log Out button (red accent)
- Appearance section: System / Light / Dark toggle (3-column grid, active = bg-accent with shadow)
- Weight Unit section: kg / lbs toggle (2-column grid, active = bg-accent with shadow)
- Data section: "Export All Data as CSV" button (downloads gym-log-YYYY-MM-DD.csv)
- CSV format: Date, Movement, Weight, Unit, Reps, Notes columns with proper escaping
- Footer: "Gym Logger • Built with Next.js & Firebase"
- All sections use card-depth cards with hover elevation

### /login
- Centered card on a themed background
- "Sign in with Google" button with Google SVG icon (inline, not external URL)
- Also offers redirect sign-in as secondary option
- Handles popup blocked by falling back to redirect
- Error display with dismiss capability

### /seed (dev utility)
- Not linked in nav
- Button to seed default movements (idempotent — skips if already seeded)
- Button to seed initial templates (idempotent)

---

## Components

### WorkoutForm
- Three fields: movement (text, autocomplete), reps (number), weight (number)
- Autocomplete dropdown from movements library, filtered as user types (top 8 matches)
- Smart defaults: prefills reps/weight from the last logged set of the same movement
- "Log Set" primary button (bg-accent, large, full width)
- "Repeat Last Set" secondary button (shows movement name of last logged set)
- Collapsible notes field
- Inputs sized for mobile (text-lg, py-3.5, rounded-xl)

### WorkoutList
- Groups entries by movementName
- Movement header: name, set count, delete-all button (trash icon)
- Each set row: set number, reps × weight display, duplicate button, edit pencil icon, delete trash icon
- Tapping reps or weight makes it an inline <input> that saves on blur/enter
- All icon buttons have tactile press feedback

### TemplateEditor
- Movement search input with autocomplete dropdown
- Clicking a movement adds it to the template
- Each template entry shows: movement name, reps/weight inputs, reorder/duplicate/delete controls
- Undo system: 5-second toast when deleting a movement, restores to original position
- Cancel and Save buttons in the header

### PageTransition
- Direction-aware slide animations between tabs (left/right based on tab order in BottomNav)
- Wraps all page content in the root layout

### StaggeredList
- Wraps children in staggered fade-in animation (50ms delay per item)
- Used for list rendering in history and elsewhere

### ErrorBoundary
- Catches React errors and shows a fallback UI with refresh button

### Skeleton
- SkeletonCard: card-shaped loading placeholder with shimmer
- SkeletonList: multiple skeleton cards for list loading states

### AuthGuard
- Redirects unauthenticated users to /login
- Shows loading skeleton while checking auth state

---

## Default Data

### Default Movements (~60 exercises)
Seeded on first login via AuthContext, organized by category:
- Legs: Squat, Front Squat, Hack Squat, Leg Press, Romanian Deadlift, Walking Lunge, Bulgarian Split Squat, Leg Extension, Leg Curl, Hip Thrust, Calf Raise, Goblet Squat
- Back: Deadlift, Barbell Row, Dumbbell Row, Seated Cable Row, T-Bar Row, Pull-Up, Chin-Up, Lat Pulldown, Face Pull, Shrug
- Chest: Bench Press, Incline Bench Press, Dumbbell Bench Press, Incline Dumbbell Press, Cable Fly, Dumbbell Fly, Chest Dip, Push-Up, Machine Chest Press
- Shoulders: Overhead Press, Dumbbell Shoulder Press, Arnold Press, Lateral Raise, Front Raise, Reverse Fly, Upright Row
- Arms: Barbell Curl, Dumbbell Curl, Hammer Curl, Preacher Curl, Cable Curl, Tricep Pushdown, Overhead Tricep Extension, Skull Crusher, Close-Grip Bench Press, Tricep Dip
- Core: Plank, Hanging Leg Raise, Cable Crunch, Ab Wheel Rollout, Dead Bug, Russian Twist, Decline Sit-Up
- Cardio: Running, Rowing Machine, Stationary Bike, Jump Rope, Stair Climber

### Pre-Built Templates (3 routines)
Seeded on first login alongside movements. Three "Majestic" full-body routines with varied movements, reps, and weights.

---

## PWA

public/manifest.json:
{
  "name": "Gym Logger",
  "short_name": "GymLog",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#050B14",
  "theme_color": "#050B14",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}

---

## Firebase Security Rules (production)

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

---

## .gitignore must include

/node_modules, /.next/, .env*, .env.local, firebase-debug.log*, .vercel, *.tsbuildinfo, next-env.d.ts, .DS_Store

---

## Environment Variables (.env.local)

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

---

## Deployment

- GitHub repo → Vercel (auto-detects Next.js, deploys on every push to main)
- Set all NEXT_PUBLIC_* env vars in Vercel project settings
- Add Vercel domain to Firebase Console → Authentication → Authorised domains

---

Build the complete app. Start with the scaffolding, types, Firebase config, and Firestore helpers, then contexts, then components, then pages. Make sure `npx next build` passes with no errors before finishing.
```
