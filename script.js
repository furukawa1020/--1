// ── Data ──
const PRESETS = {
  kanji: '春眠不覚暁処処聞啼鳥夜来風雨声花落知多少',
  hira:  'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
  kata:  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
  num:   '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
};

// APIで取得した情報をキャッシュする
const CHAR_INFO = {};

let mode          = 'preset';
let projMode      = 'char';
let sentence      = [];
let currentPreset = 'kanji';
let presetChars   = Array.from(PRESETS.kanji);
let currentIndex  = 0;
let gridVisible   = false;

function activeChars() { return mode === 'sentence' ? sentence : presetChars; }

// ── 投影方式切り替え ──
function setProjMode(m) {
  projMode = m;
  document.getElementById('btnModeChar').classList.toggle('active', m === 'char');
  document.getElementById('btnModeSent').classList.toggle('active', m === 'sentence');
  document.body.classList.toggle('sent-proj-mode', m === 'sentence');

  const cm = document.getElementById('charMain');
  const sz = document.getElementById('sizeSlider').value + 'px';
  if (m === 'sentence') {
    cm.classList.add('sentence-mode');
    cm.style.fontSize = sz;
    const text = document.getElementById('sentenceInput').value || '字';
    cm.textContent = text;
  } else {
    cm.classList.remove('sentence-mode');
    cm.style.fontSize = sz;
    const chars = activeChars();
    if (chars.length) cm.textContent = chars[currentIndex];
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  switchPreset(document.querySelector('.preset-tab.active'), 'kanji');
  drawGrid();
  window.addEventListener('resize', drawGrid);
  window.addEventListener('keydown', onKey);
});

// ── Sentence input ──
function onSentenceInput(v) {
  const chars = Array.from(v).filter(c => c.trim() !== '');
  document.getElementById('inputHint').textContent = chars.length + ' 文字';

  if (chars.length === 0) {
    mode = 'preset';
    currentIndex = 0;
    renderStrip();
    renderPreset();
    updateNav();
    setChar('字');
    if (projMode === 'sentence') document.getElementById('charMain').textContent = '字';
    return;
  }

  mode = 'sentence';
  sentence = chars;
  if (currentIndex >= sentence.length) currentIndex = 0;

  if (projMode === 'sentence') {
    const cm = document.getElementById('charMain');
    cm.style.fontSize = document.getElementById('sizeSlider').value + 'px';
    cm.textContent = v;
  } else {
    renderStrip();
    setChar(sentence[currentIndex]);
    updateNav();
  }
}

// ── Set character ──
function setChar(c) {
  const cm = document.getElementById('charMain');
  cm.style.transition = 'opacity 0.12s';
  cm.style.opacity = '0';
  setTimeout(() => {
    cm.textContent = c;
    cm.style.opacity = document.getElementById('opacSlider').value / 100;
    cm.style.transition = 'opacity 0.12s, color 0.3s, font-size 0.2s';
  }, 80);

  document.getElementById('refChar').textContent = c;
  document.getElementById('refF1').textContent   = c;
  document.getElementById('refF2').textContent   = c;
  document.getElementById('refF3').textContent   = c;

  // まずローカルキャッシュを確認、なければAPIで取得
  const cached = CHAR_INFO[c];
  if (cached) {
    document.getElementById('refReading').textContent = cached.reading;
  } else {
    document.getElementById('refReading').textContent = '…';
    fetchKanjiInfo(c);
  }
}

async function fetchKanjiInfo(c) {
  try {
    const res  = await fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(c)}`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    const kun = (data.kun_readings  || []).slice(0, 2).join('・') || '—';
    const on  = (data.on_readings   || []).slice(0, 1).join('') || '';
    const reading = on ? `${on}・${kun}` : kun;
    // キャッシュに保存
    CHAR_INFO[c] = { reading };

    // 現在も同じ文字が表示中なら更新
    if (document.getElementById('refChar').textContent === c) {
      document.getElementById('refReading').textContent = reading;
    }
  } catch {
    if (document.getElementById('refChar').textContent === c) {
      document.getElementById('refReading').textContent = '—';
    }
  }
}

// ── Sentence strip ──
function renderStrip() {
  const strip = document.getElementById('sentenceStrip');
  if (mode !== 'sentence' || sentence.length === 0) { strip.innerHTML = ''; return; }
  strip.innerHTML = sentence.map((c, i) => {
    let cls = 'strip-char';
    if (i === currentIndex) cls += ' current';
    else if (i < currentIndex) cls += ' done';
    return `<div class="${cls}" onclick="jumpTo(${i})">${c}</div>`;
  }).join('');
}

function jumpTo(i) {
  currentIndex = i;
  setChar(activeChars()[i]);
  renderStrip();
  renderPreset();
  updateNav();
}

// ── Font ──
function selectFont(el) {
  document.querySelectorAll('.font-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
  const f = el.dataset.font;
  let family = f, weight = null;
  if (f.includes('; font-weight:')) {
    const parts = f.split('; font-weight:');
    family = parts[0];
    weight = parts[1];
  }
  const cm = document.getElementById('charMain');
  cm.style.fontFamily = family;
  if (weight) {
    cm.style.fontWeight = weight;
    document.getElementById('weightSlider').value = weight;
    document.getElementById('weightVal').textContent = weight;
  }
}

// ── Sliders ──
function setSize(v) {
  document.getElementById('charMain').style.fontSize = v + 'px';
  document.getElementById('sizeVal').textContent = v + 'px';
}
function setOpacity(v) {
  document.getElementById('charMain').style.opacity = v / 100;
  document.getElementById('opacVal').textContent = v + '%';
}
function setWeight(v) {
  document.getElementById('charMain').style.fontWeight = v;
  document.getElementById('weightVal').textContent = v;
}

// ── Color ──
function setCharColor(v) {
  document.getElementById('charMain').style.color = v;
}

// ── Grid ──
function toggleGrid() {
  gridVisible = !gridVisible;
  document.getElementById('gridOverlay').classList.toggle('visible', gridVisible);
  document.getElementById('btnGrid').classList.toggle('active', gridVisible);
}

function drawGrid() {
  const svg  = document.getElementById('gridSvg');
  const area = document.getElementById('projArea');
  const W    = area.clientWidth;
  const H    = area.clientHeight;
  const step = 60;
  let paths  = '';
  for (let x = 0; x < W; x += step)
    paths += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#00000010" stroke-width="0.5"/>`;
  for (let y = 0; y < H; y += step)
    paths += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#00000010" stroke-width="0.5"/>`;
  paths += `<line x1="${W/2}" y1="0" x2="${W/2}" y2="${H}" stroke="#0000001a" stroke-width="1"/>`;
  paths += `<line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="#0000001a" stroke-width="1"/>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = paths;
}

// ── Presets ──
function switchPreset(el, key) {
  document.querySelectorAll('.preset-tab').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentPreset = key;
  presetChars   = Array.from(PRESETS[key]);
  if (mode === 'preset') {
    currentIndex = 0;
    setChar(presetChars[0]);
    updateNav();
  }
  renderPreset();
}

function renderPreset() {
  const chars  = presetChars;
  const active = mode === 'sentence' ? null : chars[currentIndex];
  document.getElementById('presetGrid').innerHTML = chars.map((c, i) =>
    `<div class="preset-char${c === active ? ' active-char' : ''}" onclick="selectPresetChar(${i})">${c}</div>`
  ).join('');
}

function selectPresetChar(i) {
  if (mode === 'sentence') {
    const ta = document.getElementById('sentenceInput');
    ta.value += presetChars[i];
    onSentenceInput(ta.value);
    return;
  }
  currentIndex = i;
  setChar(presetChars[i]);
  renderPreset();
  updateNav();
}

// ── Nav ──
function navChar(dir) {
  const chars = activeChars();
  if (chars.length === 0) return;
  currentIndex = (currentIndex + dir + chars.length) % chars.length;
  setChar(chars[currentIndex]);
  renderStrip();
  renderPreset();
  updateNav();
}

function updateNav() {
  const chars = activeChars();
  document.getElementById('navIndicator').textContent =
    chars.length ? `${currentIndex + 1} / ${chars.length}` : '— / —';
}

// ── Fullscreen ──
function toggleFullscreen() {
  document.body.classList.toggle('fullscreen-mode');
}

// ── Keyboard ──
function onKey(e) {
  if (document.activeElement === document.getElementById('sentenceInput')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); navChar(1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); navChar(-1); }
  if (e.key === 'Escape')     document.body.classList.remove('fullscreen-mode');
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === 'g' || e.key === 'G') toggleGrid();
}
