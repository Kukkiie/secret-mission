const $ = (sel) => document.querySelector(sel);

// ========== CONFIG ==========
const CONFIG = { ACCESS_CODE: "26111996" };

// ========== SCREENS ==========
const screenGate = $("#screen-gate");
const screenHBD  = $("#screen-hbd");

const codeInput = $("#codeInput");
const enterBtn  = $("#enterBtn");
const gateMsg   = $("#gateMsg");

// music
const bgMusic = $("#bgMusic");
const heavenSound = $("#heavenSound");
const manuSong = $("#manuSong");

// gate -> page2
function unlockGate(){
  const v = (codeInput?.value || "").trim();

  if (v === CONFIG.ACCESS_CODE) {
    gateMsg.textContent = "";

    screenGate.classList.remove("active");
    screenGate.setAttribute("aria-hidden","true");

    screenHBD.classList.add("active");
    screenHBD.setAttribute("aria-hidden","false");

    // play once on enter HBD
    if (bgMusic) {
      bgMusic.currentTime = 0;
      bgMusic.play().catch(()=>{});

      bgMusic.onended = () => {
        setTimeout(()=>{
          $(".wish-box")?.classList.add("show");
        }, 500);
      };
    }
  } else {
    gateMsg.textContent = "incorrect, try again";
  }
}

enterBtn.addEventListener("click", (e)=>{
  e.preventDefault();
  unlockGate();
});

codeInput.addEventListener("keydown",(e)=>{
  if(e.key==="Enter"){
    e.preventDefault();
    unlockGate();
  }
});

// ========== WISH FLOW ==========
const wishInput  = $("#wishInput");
const sendWishBtn = $("#sendWishBtn");

const popupJesus  = $("#popupJesus1");
const popupFinish = $("#popupFinish");
const replayBtn   = $("#replayBtn");

wishInput.addEventListener("input",()=>{
  sendWishBtn.disabled = wishInput.value.trim().length === 0;
});

sendWishBtn.addEventListener("click", () => {
  wishInput.value = "";
  sendWishBtn.disabled = true;

  popupJesus.style.display = "flex";
  popupJesus.setAttribute("aria-hidden", "false");

  if (heavenSound) {
    heavenSound.currentTime = 0;
    heavenSound.play().catch(()=>{});
  }
});

// ========== MIC BLOW DETECT ==========
const micBtn = $("#micBtn");
const micStatus = $("#micStatus");
const realCandle = $("#realCandle");

let audioCtx, analyser, dataArray, source, micStream;
let listening = false;

micBtn.addEventListener("click", () => {
  // hide jesus popup
  popupJesus.style.display = "none";
  popupJesus.setAttribute("aria-hidden","true");

  // stop heaven sound
  if (heavenSound) {
    heavenSound.pause();
    heavenSound.currentTime = 0;
  }

  // Stop all music before mic
  bgMusic?.pause();
  if (bgMusic) bgMusic.currentTime = 0;

  manuSong?.pause();
  if (manuSong) manuSong.currentTime = 0;

  // Blow Mode (hide wish-ui)
  document.body.classList.add("blow-mode");

  enableMic();

  // CLICK CAKE = BLOW (fallback)
  const cakeArea = document.querySelector(".cake-wrap");
  cakeArea.addEventListener("click", () => {
    if (popupFinish.style.display === "flex") return;
    listening = false;
    turnOffCandle();
  });
});

// ===================== ENABLE MIC (iPhone-safe) ===================== //
async function enableMic(){
  try{
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true
      }
    });

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // iPhone requires resume after gesture
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;

    dataArray = new Uint8Array(analyser.frequencyBinCount); // <<<<<< แก้
    source = audioCtx.createMediaStreamSource(micStream);
    source.connect(analyser);

    listening = true;     // <<<<<< สำคัญมาก
    listenLoop();
  } catch (err) {
    console.log(err);
    micStatus.textContent = "microphone blocked in Safari";
  }
}

// ===================== LISTEN LOOP =====================
function listenLoop() {
  let blow = 0;

  const FRAMES = 8;
  const CALIBRATE_MS = 800;
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  let baseline = 0;
  let calibrated = false;
  let startTime = performance.now();
  let THRESHOLD = 999;

  const timeData = new Uint8Array(analyser.fftSize);

  function loop() {
    if (!listening) return;

    // --- time-domain RMS ---
    analyser.getByteTimeDomainData(timeData);
    let tsum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      tsum += v * v;
    }
    const volume = Math.sqrt(tsum / timeData.length) * 100; // 0–100+

    // ---------- 1) calibration ----------
    if (!calibrated) {
      baseline = Math.max(baseline, volume);

      if (performance.now() - startTime < CALIBRATE_MS) {
        micStatus.textContent = "listening…";
        requestAnimationFrame(loop);
        return;
      }

      calibrated = true;
      const delta = isIOS ? 8 : 14;
      THRESHOLD = baseline + delta;

      micStatus.textContent = "blow the candle…";
    }

    // ---------- candle motion ----------
    const strength = Math.min(1, Math.max(0, (volume - baseline) / 35));

    if (volume > baseline + 2) {
      realCandle.classList.add("blowing");
      realCandle.style.setProperty("--wind-y", `${8 * strength}px`);
      realCandle.style.setProperty("--wind-sx", `${1 - 0.35 * strength}`);
      realCandle.style.setProperty("--wind-sy", `${1 - 0.5 * strength}`);
    } else {
      realCandle.classList.remove("blowing");
    }

    // ---------- 2) blow detect ----------
    if (volume > THRESHOLD) {
      blow++;
    } else {
      blow = Math.max(0, blow - 1);
    }

    if (blow >= FRAMES) {
      listening = false;
      micStream?.getTracks().forEach(t => t.stop());
      turnOffCandle();
      return;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

// ---
function turnOffCandle(){
  realCandle.classList.remove("blowing");
  realCandle.classList.add("off");

  setTimeout(()=>{
    popupFinish.style.display="flex";
    popupFinish.setAttribute("aria-hidden","false");
    popupFinish.classList.add("show");
  },600);

  if (manuSong) {
    manuSong.currentTime = 0;
    manuSong.play().catch(()=>{});
  }
}

// =================== REPLAY BUTTON ===================
replayBtn.addEventListener("click", () => {
  // hide finish popup
  popupFinish.style.display = "none";
  popupFinish.setAttribute("aria-hidden","true");
  popupFinish.classList.remove("show");

  // stop Man U song
  if (manuSong) {
    manuSong.pause();
    manuSong.currentTime = 0;
  }

  // reset candle
  realCandle.classList.remove("off","blowing");

  // remove blow mode (bring back wish-ui later)
  document.body.classList.remove("blow-mode");

  // stop HBD song + reset wishbox
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }
  $(".wish-box")?.classList.remove("show");
  wishInput.value = "";
  sendWishBtn.disabled = true;

  // go back to PAGE 1 (Security Gate)
  screenHBD.classList.remove("active");
  screenHBD.setAttribute("aria-hidden","true");

  screenGate.classList.add("active");
  screenGate.setAttribute("aria-hidden","false");

  // reset gate input/msg
  codeInput.value = "";
  gateMsg.textContent = "";
});