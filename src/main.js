import { ForestGame } from './game.js';

const icons = {
  leaf: '<path d="M19 4C9 2 3 7 5 14c6 4 13 1 14-10Z"/><path d="m4 20 10-11"/>',
  sound: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01"/>',
  github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.3-1.7-1-2 4-.5 7-2 7-6a5 5 0 0 0-1.5-3.5A5 5 0 0 0 19 3s-1.5-.5-4.5 1.5a15 15 0 0 0-5 0C6.5 2.5 5 3 5 3a5 5 0 0 0-.5 3.5A5 5 0 0 0 3 10c0 4 3 5.5 7 6-.7.3-1 1-1 2v4"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  crown: '<path d="m3 7 4 4 5-7 5 7 4-4-2 12H5L3 7Z"/><path d="M8 22h8"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 15h6"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const storage = {
  get(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
const characters = [
  { id: 'xiaohei', name: '罗小黑', en: 'XIAOHEI', description: '一只小黑猫，也是一只小猫妖。', tag: '今天也要勇敢一点。', color: '#dce7d5' },
  { id: 'heixiu', name: '嘿咻', en: 'HEIXIU', description: '小小一团，陪你去大大的世界。', tag: '嘿咻！一起出发吧。', color: '#e5e8dc' },
  { id: 'wuxian', name: '无限', en: 'WUXIAN', description: '慢慢来，找到自己的节奏。', tag: '落脚之前，先静下心。', color: '#e2e9e8' },
  { id: 'shanxin', name: '山新', en: 'SHANXIN', description: '把每一次起跳，都变成小冒险。', tag: '下一站，会有什么呢？', color: '#eee3d9' },
];
let selected = characters.find(c => c.id === storage.get('forest-character', 'xiaohei')) || characters[0];
let soundEnabled = storage.get('forest-sound', 'false') === 'true';
let assistEnabled = storage.get('forest-assist', 'true') === 'true';
let assets = {};
let game;

document.querySelector('#app').innerHTML = `
  <header class="site-header shell">
    <a class="brand" href="./" aria-label="小黑的森林，首页"><img src="./assets/favicon.svg" alt="" width="38" height="38"><span>小黑的森林<small>A LITTLE FOREST</small></span></a>
    <span class="header-note">留一点时间，给小小的快乐。</span>
    <nav class="header-actions" aria-label="工具">
      <button class="icon-button" id="sound" type="button" aria-label="开启音效" aria-pressed="false">${icon('mute')}</button>
      <button class="icon-button" id="help" type="button" aria-label="玩法说明">${icon('help')}</button>
      <a class="icon-button" href="https://github.com/line-ar-line/luoxiaohei-jump" target="_blank" rel="noreferrer" aria-label="在 GitHub 查看项目">${icon('github')}</a>
    </nav>
  </header>
  <main class="shell">
    <section class="intro" aria-labelledby="page-title">
      <div><div class="eyebrow"><span class="tiny-leaf">${icon('leaf')}</span> 森林漫游计划 <span class="eyebrow-divider"></span> VOL. 01</div>
      <h1 id="page-title">小黑，<span>跳一跳<svg viewBox="0 0 220 12" aria-hidden="true"><path d="M3 8Q105-2 217 6"/></svg></span><span class="title-dot">。</span></h1>
      <p class="intro-description">不赶路，也不赶时间。和小黑一起，跳进森林的下一站。</p></div>
      <div class="intro-stamp" aria-hidden="true"><span>GOOD DAY TO</span><strong>take a little leap</strong><svg viewBox="0 0 90 30"><path d="M5 20q20-25 39 0t39 0m-7-4 7 4-1-8"/></svg><small>一点点勇气，就够啦</small></div>
    </section>
    <div class="play-layout">
      <section class="game-card" aria-label="跳一跳游戏">
        <div class="forest-stage" id="stage">
          <canvas id="game" tabindex="0" aria-label="跳一跳画面。按住空格或按住画面蓄力，松开跳跃。"></canvas>
          <div class="game-hud"><div class="score-block"><span class="hud-label">本次漫游</span><div><strong id="score">00</strong><span>分</span></div></div><div class="stage-badge"><span></span> 森林 · 自由漫游</div></div>
          <div class="stage-bottom"><span class="stage-caption" id="stage-caption">每一小步，都有好风景。</span><button id="restart" class="stage-restart" type="button" aria-label="重新开始">${icon('restart')}</button></div>
          <div class="game-toast" id="game-toast" role="status" aria-live="polite"></div>
          <div class="asset-status" id="asset-status" role="status">正在邀请森林伙伴…</div>
        </div>
        <div class="game-controls">
          <div class="charge-panel"><div class="charge-label"><span id="charge-label">蓄一点点力</span><span id="charge-percent">0%</span></div><div class="charge-track" role="progressbar" aria-label="蓄力程度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="charge-fill"></div><span></span><span></span><span></span></div><span class="charge-tip">按得越久，跳得越远</span></div>
          <button class="jump-button" id="jump" type="button"><span class="jump-button-text">按住，准备起跳</span>${icon('arrow')}</button>
        </div>
        <div class="game-caption"><span>${icon('keyboard')} <span>长按画面 / 按住空格，松开起跳</span></span><label class="assist-option"><input id="assist" type="checkbox" checked><span class="switch" aria-hidden="true"></span>落点提示</label></div>
      </section>
      <aside class="sidebar" aria-label="角色和游戏记录">
        <section class="companions"><div class="section-heading"><h2>今天，和谁出发？</h2><span>CHOOSE A FRIEND</span></div>
          <div class="character-list" role="group" aria-label="选择角色">${characters.map(c => `<button class="character ${c.id === selected.id ? 'selected' : ''}" type="button" data-character="${c.id}" aria-pressed="${c.id === selected.id}"><span class="portrait" style="--portrait-bg:${c.color}"><img src="./assets/favicon.svg" alt="" data-portrait="${c.id}"></span><span class="character-name">${c.name}<small>${c.en}</small></span><span class="character-mark">${icon('check')}</span></button>`).join('')}</div>
          <div class="friend-note"><span class="note-spark">✳</span><p id="friend-description">${selected.description}</p></div>
        </section>
        <section class="record-card"><div class="record-icon">${icon('crown')}</div><div><span>你的森林纪录</span><div><strong id="best">${String(Number(storage.get('forest-best', '0')) || 0).padStart(2, '0')}</strong><small>分</small></div></div><svg class="record-sprig" viewBox="0 0 50 65" aria-hidden="true"><path d="M24 60Q23 32 36 7M27 40Q6 42 11 22q15 1 16 18Zm4-16Q19 21 25 8q12 4 6 16Zm-5 23q18-2 18-17-16-1-18 17Z"/></svg></section>
        <section class="field-notes"><span class="field-label">森林小贴士</span><h3>把落点，交给一点直觉。</h3><p>落在浮岛中央可得 <b>2 分</b>，<br>连续完美落地，奖励会更多哦。</p><span class="notes-dots" aria-hidden="true">✦ · ·</span></section>
      </aside>
    </div>
    <div class="below-game"><span>${icon('leaf')} 不必每次都跳得很远，开心就好。</span><span>MADE FOR LITTLE MOMENTS</span></div>
  </main>
  <footer class="site-footer shell"><span>《罗小黑战记》同人小游戏 · 非商业 · 角色版权归原权利人所有</span><button id="credits" type="button">素材与制作说明 ${icon('arrow')}</button></footer>
  <dialog id="info-dialog" class="modal"><button class="modal-close icon-button" type="button" aria-label="关闭">${icon('close')}</button><div id="info-content"></div></dialog>
  <dialog id="result-dialog" class="modal result-modal"><span class="modal-eyebrow">A LITTLE REST</span><img class="result-portrait" src="./assets/favicon.svg" alt=""><h2>歇一歇，再出发。</h2><p id="result-message">森林一直在这里等你。</p><div class="result-stats"><div><span>本次得分</span><strong id="result-score">0</strong></div><div><span>完美落地</span><strong id="result-perfect">0</strong></div></div><button class="primary-button" id="play-again" type="button">再跳一次 ${icon('arrow')}</button><button class="text-button" id="close-result" type="button">先看看森林</button></dialog>
`;
const $ = selector => document.querySelector(selector);
const infoDialog = $('#info-dialog');
const resultDialog = $('#result-dialog');
function showInfo(html) { cancelInput(); game.paused = true; $('#info-content').innerHTML = html; infoDialog.showModal(); }
infoDialog.addEventListener('close', () => { game.paused = false; });
$('#help').addEventListener('click', () => showInfo(`<span class="modal-eyebrow">HOW TO PLAY</span><h2>轻轻一跃，刚刚好。</h2><ol class="help-steps"><li><b>按住蓄力</b><p>按住游戏画面、下方绿色按钮，或键盘空格键。</p></li><li><b>松手起跳</b><p>按得越久，跳得越远。瞄准下一座浮岛，不用控制方向。</p></li><li><b>收集好心情</b><p>落地得 1 分，中心落地从 2 分起，连续完美落地奖励递增，最高每跳 6 分。</p></li></ol><p class="modal-footnote">落点提示可以关闭。切换角色会开始新的旅程；每位伙伴的跳跃能力相同。按 Esc 可取消蓄力。</p>`));
$('#credits').addEventListener('click', () => {
  const sourceList = characters.filter(c => assets[c.id]).map(c => `<li><b>${c.name}</b> · <a href="${escapeAttribute(assets[c.id].sourceUrl)}" target="_blank" rel="noreferrer">素材来源 ↗</a></li>`).join('');
  showInfo(`<span class="modal-eyebrow">WITH LOVE, FOR THE FOREST</span><h2>给小黑的一封小情书。</h2><p>这是一个喜爱《罗小黑战记》的非商业同人小游戏。角色名称及原始形象版权属于原权利人。</p><p>角色图片取自公开来源，并做了裁切、透明背景处理与游戏动作差分。待机、蓄力、跳跃、掉落是本项目的二次加工，不代表官方动画素材。</p><ul class="source-list">${sourceList || '<li>素材正在加载，请稍后再试。</li>'}</ul><p>森林浮岛和植物由 Canvas 绘制，音效由浏览器实时合成，没有外部广告或统计服务。最高分保存在你的浏览器中。</p><a class="source-link" href="https://github.com/line-ar-line/luoxiaohei-jump/blob/main/assets/characters/SOURCES.md" target="_blank" rel="noreferrer">查看完整素材记录 ${icon('arrow')}</a>`);
});
function escapeAttribute(text = '') { return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'); }
$('.modal-close').addEventListener('click', () => infoDialog.close());
for (const dialog of [infoDialog, resultDialog]) {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
let audioContext;
function playSound(kind) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    (kind === 'perfect' ? [0, .075, .15] : [0]).forEach((delay, i) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime + delay;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'fall' ? 210 : kind === 'jump' ? 390 : 660 + i * 170, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'fall' ? 90 : kind === 'jump' ? 580 : 790 + i * 120, now + .16);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.065, now + .012); gain.gain.exponentialRampToValueAtTime(.0001, now + .23);
      oscillator.connect(gain).connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + .25);
    });
  } catch {}
}
function renderSound() {
  $('#sound').innerHTML = icon(soundEnabled ? 'sound' : 'mute');
  $('#sound').setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
  $('#sound').setAttribute('aria-pressed', String(soundEnabled));
}
renderSound();
$('#sound').addEventListener('click', () => { soundEnabled = !soundEnabled; storage.set('forest-sound', String(soundEnabled)); renderSound(); playSound('land'); });
$('#assist').checked = assistEnabled;
$('#assist').addEventListener('change', event => { assistEnabled = event.target.checked; game.assist = assistEnabled; storage.set('forest-assist', String(assistEnabled)); });
let toastTimer;
game = new ForestGame($('#game'), {
  assist: assistEnabled,
  onCharge(value) {
    const percent = Math.round(value * 100);
    $('#charge-fill').style.transform = `scaleX(${value})`;
    $('#charge-percent').textContent = `${percent}%`;
    $('.charge-track').setAttribute('aria-valuenow', String(percent));
    $('#charge-label').textContent = value > .9 ? '满满勇气，松手吧' : value > .05 ? '正在攒勇气…' : '蓄一点点力';
    $('#jump').classList.toggle('charging', value > 0);
    $('.jump-button-text').textContent = value > 0 ? '松手，轻轻一跃' : '按住，准备起跳';
  },
  onScore(score, perfect, combo) {
    $('#score').textContent = String(score).padStart(2, '0');
    const oldBest = Number(storage.get('forest-best', '0')) || 0;
    if (score > oldBest) { storage.set('forest-best', String(score)); $('#best').textContent = String(score).padStart(2, '0'); }
    if (score > 0) {
      clearTimeout(toastTimer);
      $('#game-toast').textContent = perfect ? `${combo > 1 ? `${combo} 连击 · ` : ''}完美落地！ +${Math.min(combo + 1, 6)}` : '稳稳落地 +1';
      $('#game-toast').classList.add('visible');
      toastTimer = setTimeout(() => $('#game-toast').classList.remove('visible'), 1150);
    }
  },
  onSound: playSound,
  onEnd({ score, perfectCount, jumps }) {
    $('#result-score').textContent = score; $('#result-perfect').textContent = perfectCount;
    $('#result-message').textContent = jumps > 0 ? `你和${selected.name}走过了 ${jumps} 座浮岛，下次再远一点。` : '第一步也需要练习，再试试轻轻蓄力吧。';
    resultDialog.showModal();
  },
  onState(state) {
    $('#jump').disabled = state === 'jumping' || state === 'falling' || state === 'loading';
    $('#stage-caption').textContent = state === 'over' ? '稍作休息，随时可以重新开始。' : selected.tag;
    $('.jump-button-text').textContent = state === 'over' ? '再来一趟森林漫游' : '按住，准备起跳';
  },
});
function restart() { resultDialog.close(); clearTimeout(toastTimer); $('#game-toast').classList.remove('visible'); game.reset(); }
$('#restart').addEventListener('click', restart);
$('#play-again').addEventListener('click', () => { restart(); $('#jump').focus(); });
$('#close-result').addEventListener('click', () => resultDialog.close());
let pointer = null;
for (const target of [$('#game'), $('#jump')]) {
  target.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || pointer !== null || infoDialog.open || resultDialog.open) return;
    event.preventDefault();
    if (game.state === 'over') restart();
    if (!game.beginCharge()) return;
    pointer = { id: event.pointerId, target }; target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId || pointer.target !== target) return;
    pointer = null; game.release();
  });
  target.addEventListener('pointercancel', event => { if (pointer?.id === event.pointerId) cancelInput(); });
  target.addEventListener('lostpointercapture', event => { if (pointer?.target === target && pointer.id === event.pointerId) cancelInput(); });
}
function cancelInput() { pointer = null; game.cancelCharge(); }
let spaceHeld = false;
window.addEventListener('keydown', event => {
  if (event.code === 'Escape') { spaceHeld = false; cancelInput(); return; }
  if (event.code !== 'Space' || infoDialog.open || resultDialog.open) return;
  if (event.target instanceof HTMLElement && event.target.closest('button, a, input, select, textarea') && event.target !== $('#jump')) return;
  event.preventDefault();
  if (spaceHeld || event.repeat || pointer !== null) return;
  spaceHeld = true;
  if (game.state === 'over') restart();
  game.beginCharge();
});
window.addEventListener('keyup', event => {
  if (event.code !== 'Space' || !spaceHeld) return;
  event.preventDefault(); spaceHeld = false; game.release();
});
window.addEventListener('blur', () => { spaceHeld = false; cancelInput(); });
$('#game').addEventListener('contextmenu', event => event.preventDefault());
$('#jump').addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden) { spaceHeld = false; cancelInput(); } });
async function selectCharacter(character) {
  selected = character; storage.set('forest-character', selected.id);
  document.querySelectorAll('[data-character]').forEach(button => { const active = button.dataset.character === selected.id; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  $('#friend-description').textContent = selected.description;
  $('.result-portrait').src = assets[selected.id]?.portrait || './assets/favicon.svg';
  restart(); await game.setCharacter(assets[selected.id]);
}
document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click', () => { cancelInput(); spaceHeld = false; selectCharacter(characters.find(c => c.id === button.dataset.character)); }));
try {
  const response = await fetch('./assets/characters/manifest.json');
  if (!response.ok) throw new Error('素材清单加载失败');
  assets = await response.json();
  for (const character of characters) {
    const path = assets[character.id]?.portrait;
    if (path) document.querySelector(`[data-portrait="${character.id}"]`).src = path;
  }
  await selectCharacter(selected); $('#asset-status').hidden = true;
} catch (error) {
  console.warn('角色素材未能加载，使用备用小猫。', error);
  $('#asset-status').textContent = '伙伴素材加载失败，先用小猫出发吧';
  await game.setCharacter({ sprites: { idle: './assets/favicon.svg' } });
}
window.forestDebug = () => game.snapshot();
