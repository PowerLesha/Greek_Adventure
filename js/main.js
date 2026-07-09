// main.js — bootstrap: start the platformer, wire the start screen & menu.
import { startPlatformer } from "./platformer.js";
import { Sound } from "./audio.js";

const $ = (id) => document.getElementById(id);

async function boot() {
  const control = await startPlatformer();

  const startScreen = $("startScreen");
  const menu = $("menu");
  const controls = $("controls");
  const btnMenu = $("btnMenu");
  const btnSound = $("btnSound");

  if (control.hasSave()) $("continueBtn").hidden = false;

  // difficulty selection (start screen)
  let currentDiff = "normal";
  const startBtns = document.querySelectorAll("#difficulty .diff-btn");
  const menuBtns = document.querySelectorAll("#menuDifficulty .mdiff-btn");
  function highlight(diff) {
    currentDiff = diff;
    startBtns.forEach((b) => b.classList.toggle("selected", b.dataset.diff === diff));
    menuBtns.forEach((b) => b.classList.toggle("selected", b.dataset.diff === diff));
  }
  highlight("normal");
  startBtns.forEach((btn) => btn.addEventListener("click", () => highlight(btn.dataset.diff)));

  function enterGame() {
    Sound.unlock();
    Sound.startMusic();   // begins on this tap → satisfies mobile audio unlock
    startScreen.classList.add("hidden");
    controls.classList.remove("hidden");
    btnMenu.classList.remove("hidden");
    btnSound.classList.remove("hidden");
  }

  $("startBtn").addEventListener("click", () => { control.newGame(currentDiff); enterGame(); });
  $("continueBtn").addEventListener("click", () => { control.continueGame(); enterGame(); });

  btnMenu.addEventListener("click", () => { highlight(currentDiff); menu.classList.remove("hidden"); });
  $("resumeBtn").addEventListener("click", () => menu.classList.add("hidden"));
  $("restartBtn").addEventListener("click", () => { menu.classList.add("hidden"); control.restart(); });

  // change difficulty mid-game — restarts the run at the chosen setting
  menuBtns.forEach((btn) => btn.addEventListener("click", () => {
    highlight(btn.dataset.diff);
    control.newGame(btn.dataset.diff);
    Sound.startMusic();
    menu.classList.add("hidden");
  }));

  btnSound.addEventListener("click", () => {
    const muted = !Sound.isMuted();
    Sound.setMuted(muted);
    btnSound.textContent = muted ? "🔇" : "🔊";
  });
}

boot();
