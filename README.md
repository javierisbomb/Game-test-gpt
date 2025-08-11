
# 🎡 Friend Pick — Party Game (PWA for iPhone)

A trivia-crack style party game about **how well you know your friends**. One friend secretly picks a card; everyone else guesses which one. Designed to run **free, from iPhone, no Mac** — install via *Add to Home Screen*.

## ✨ Features
- **Pass & Play** mode — works instantly on one device.
- 3–8 players recommended, rotating chooser (👑) each round.
- Scoring: +1 for each correct guesser; chooser gets +1 for each wrong guess.
- **PWA**: offline, full-screen, quick resume.
- Simple content packs (edit `data/categories.json`).

## 🚀 Quick Deploy (GitHub Pages)
1. Upload the entire folder to your repo (keep the structure).
2. Enable **Pages** in repo Settings → Pages → Source = `main` (or `docs`).
3. Open the URL in **Safari on iPhone** → Share → **Add to Home Screen**.

> Tip: If caching bites you after updates, in Safari go to Settings → Clear Website Data for your domain, or bump the `CACHE` version in `service-worker.js`.

## 🕹️ How to Play (Pass & Play)
1. Add all players on the Home screen.
2. Tap **Start**.
3. The choos­er (👑) secretly picks 1 of 4 cards (prompted from categories).
4. Pass the phone to each friend to lock their guess.
5. Reveal & score → next round rotates the chooser.
6. After the set number of rounds, highest score wins.

## 🧩 Customize Content
Edit `data/categories.json`:
```json
{
  "Movies": ["A movie you can watch 100 times", "..."],
  "Food": ["Best midnight snack", "..."],
  "Your Category": ["Your prompt 1", "Your prompt 2"]
}
```
- Add/rename categories and prompts.
- The game auto-mixes real + decoy prompts.

## 🌐 (Optional) Online Play
This project includes a placeholder screen for Online mode. To enable true online play you’ll need a **Firebase** project and add `firebase-config.js` with your keys, then wire simple reads/writes for rooms. (I can do this for you if you want — just say the word.)

Minimal steps if you decide to enable it later:
1. Create a Firebase project (free tier).
2. Enable Firestore or Realtime Database + Anonymous Auth.
3. Create `firebase-config.js` in the project root:
   ```js
   export const firebaseConfig = {
     apiKey: "YOUR_KEY",
     authDomain: "YOUR_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_BUCKET",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
4. Import it in `app.js` and add room logic (I can supply the code on request).

## 📱 iOS Notes
- Use **Safari** to Add to Home Screen (iOS requires HTTPS).
- Audio is minimal and safe for PWAs. No tracking or external calls.
- Works offline after first load.

## 🧪 Tuning
- Change max rounds in `STATE.maxRounds`.
- Tweak scoring and prompt mixing in `app.js`.
- Colors/rounded card look are in `styles.css`.

Enjoy! If you want me to brand this (colors, icon, custom categories, menu music, haptics), tell me the vibe and I’ll spin a new build.
