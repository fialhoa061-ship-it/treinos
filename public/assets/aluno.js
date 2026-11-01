(() => {
  const app = document.getElementById('app');
  let D, W, state;
  const key = () => `treino:${TOKEN}:${W.id}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = () => localStorage.setItem(key(), JSON.stringify(state));
  const load = () => {
    let s; try { s = JSON.parse(localStorage.getItem(key())); } catch {}
    s = s || {}; s.done ??= {}; s.w ??= {}; s.r ??= {};
    return s;
  };

  // ---- vídeo ----
  function embed(url) {
    let m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/))) return {t: 'iframe', src: `https://www.youtube.com/embed/${m[1]}?autoplay=1`};
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return {t: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1`};
    if (/\.mp4(\?|$)/i.test(url)) return {t: 'video', src: url};
    return null;
  }
  function openVideo(box, url) {
    const v = embed(url);
    if (!v) { window.open(url, '_blank', 'noopener'); return; }
    box.innerHTML = v.t === 'iframe'
      ? `<iframe src="${esc(v.src)}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`
      : `<video src="${esc(v.src)}" controls autoplay playsinline></video>`;
  }

  // ---- reps / descanso ----
  // topo da faixa: "8–10" -> 10, "10 cada perna" -> 10
  const repsTop = r => { const n = (String(r).match(/\d+/g) || []).map(Number); return n.length ? Math.max(n[0], n[1] ?? 0) : null; };
  // "2–3 min" -> 120, "90 s" -> 90, padrão 90
  function restSecs(txt) {
    const m = String(txt).match(/\d+/);
    return m ? Number(m[0]) * (/min/i.test(txt) ? 60 : 1) : 90;
  }

  // ---- timer ----
  const tbox = document.getElementById('timer'), tleft = document.getElementById('tleft');
  let tend = 0, tint = null;
  function tick() {
    const s = Math.ceil((tend - Date.now()) / 1000);
    if (s <= 0) { stopTimer(); beep(); navigator.vibrate?.([300, 150, 300]); return; }
    tleft.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  function startTimer(sec) { tend = Date.now() + sec * 1000; tbox.hidden = false; clearInterval(tint); tint = setInterval(tick, 250); tick(); }
  function stopTimer() { clearInterval(tint); tbox.hidden = true; }
  document.getElementById('tplus').onclick = () => { tend += 15000; tick(); };
  document.getElementById('tskip').onclick = stopTimer;
  function beep() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator();
      o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.4);
    } catch {}
  }

  // ---- fila de envio (offline) ----
  const pkey = `pend:${TOKEN}`;
  const pending = () => { try { return JSON.parse(localStorage.getItem(pkey)) || []; } catch { return []; } };
  const setPending = q => q.length ? localStorage.setItem(pkey, JSON.stringify(q)) : localStorage.removeItem(pkey);
  let flushing = false;
  async function flush() {
    if (flushing) return false;
    flushing = true;
    try {
      let q = pending();
      while (q.length) {
        const r = await fetch(`aluno.php?t=${TOKEN}`, {method: 'POST', body: JSON.stringify(q[0])});
        if (r.status >= 500 || !r.status) return false;
        q.shift(); setPending(q);   // 4xx = payload inválido, descarta para não travar a fila
      }
      return true;
    } catch { return false; } finally { flushing = false; }
  }
  addEventListener('online', flush);

  // ---- render ----
  function nextWorkout() {
    const i = D.workouts.findIndex(w => w.id == D.last_workout_id);
    return D.workouts[(i + 1) % D.workouts.length].id;
  }

  function render() {
    const next = nextWorkout();
    app.innerHTML = `
      <header><span class="hi">Bom treino</span><h1>Olá, ${esc(D.name)}</h1></header>
      ${D.notes ? `<details class="notes"><summary>Orientações gerais</summary><p>${esc(D.notes)}</p></details>` : ''}
      <nav class="tabs">${D.workouts.map(w => `<button class="${w.id == W.id ? 'on' : ''}" data-w="${w.id}">${esc(w.name)}${w.id == next ? '<small>próximo</small>' : ''}${w.id == D.last_workout_id ? '<small>último</small>' : ''}</button>`).join('')}</nav>
      <div class="hero"><small>${W.id == next ? 'Treino de hoje' : 'Treino ' + esc(W.name)}</small><h2>${esc(W.focus || 'Treino ' + W.name)}</h2>
        <div class="pills"><span>${W.exercises.length} exercícios</span><span>${W.exercises.reduce((a, x) => a + Number(x.sets), 0)} séries</span></div></div>
      <section>${W.exercises.map(cardHtml).join('')}</section>
      <button id="fin" class="big">Finalizar treino</button>`;
    app.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { W = D.workouts.find(w => w.id == b.dataset.w); state = load(); render(); });
    app.querySelectorAll('.vid').forEach(b => b.onclick = () => openVideo(b.nextElementSibling, b.dataset.url));
    app.querySelectorAll('input[type=checkbox]').forEach(c => c.onchange = () => {
      state.done[c.dataset.k] = c.checked; save();
      c.closest('.set').classList.toggle('ok', c.checked);
      if (c.checked) startTimer(restSecs(c.dataset.rest));
    });
    app.querySelectorAll('.set input[data-f]').forEach(i => i.oninput = () => {
      // só números; vírgula vira ponto; reps só inteiros
      i.value = i.dataset.f === 'r' ? i.value.replace(/\D/g, '').slice(0, 3)
        : i.value.replace(',', '.').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1').slice(0, 6);
      state[i.dataset.f][i.dataset.k] = i.value; save();
    });
    // − / +: parte do valor digitado, senão da carga da última vez
    app.querySelectorAll('.step').forEach(b => b.onclick = () => {
      const i = b.parentElement.querySelector('input');
      const cur = parseFloat(i.value) || parseFloat(i.placeholder) || 0;
      const v = Math.max(0, Math.round((cur + Number(b.dataset.d)) * 100) / 100);
      i.value = v ? String(v) : '';
      state.w[b.dataset.k] = i.value; save();
    });
    document.getElementById('fin').onclick = finish;
  }

  function cardHtml(ex, idx) {
    const last = D.last[ex.id];
    const top = repsTop(ex.reps);
    const up = last && top && last.sets.length >= ex.sets && last.sets.every(s => s.r >= top);
    const vid = ex.video_url
      ? `<button type="button" class="vid" data-url="${esc(ex.video_url)}">▶ Ver execução</button><div class="vbox"></div>`
      : `<a class="yt" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent('execução ' + ex.name)}">Buscar execução no YouTube</a>`;
    const fmt = l => `${l.w ?? '-'} kg × ${l.r ?? '-'}`;
    let sets = `<div class="cols"><span>Série</span><span>Carga (kg)</span><span>Reps</span></div>`;
    for (let n = 1; n <= ex.sets; n++) {
      const k = `${ex.id}-${n}`, ls = last?.sets.find(s => s.n === n);
      sets += `<div class="set ${state.done[k] ? 'ok' : ''}">
        <label class="chk"><input type="checkbox" data-k="${k}" data-rest="${esc(ex.rest)}" aria-label="Série ${n} feita" ${state.done[k] ? 'checked' : ''}><span>${n}</span></label>
        <div class="load">
          <button type="button" class="step" data-k="${k}" data-d="-1" aria-label="Diminuir 1 kg">−</button>
          <input type="text" inputmode="decimal" autocomplete="off" aria-label="Carga em kg, série ${n}" placeholder="${ls && ls.w !== null ? ls.w : '0'}" data-f="w" data-k="${k}" value="${esc(state.w[k])}">
          <button type="button" class="step" data-k="${k}" data-d="1" aria-label="Aumentar 1 kg">+</button>
        </div>
        <input type="text" inputmode="numeric" autocomplete="off" class="reps" aria-label="Repetições, série ${n}" placeholder="${ls && ls.r !== null ? ls.r : '0'}" data-f="r" data-k="${k}" value="${esc(state.r[k])}">
      </div>`;
    }
    if (last) sets += `<p class="last">Última vez: ${last.sets.map(fmt).join(' · ')}</p>`;
    return `<article class="card">
      <h2><b>${idx + 1}</b> ${esc(ex.name)}${up ? '<span class="badge">Subir carga (+1–2 kg)</span>' : ''}</h2>
      <p class="meta"><span>${ex.sets} × ${esc(ex.reps)}</span><span>descanso ${esc(ex.rest)}</span></p>
      ${ex.notes ? `<p class="note">${esc(ex.notes)}</p>` : ''}
      ${vid}${sets}</article>`;
  }

  async function finish() {
    const logs = [];
    for (const ex of W.exercises) for (let n = 1; n <= ex.sets; n++) {
      const k = `${ex.id}-${n}`;
      if (state.done[k] || state.w[k] || state.r[k]) logs.push({we_id: ex.id, set: n, weight: state.w[k] ?? '', reps: state.r[k] ?? ''});
    }
    if (!logs.length) { alert('Marque ao menos uma série.'); return; }
    const btn = document.getElementById('fin'); btn.disabled = true;
    // guarda na fila antes de enviar: se falhar, tenta de novo depois sem perder nada
    const q = pending(); q.push({workout_id: W.id, logs, at: new Date().toISOString()}); setPending(q);
    localStorage.removeItem(key());
    const ok = await flush();
    app.dataset.queued = ok ? '' : '1';
    stopTimer();
    const vol = logs.reduce((a, l) => a + (Number(l.weight) || 0) * (Number(l.reps) || 0), 0);
    app.innerHTML = `<header><h1>Treino ${esc(W.name)} concluído 💪</h1></header>
      <div class="card"><p>${logs.length} séries registradas</p>${app.dataset.queued ? '<p class="note">Sem conexão: o treino ficou salvo no celular e será enviado quando voltar a internet.</p>' : ''}<p>Volume total: ${Math.round(vol)} kg</p></div>
      <button class="big" onclick="location.reload()">Voltar</button>`;
  }

  fetch(`aluno.php?t=${TOKEN}&json=1`).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
    D = d;
    if (!D.workouts.length) { app.innerHTML = '<p>Nenhum treino cadastrado ainda.</p>'; return; }
    // reabre treino com progresso salvo; senão o próximo da fila
    W = D.workouts.find(w => localStorage.getItem(`treino:${TOKEN}:${w.id}`)) || D.workouts.find(w => w.id == nextWorkout());
    state = load();
    render();
    flush();
  }).catch(() => { app.innerHTML = '<p>Link inválido ou expirado. Peça um novo ao professor.</p>'; });
})();
