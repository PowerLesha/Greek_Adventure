# Kate's Greek Adventure — The Birthday Quest 💖

A little hand-made birthday game: a **point-and-click adventure** through a Greek
seaside town. Kate's husband has hidden a birthday surprise in the music box at
home — solve your way around town, gathering and combining the right things to
reach it. Along the way you meet everyone who loves her (Mom, Dad, and the dog).

The town is **hand-drawn in code**; the character portraits can use **real
photos** you drop into `assets/faces/` (see that folder). It runs **100% offline**
once installed — perfect for playing on a phone in Cyprus with no internet.

---

## 🎮 How to play

- **Tap things** in the scene to look at them and pick them up (sparkles show
  what you can interact with).
- **Tap a person** (look for the 💬 bubble) to talk to them.
- To **use an item**: tap it in the bar at the bottom, then tap where to use it
  (tap it again to cancel).
- Tap the glowing **◀ / ▶** arrows at the screen edges to walk between places.
- Every puzzle needs something from another place — explore, then work out what
  goes where. Reach the music box at home for the birthday surprise 🎂

The puzzle chain: steady the wobbly café table with a **coaster** to fish out
Dad's **glasses** → trade them to Dad for **honey** → bring the honey (and a
**basket**) to Mom for the **cake** → give the beach dog a **bone** so he digs up
the **key** → open the music box at home. 🎁

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

## 📸 Real photo faces

Drop a photo of each person into `assets/faces/` using these names:
`kate`, `husband`, `mom`, `dad`, `dog` (`.jpg`, `.jpeg`, `.png` or `.webp`).
They're cropped to round portraits automatically and shown when that character
talks. Any that are missing simply fall back to the hand-drawn portrait, so the
game always works. Photos never leave the device.

## ✏️ Easy things to personalise

- **Names (husband, dog, etc.):** `js/game.js` → `STRINGS`.
- **Dialogue / messages:** `js/game.js` → each scene's handlers and the finale
  in `checkFinale()`.
- **Puzzles, items & locations:** `js/game.js` → `scenes` and `items`.
- **Hand-drawn character looks (hair/clothes colours):** `js/art.js` → `CHARS`.

If you change any file, bump the cache version in `service-worker.js`
(`kate-adventure-v3` → `v4`) so phones pick up the new version.

---

Made with 💖 by Lesha.
