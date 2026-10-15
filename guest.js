/* Guest screen: pick your name, vote, wait, watch the reveal, see the recap. */
(function () {
  const { el, clear, plural, renderReveal, renderRecap, mountStatus } = CuzzoUI;
  const L = CuzzoLogic;
  const cfg = window.CUZZO_CONFIG;
  const db = window.CuzzoDB;
  const people = L.buildPeople(cfg);
  const questions = cfg.questions;

  const app = document.getElementById("app");
  const meChip = document.getElementById("me-chip");
  const progress = document.getElementById("progress");
  mountStatus(db, document.getElementById("status"));
  document.title = cfg.gameTitle;
  document.querySelector(".brand").textContent = cfg.gameTitle;

  /* ---------- Who am I ---------- */
  function loadMe() {
    try {
      const id = localStorage.getItem("cuzzo-me");
      return id && people.byId[id] && people.byId[id].group === "cousins" ? id : null;
    } catch (e) { return null; }
  }
  let meId = loadMe();
  let pendingId = null; // name tapped, waiting for "Yes, that's me"

  /* ---------- Live state ---------- */
  const state = { game: null, players: null, results: {}, myVote: null, sendState: "idle" };
  let unsubVote = null;
  let votePath = "";
  let cancelReveal = null;
  let revealKey = "";
  let animateReveal = false;
  let prevPhase = null;
  let prevQid = null;

  db.on("game", (g) => {
    const old = state.game;
    prevPhase = old ? old.phase : null;
    prevQid = old ? old.qid : null;
    state.game = g;
    if (g && g.phase === "revealed" && prevPhase && prevPhase !== "revealed" && prevPhase !== "recap" && prevQid === g.qid) {
      animateReveal = true; // we watched voting close, so play the drumroll
    }
    syncVoteSubscription();
    render();
  });
  db.on("players", (p) => { state.players = p; if (!state.game || state.game.phase === "lobby") render(); });
  db.on("results", (r) => { state.results = r || {}; render(); });

  function syncVoteSubscription() {
    const g = state.game;
    const want = meId && g && g.qid ? `votes/${g.qid}/${meId}` : "";
    if (want === votePath) return;
    if (unsubVote) { unsubVote(); unsubVote = null; }
    votePath = want;
    state.myVote = null;
    state.sendState = "idle";
    if (want) unsubVote = db.on(want, (v) => { state.myVote = v; render(); });
  }

  /* ---------- Actions ---------- */
  function confirmMe(id) {
    meId = id; pendingId = null;
    try { localStorage.setItem("cuzzo-me", id); } catch (e) {}
    db.set(`players/${id}`, Date.now());
    syncVoteSubscription();
    render();
  }
  function notMe() {
    if (!confirm("Switch to a different name?")) return;
    try { localStorage.removeItem("cuzzo-me"); } catch (e) {}
    meId = null; pendingId = null; votePath = "";
    if (unsubVote) { unsubVote(); unsubVote = null; }
    state.myVote = null;
    render();
  }
  function castVote(targetId) {
    const g = state.game;
    if (!g || g.phase !== "voting" || !meId || targetId === meId) return;
    state.myVote = targetId;
    state.sendState = "sending";
    render();
    const path = votePath;
    db.set(path, targetId).then(
      () => { if (path === votePath && state.myVote === targetId) { state.sendState = "sent"; render(); } },
      () => { if (path === votePath) { state.sendState = "error"; render(); } }
    );
  }

  /* ---------- Rendering ---------- */
  function setProgress(qi, total) {
    if (qi == null || qi < 0) { progress.hidden = true; return; }
    progress.hidden = false;
    progress.firstElementChild.style.width = `${((qi + 1) / total) * 100}%`;
  }

  function render() {
    const g = state.game || { phase: "lobby", qi: -1 };
    const phase = g.phase || "lobby";
    const q = questions[g.qi];

    meChip.hidden = !meId;
    if (meId) {
      clear(meChip).append(
        el("span", { class: "me-name", text: people.byId[meId].name }),
        el("button", { class: "link-btn", onclick: notMe, text: "Not you?" }));
    }

    // Don't rebuild (and restart the animation) while a reveal is on screen.
    if (phase === "revealed" && q && state.results[g.qid] && revealKey === g.qid + JSON.stringify(state.results[g.qid]) && meId) return;
    if (cancelReveal) { cancelReveal(); cancelReveal = null; }
    revealKey = "";
    clear(app);

    if (!meId) { setProgress(-1); return renderPicker(); }
    if (phase === "recap") { setProgress(-1); return renderRecapScreen(); }
    if (phase === "lobby" || !q) { setProgress(-1); return renderLobby(); }

    setProgress(g.qi, questions.length);
    if (phase === "voting") return renderVoting(q, g);
    if (phase === "closed") return renderClosed(q, g);
    if (phase === "revealed") return renderRevealed(q, g);
    renderLobby();
  }

  function renderPicker() {
    if (pendingId) {
      const p = people.byId[pendingId];
      app.append(
        el("section", { class: "confirm" },
          el("p", { class: "muted", text: "You are" }),
          el("p", { class: "confirm-name", text: p.name }),
          el("button", { class: "btn btn-primary", onclick: () => confirmMe(pendingId), text: "Yes, that's me" }),
          el("button", { class: "btn btn-ghost", onclick: () => { pendingId = null; render(); }, text: "Pick again" })));
      return;
    }
    app.append(
      el("h1", { class: "screen-title", text: "Who are you?" }),
      el("p", { class: "lede", text: "Tap your own name. No password needed." }),
      el("div", { class: "name-grid" }, people.cousins.map((p) =>
        el("button", { class: "name-btn", onclick: () => { pendingId = p.id; render(); window.scrollTo(0, 0); }, text: p.name }))));
  }

  function renderLobby() {
    const joined = state.players ? Object.keys(state.players).filter((id) => people.byId[id]).length : 0;
    app.append(
      el("section", { class: "waiting" },
        el("p", { class: "hello", text: `You're in, ${people.byId[meId].name}!` }),
        el("p", { class: "lede", text: "The host will start the first question soon. Keep this page open." }),
        el("p", { class: "count-pill", text: `${joined} of ${people.cousins.length} cousins here` })));
  }

  function renderVoting(q, g) {
    const ids = L.candidatesFor(q, people).filter((id) => id !== meId);
    const status = {
      idle: "Tap a name to vote. You can change it until voting closes.",
      sending: "Sending your vote…",
      sent: "Vote saved. You can still change it.",
      error: "Couldn't send. Check your wifi and tap again.",
    }[state.sendState];
    const saved = state.myVote ? (state.sendState === "sending" ? status : state.sendState === "error" ? status : "Vote saved. You can still change it.") : status;

    app.append(
      el("p", { class: "q-count", text: `Question ${g.qi + 1} of ${questions.length}` }),
      el("h1", { class: "question", text: q.text }),
      el("div", { class: "vote-grid " + (q.who === "elders" ? "one-col" : "two-col"), role: "radiogroup", "aria-label": q.text },
        ids.map((id) => {
          const sel = state.myVote === id;
          return el("button", {
            class: "vote-btn" + (sel ? " selected" : ""), role: "radio", "aria-checked": sel ? "true" : "false",
            onclick: () => castVote(id),
          }, el("span", { class: "vote-name", text: people.byId[id].name }), sel ? el("span", { class: "check", "aria-hidden": "true", text: "✓" }) : null);
        })),
      el("p", { class: "status-line" + (state.sendState === "error" ? " bad" : ""), text: saved }));
  }

  function renderClosed(q, g) {
    const mine = state.myVote && people.byId[state.myVote] ? people.byId[state.myVote].name : null;
    app.append(
      el("p", { class: "q-count", text: `Question ${g.qi + 1} of ${questions.length}` }),
      el("h1", { class: "question", text: q.text }),
      el("section", { class: "waiting" },
        el("p", { class: "hello", text: "Voting is closed" }),
        el("p", { class: "lede", text: mine ? `You voted for ${mine}.` : "You didn't vote on this one." }),
        el("p", { class: "lede", text: "Eyes up. The host is about to reveal the winner." })));
  }

  function renderRevealed(q, g) {
    const result = state.results[g.qid];
    if (!result) {
      app.append(el("p", { class: "q-count", text: `Question ${g.qi + 1} of ${questions.length}` }),
        el("h1", { class: "question", text: q.text }),
        el("p", { class: "lede", text: "Counting the votes…" }));
      return;
    }
    const box = el("section", { class: "reveal" });
    app.append(box);
    cancelReveal = renderReveal(box, { question: q, result, people, animate: animateReveal });
    revealKey = g.qid + JSON.stringify(result);
    animateReveal = false;
    app.append(el("p", { class: "lede center next-note", text: "Next question coming up." }));
  }

  function renderRecapScreen() {
    const byQid = state.results;
    const arr = questions.map((_, i) => byQid["q" + (i + 1)] || null);
    const titles = L.computeTitles(arr, questions, people, cfg);
    const box = el("section", { class: "recap" });
    app.append(box);
    renderRecap(box, { config: cfg, people, questions, resultsByQid: byQid, titles, meId });
  }

  render();
})();
