// Friend Pick — party game (PWA)
// Modes: Pass & Play (local) and optional Online (requires Firebase config).

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const STATE = {
  mode: 'passplay', // 'passplay' | 'online'
  players: [],
  hostIndex: 0,
  round: 1,
  maxRounds: 10,
  deck: {}, // category -> prompts[]
  currentCategory: null,
  currentPrompt: null,
  options: [], // 4 options
  hostPickIndex: null,
  guesses: {}, // playerName -> index
  scores: {}, // playerName -> number
  online: { roomId: null, isHost: false, conn: null, enabled: false }
};

// Load deck
async function loadDeck() {
  const resp = await fetch('./data/categories.json');
  STATE.deck = await resp.json();
}

function shuffle(a) { for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

function screen(container, html) {
  container.innerHTML = html;
}

function showHome() {
  const c = $('#screenContainer');
  screen(c, `
    <section class="section">
      <h1>🎡 Friend Pick</h1>
      <p>A trivia-crack style party game about how well you know your friends. One friend secretly picks a card; everyone else guesses which one.</p>
      <div class="controls">
        <button class="button" id="btnStart">Start (Pass & Play)</button>
        <button class="button secondary" id="btnOnline">Play Online (Optional)</button>
      </div>
    </section>
    <section class="section" style="margin-top:12px">
      <h2>Players</h2>
      <div class="row">
        <div class="field" style="flex:1">
          <label for="nameInput" class="small">Add player name</label>
          <input id="nameInput" placeholder="e.g. Jay" inputmode="text" />
        </div>
        <button class="button" id="btnAdd">Add</button>
      </div>
      <div id="playerList" style="margin-top:12px"></div>
      <div class="small" style="margin-top:8px">Tip: 3–8 players works best. You can edit players anytime.</div>
    </section>
  `);

  $('#btnStart').onclick = () => {
    STATE.mode = 'passplay';
    if (STATE.players.length < 3) alert('Add at least 3 players for best fun.');
    startRound();
  };
  $('#btnOnline').onclick = () => setupOnline();
  $('#btnAdd').onclick = addPlayer;
  $('#nameInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') addPlayer(); });
  renderPlayerList();
}

function addPlayer() {
  const input = $('#nameInput');
  const name = input.value.trim();
  if (!name) return;
  if (STATE.players.includes(name)) { alert('Name already added'); return; }
  STATE.players.push(name);
  STATE.scores[name] = 0;
  input.value = '';
  renderPlayerList();
}

function renderPlayerList() {
  const list = $('#playerList');
  list.innerHTML = '';
  STATE.players.forEach((p,i)=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginBottom = '8px';
    row.innerHTML = `<div class="pill">${i===STATE.hostIndex?'👑':''} ${p}</div>
      <div class="controls"><button class="button ghost" data-i="${i}">Remove</button></div>`;
    list.appendChild(row);
  });
  list.onclick = (e)=>{
    const btn = e.target.closest('button[data-i]');
    if (!btn) return;
    const idx = +btn.dataset.i;
    const name = STATE.players[idx];
    STATE.players.splice(idx,1);
    delete STATE.scores[name];
    if (STATE.hostIndex >= STATE.players.length) STATE.hostIndex = 0;
    renderPlayerList();
  };
}

function randomFromDeck() {
  const cats = Object.keys(STATE.deck);
  const cat = cats[Math.floor(Math.random()*cats.length)];
  const prompts = STATE.deck[cat];
  const prompt = prompts[Math.floor(Math.random()*prompts.length)];
  return { cat, prompt };
}

function makeOptions(prompt, cat) {
  // Create 4 cards: the prompt + 3 decoys from other categories
  const options = [{text: prompt, tag: cat}];
  const cats = Object.keys(STATE.deck).filter(c=>c!==cat);
  while (options.length < 4) {
    const rc = cats[Math.floor(Math.random()*cats.length)];
    const arr = STATE.deck[rc];
    const rp = arr[Math.floor(Math.random()*arr.length)];
    if (!options.find(o=>o.text===rp)) options.push({text: rp, tag: rc});
  }
  return shuffle(options);
}

function startRound() {
  const host = STATE.players[STATE.hostIndex];
  const {cat, prompt} = randomFromDeck();
  STATE.currentCategory = cat;
  STATE.currentPrompt = prompt;
  STATE.options = makeOptions(prompt, cat);
  STATE.hostPickIndex = null;
  STATE.guesses = {};
  showSelectForHost(host);
}

function showSelectForHost(host) {
  const c = $('#screenContainer');
  const cards = STATE.options.map((o, i)=>`
    <div class="card" data-i="${i}">
      <div class="tag">${o.tag}</div>
      <div class="title">${o.text}</div>
    </div>
  `).join('');
  screen(c, `
    <section class="section">
      <h2>Round ${STATE.round} — ${host} is the chooser 👑</h2>
      <p class="small">Pass the phone to <b>${host}</b>. They secretly pick the card that fits them best.</p>
    </section>
    <div class="cardGrid" id="grid">${cards}</div>
    <div class="controls" style="margin-top:12px">
      <button class="button secondary" id="btnReveal">Done Picking</button>
    </div>
  `);
  $('#grid').onclick = (e)=>{
    const el = e.target.closest('.card');
    if (!el) return;
    $$('.card').forEach(x=>x.classList.remove('selected'));
    el.classList.add('selected');
    STATE.hostPickIndex = +el.dataset.i;
  };
  $('#btnReveal').onclick = ()=>{
    if (STATE.hostPickIndex==null) { alert('Pick one card first'); return; }
    showGuessPhase();
  };
}

function showGuessPhase() {
  const chooser = STATE.players[STATE.hostIndex];
  const c = $('#screenContainer');
  const cards = STATE.options.map((o, i)=>`
    <div class="card" data-i="${i}">
      <div class="tag">${o.tag}</div>
      <div class="title">${o.text}</div>
    </div>
  `).join('');
  // Build list of guessers
  const guessers = STATE.players.filter((p, idx)=> idx !== STATE.hostIndex);
  const sel = guessers.map(g=>`<option value="${g}">${g}</option>`).join('');
  screen(c, `
    <section class="section">
      <h2>${chooser} picked secretly</h2>
      <p class="small">Now pass the phone around. Each other player chooses the card they think ${chooser} picked.</p>
      <div class="row" style="margin-top:10px">
        <div class="field" style="flex:1">
          <label class="small">Guessing player</label>
          <select id="guessPlayer">${sel}</select>
        </div>
        <button class="button" id="btnLock">Lock Guess</button>
      </div>
    </section>
    <div class="cardGrid" id="grid">${cards}</div>
    <div class="section" style="margin-top:12px">
      <div class="row"><div>Locked guesses</div><div id="lockedCount" class="pill">0 / ${guessers.length}</div></div>
      <div id="guessList" class="small" style="margin-top:8px;opacity:0.9"></div>
    </div>
    <div class="controls" style="margin-top:12px">
      <button class="button secondary" id="btnScore">Reveal & Score</button>
    </div>
  `);
  let currentPick = null;
  $('#grid').onclick = (e)=>{
    const el = e.target.closest('.card');
    if (!el) return;
    $$('.card').forEach(x=>x.classList.remove('selected'));
    el.classList.add('selected');
    currentPick = +el.dataset.i;
  };
  $('#btnLock').onclick = ()=>{
    const gp = $('#guessPlayer').value;
    if (gp in STATE.guesses) { alert(`${gp} already guessed`); return; }
    if (currentPick==null) { alert('Choose a card'); return; }
    STATE.guesses[gp] = currentPick;
    updateGuessList();
    currentPick = null;
    $$('.card').forEach(x=>x.classList.remove('selected'));
    // move select to next player without guess
    const remaining = guessers.filter(g=> !(g in STATE.guesses));
    if (remaining[0]) $('#guessPlayer').value = remaining[0];
  };
  $('#btnScore').onclick = ()=>{
    const needed = guessers.length;
    const got = Object.keys(STATE.guesses).length;
    if (got < needed) { if(!confirm(`Only ${got}/${needed} guesses locked. Reveal anyway?`)) return; }
    showRevealAndScore();
  };
  function updateGuessList() {
    const el = $('#guessList');
    const items = Object.entries(STATE.guesses).map(([g,i])=>`<div>• <b>${g}</b> → <i>${STATE.options[i].text}</i></div>`).join('');
    el.innerHTML = items || '<i>None yet</i>';
    $('#lockedCount').textContent = `${Object.keys(STATE.guesses).length} / ${guessers.length}`;
  }
}

function showRevealAndScore() {
  const c = $('#screenContainer');
  const chooser = STATE.players[STATE.hostIndex];
  // score: +1 per correct guesser; chooser gets +1 for each person they fooled? We'll do +1 per correct guesser only (co-op vibe).
  let roundPoints = {};
  Object.keys(STATE.scores).forEach(n=> roundPoints[n] = 0);
  for (const [name, pick] of Object.entries(STATE.guesses)) {
    if (pick === STATE.hostPickIndex) {
      roundPoints[name] += 1;
    }
  }
  // Optionally, award 1 to chooser for each wrong guess:
  const totalGuessers = STATE.players.length - 1;
  const correctCount = Object.values(STATE.guesses).filter(i=>i===STATE.hostPickIndex).length;
  const chooserPoints = Math.max(0, totalGuessers - correctCount);
  roundPoints[chooser] += chooserPoints;

  // Apply to STATE.scores
  for (const [n, pts] of Object.entries(roundPoints)) STATE.scores[n] += pts;

  const cards = STATE.options.map((o, i)=>`
    <div class="card ${i===STATE.hostPickIndex?'correct':''}">
      <div class="tag">${o.tag}</div>
      <div class="title">${o.text}</div>
      ${i===STATE.hostPickIndex?'<div class="small" style="margin-top:6px">Picked by 👑 '+chooser+'</div>':''}
    </div>
  `).join('');

  const scoreRows = Object.entries(STATE.scores)
    .sort((a,b)=>b[1]-a[1])
    .map(([n,s])=> `<div class="row"><div class="pill">${n}</div><div><b>${s}</b></div></div>`).join('');

  screen(c, `
    <section class="section">
      <h2>Reveal</h2>
      <p class="small">Correct card highlighted. ${correctCount}/${totalGuessers} guessed right. 👑 ${chooser} earns ${chooserPoints} this round.</p>
    </section>
    <div class="cardGrid">${cards}</div>
    <section class="section" style="margin-top:12px">
      <h3>Scores</h3>
      ${scoreRows}
    </section>
    <div class="controls" style="margin-top:12px">
      <button class="button" id="btnNext">Next Round</button>
    </div>
  `);

  $('#btnNext').onclick = ()=>{
    STATE.round += 1;
    STATE.hostIndex = (STATE.hostIndex + 1) % STATE.players.length;
    if (STATE.round > STATE.maxRounds) {
      showWinners();
    } else {
      startRound();
    }
  };
}

function showWinners() {
  const c = $('#screenContainer');
  const sorted = Object.entries(STATE.scores).sort((a,b)=>b[1]-a[1]);
  const [champ, topScore] = sorted[0];
  const list = sorted.map(([n,s],i)=>`<div class="row"><div class="pill">${i===0?'🏆':''} ${n}</div><div><b>${s}</b></div></div>`).join('');
  screen(c, `
    <section class="section center">
      <h1>🏆 ${champ} wins!</h1>
      <p class="small">Final leaderboard</p>
      <div style="margin-top:12px;text-align:left">${list}</div>
      <div class="controls" style="margin-top:16px; justify-content:center">
        <button class="button" id="btnAgain">Play Again</button>
        <button class="button secondary" id="btnHome">Home</button>
      </div>
    </section>
  `);
  $('#btnAgain').onclick = ()=>{ STATE.round=1; STATE.scores={}; STATE.players.forEach(p=>STATE.scores[p]=0); startRound(); };
  $('#btnHome').onclick = ()=> resetToHome();
}

function resetToHome() {
  STATE.round = 1;
  STATE.hostIndex = 0;
  STATE.scores = {};
  STATE.players.forEach(p=>STATE.scores[p]=0);
  showHome();
}

// Optional online mode stub using Firebase if configured
async function setupOnline() {
  const c = $('#screenContainer');
  screen(c, `
    <section class="section">
      <h2>Play Online (Beta)</h2>
      <p class="small">Works via your own Firebase project. Paste keys into <code>firebase-config.js</code> (see README). If not configured, use Pass & Play.</p>
      <div class="controls">
        <button class="button" id="btnPass">Use Pass & Play Instead</button>
      </div>
    </section>
  `);
  $('#btnPass').onclick = ()=> showHome();
}

async function main() {
  await loadDeck();
  showHome();
}
main();
