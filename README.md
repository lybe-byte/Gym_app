# Gym Logger 🏋️‍♂️

A minimal, professional, and mobile-first gym logging Progressive Web App (PWA) built with Next.js and Firebase.

## 🚀 Features

- **Efficient Logging**: Log your sets with reps and weight using a layout optimized for small screens.
- **Smart Suggestions**: Auto-complete and suggestions for movement names as you type.
- **Workout Tracking**: View today's progress or review past workouts.
- **Custom Templates**: Save and reuse your favorite workout routines.
- **Multi-Unit Support**: Seamlessly switch between **kg** and **lbs**.
- **Dark Mode**: Fully supported dark/light themes that sync with your device or preference.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com)
- **Database/Auth**: [Firebase](https://firebase.google.com)
- **Icons**: [Lucide React](https://lucide.dev)

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd gym-app
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📱 Mobile Optimized

Gym Logger is designed with a mobile-first philosophy. To install it as a PWA, open the app in your mobile browser and select "Add to Home Screen".
