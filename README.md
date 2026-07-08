# Kate's Greek Adventure 2 — The Birthday Journey 💖

A little hand-made birthday game: walk Kate through a Greek seaside town, collect
the day's treasures, meet everyone who loves her (Mom, Dad, Lucky the dog, and
Lesha), play a beach mini-game, and reach the surprise at Home.

Everything is **hand-drawn in code** (no image files) and runs **100% offline**
once installed — perfect for playing on a phone in Cyprus with no internet.

---

## 🎮 How to play

- Tap and hold **◀ / ▶** (or tap the left/right side of the screen) to walk.
- Walk up to sparkling items — Kate picks them up automatically.
- Walk up to a person or the dog (look for the 💬 bubble) to talk.
- At the beach, drag the basket to catch falling gifts.
- When a scene is finished, a glowing **➡️** appears on the right — walk into it
  to travel to the next place.
- Fill the **Happiness** bar to 100% and reach Home for the birthday surprise 🎂

Progress saves automatically, so you can close it and continue later.

---

## 📱 Play offline on a phone (recommended)

1. Deploy to GitHub Pages (below) — do this **once, while you have internet**.
2. On the phone, open the GitHub Pages link in **Chrome (Android)** or
   **Safari (iPhone)**.
3. Add it to the home screen:
   - **iPhone:** Share button → *Add to Home Screen*.
   - **Android:** menu (⋮) → *Install app* / *Add to Home screen*.
4. Open it from the home-screen icon. It now works **fully offline**, forever —
   no internet needed in Cyprus. ✈️

> Tip: open and play it once while still online so the service worker caches
> everything.

---

## 🚀 Deploy to GitHub Pages

```bash
# from this folder
git add -A
git commit -m "Kate's Greek Adventure 2"
# create an empty repo on github.com first, then:
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: `main` branch, `/root`** → Save.
Your link will be:

```
https://<your-username>.github.io/<repo-name>/
```

The included `.nojekyll` file makes sure GitHub Pages serves the files as-is.

### Run locally to test first

Because it uses JavaScript modules, open it through a tiny local server (not by
double-clicking the file):

```bash
# any one of these, from this folder:
python -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`.

---

## ✏️ Easy things to personalise

- **Dog's name:** `js/scenes.js` → `export const DOG_NAME = "Lucky";`
- **Dialogue / messages:** `js/scenes.js` → each scene's `lines` and `note`.
- **The final birthday message:** `js/main.js` → `triggerFinale()`.
- **Character looks (hair/clothes colours):** `js/art.js` → `CHARS`.
- **Locations & order:** the `scenes` array in `js/scenes.js`.

If you change any file, bump the cache version in `service-worker.js`
(`kate-journey-v1` → `v2`) so phones pick up the new version.

---

Made with 💖 by Lesha.
