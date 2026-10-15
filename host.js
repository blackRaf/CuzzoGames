/* Host screen: start a question, close voting, reveal, next. */
(function () {
  const { el, clear, plural, renderReveal, renderRecap, mountStatus } = CuzzoUI;
  const L = CuzzoLogic;
  const cfg = window.CUZZO_CONFIG;
  const db = window.CuzzoDB;
  const people = L.buildPeople(cfg);
  const questions = cfg.questions;
  const N = questions.length;

  const app = document.getElementById("app");
  const progress = document.getElementById("progress");
  mountStatus(db, document.getElementById("status"));
  document.querySelector(".brand").textContent = cfg.gameTitle;

  /* ---------- PIN gate ---------- */
  function unlocked() { try { return localStorage.getItem("cuzzo-host") === String(cfg.hostPin); } catch (e) { return false; } }

  function showPin() {
    clear(app);
    const input = el("input", { class: "pin-input", type: "password", inputmode: "text", autocomplete: "off", "aria-label": "Host code", placeholder: "Host code" });
    const msg = el("p", { class: "status-line bad", text: "" });
    const go = () => {
      if (input.value === String(cfg.hostPin)) {
        try { localStorage.setItem("cuzzo-host", String(cfg.hostPin)); } catch (e) {}
        start();
      } else { msg.textContent = "That code isn't right. Try again."; input.select(); }
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    app.append(
      el("h1", { class: "screen-title", text: "Host controls" }),
      el("p", { class: "lede", text: "Enter the host code to run the game." }),
      input, msg,
      el("button", { class: "btn btn-primary", onclick: go, text: "Unlock" }));
    input.focus();
  }

  /* ---------- Live state ---------- */
  const state = { game: null, players: null, votes: null, results: {} };
  let animateReveal = false;
  let unsubVotes = null;
  let votesPath = "";

  let headBox, stageBox, liveBox, actionBox, moreBox, hereBox;
  let stageKey = "";
  let cancelReveal = null;

  function start() {
    clear(app);
    headBox = el("section", { class: "host-head" });
    stageBox = el("section", { class: "host-stage" });
    liveBox = el("section", { class: "host-live" });
    actionBox = el("section", { class: "host-actions" });
    hereBox = el("div", {});
    moreBox = buildMore();
    app.append(headBox, stageBox, liveBox, actionBox, moreBox);

    db.on("game", (g) => { state.game = g; syncVotes(); render(); });
    db.on("players", (p) => { state.players = p; render(); });
    db.on("results", (r) => { state.results = r || {}; render(); });
    keepAwake();
  }

  function syncVotes() {
    const qid = state.game && state.game.qid ? state.game.qid : "";
    const want = qid ? `votes/${qid}` : "";
    if (want === votesPath) return;
    if (unsubVotes) { unsubVotes(); unsubVotes = null; }
    votesPath = want;
    state.votes = null;
    if (want) unsubVotes = db.on(want, (v) => { state.votes = v; render(); });
  }

  async function keepAwake() {
    try { if (navigator.wakeLock) await navigator.wakeLock.request("screen"); } catch (e) {}
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") { try { navigator.wakeLock && navigator.wakeLock.request("screen"); } catch (e) {} }
    });
  }

  /* ---------- Actions ---------- */
  const qidOf = (i) => "q" + (i + 1);

  function startQuestion(i) {
    const qid = qidOf(i);
    animateReveal = false;
    db.update({ game: { phase: "voting", qi: i, qid }, ["votes/" + qid]: null, ["results/" + qid]: null });
  }
  function closeVoting() { db.set("game/phase", "closed"); }
  function reopenVoting() { db.set("game/phase", "voting"); }

  function validVotes() {
    const out = {};
    const v = state.votes || {};
    Object.keys(v).forEach((voter) => {
      if (people.byId[voter] && people.byId[voter].group === "cousins" && typeof v[voter] === "string") out[voter] = v[voter];
    });
    return out;
  }

  function reveal() {
    const g = state.game;
    const q = questions[g.qi];
    const nameOf = (id) => (people.byId[id] ? people.byId[id].name : id);
    const r = L.computeResult(validVotes(), L.candidatesFor(q, people), nameOf);
    animateReveal = true;
    db.update({
      ["results/" + g.qid]: { winners: r.winners, top: r.top, total: r.total },
      "game/phase": "revealed",
    });
  }
  function showRecap() { db.set("game/phase", "recap"); }
  function resetGame() {
    if (!confirm("Reset the whole game? All votes and results will be erased.")) return;
    if (!confirm("Really erase everything and start over?")) return;
    db.update({ game: { phase: "lobby", qi: -1 }, votes: null, results: null });
  }

  /* ---------- Rendering ---------- */
  const PHASE_LABEL = {
    lobby: "Waiting room", voting: "Voting is open", closed: "Voting closed",
    revealed: "Results are showing", recap: "Final recap",
  };

  function render() {
    if (!headBox) return;
    const g = state.game || { phase: "lobby", qi: -1 };
    const phase = g.phase || "lobby";
    const q = questions[g.qi];
    const hasQ = q && phase !== "lobby";

    /* head */
    clear(headBox).append(
      el("span", { class: "phase-pill phase-" + phase, text: PHASE_LABEL[phase] || phase }),
      hasQ && phase !== "recap" ? el("span", { class: "q-count", text: `Question ${g.qi + 1} of ${N}` }) : null);
    if (hasQ && phase !== "recap") { progress.hidden = false; progress.firstElementChild.style.width = `${((g.qi + 1) / N) * 100}%`; }
    else progress.hidden = true;

    renderStage(g, phase, q);
    renderLive(g, phase);
    renderActions(g, phase);
    renderHere(g, phase);
  }

  function renderStage(g, phase, q) {
    const result = state.results[g.qid];
    const key = phase + "|" + (g.qid || "") + "|" + (phase === "revealed" ? JSON.stringify(result || null) : phase === "recap" ? JSON.stringify(state.results) : "");
    if (key === stageKey) return;
    stageKey = key;
    if (cancelReveal) { cancelReveal(); cancelReveal = null; }
    clear(stageBox);

    if (phase === "lobby" || !q) {
      stageBox.append(el("h1", { class: "question", text: "Ready when you are." }),
        el("p", { class: "lede", text: `Cousins pick their names on their phones. When most are here, start question 1.` }));
    } else if (phase === "voting" || phase === "closed") {
      stageBox.append(el("h1", { class: "question", text: q.text }));
    } else if (phase === "revealed") {
      if (!result) { stageBox.append(el("h1", { class: "question", text: q.text }), el("p", { class: "lede", text: "Counting the votes…" })); return; }
      const box = el("div", { class: "reveal" });
      stageBox.append(box);
      cancelReveal = renderReveal(box, { question: q, result, people, animate: animateReveal });
      animateReveal = false;
    } else if (phase === "recap") {
      const arr = questions.map((_, i) => state.results["q" + (i + 1)] || null);
      const titles = L.computeTitles(arr, questions, people, cfg);
      const box = el("div", { class: "recap" });
      stageBox.append(box);
      renderRecap(box, { config: cfg, people, questions, resultsByQid: state.results, titles, meId: null });
    }
  }

  function renderLive(g, phase) {
    clear(liveBox);
    if (phase !== "voting" && phase !== "closed") return;
    const votes = validVotes();
    const voted = Object.keys(votes).length;
    const total = people.cousins.length;
    const missing = people.cousins.filter((p) => !votes[p.id]);
    liveBox.append(
      el("p", { class: "live-count" }, el("strong", { text: `${voted} of ${total}` }), " cousins have voted"),
      el("div", { class: "meter", role: "img", "aria-label": `${voted} of ${total} voted` }, el("span", { style: { width: `${(voted / total) * 100}%` } })),
      missing.length && missing.length < total
        ? el("p", { class: "muted small", text: `Still deciding: ${missing.map((p) => p.name).join(", ")}` })
        : null);
  }

  function renderActions(g, phase) {
    clear(actionBox);
    const last = g.qi >= N - 1;
    const btn = (label, fn, cls) => el("button", { class: "btn " + (cls || "btn-primary"), onclick: fn, text: label });

    if (phase === "lobby") actionBox.append(btn("Start question 1", () => startQuestion(0)));
    else if (phase === "voting") actionBox.append(btn("Close voting", closeVoting));
    else if (phase === "closed") actionBox.append(btn("Reveal the winner", reveal), btn("Reopen voting", reopenVoting, "btn-ghost"));
    else if (phase === "revealed") {
      actionBox.append(last ? btn("Show the final recap", showRecap) : btn(`Start question ${g.qi + 2}`, () => startQuestion(g.qi + 1)));
    } else if (phase === "recap") {
      actionBox.append(el("p", { class: "lede", text: "That's the whole game. Thanks for hosting!" }),
        btn("Back to question " + N, () => db.set("game/phase", "revealed"), "btn-ghost"));
    }
  }

  function renderHere(g, phase) {
    clear(hereBox);
    const joined = state.players ? Object.keys(state.players).filter((id) => people.byId[id] && people.byId[id].group === "cousins") : [];
    const notHere = people.cousins.filter((p) => !joined.includes(p.id));
    hereBox.append(
      el("p", { class: "lede", text: `${joined.length} of ${people.cousins.length} cousins have joined.` }),
      notHere.length ? el("p", { class: "muted small", text: `Not here yet: ${notHere.map((p) => p.name).join(", ")}` }) : null);
  }

  function buildMore() {
    const guestUrl = new URL("./", location.href).href;
    const select = el("select", { class: "select", "aria-label": "Question to jump to" },
      questions.map((q, i) => el("option", { value: String(i), text: `${i + 1}. ${q.text}` })));
    const copy = el("button", { class: "btn btn-ghost btn-small", text: "Copy link", onclick: () => {
      if (navigator.clipboard) navigator.clipboard.writeText(guestUrl).then(() => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy link"), 1500); });
    } });
    return el("details", { class: "more" },
      el("summary", { text: "More controls" }),
      el("div", { class: "more-body" },
        el("h3", { class: "section-title", text: "Link for guests" }),
        el("p", { class: "mono", text: guestUrl }), copy,
        el("h3", { class: "section-title", text: "Who's here" }), hereBox,
        el("h3", { class: "section-title", text: "Jump to a question" }),
        el("p", { class: "muted small", text: "Restarts that question with a clean slate." }),
        select,
        el("button", { class: "btn btn-ghost", text: "Start this question", onclick: () => {
          const i = Number(select.value);
          if (confirm(`Start question ${i + 1}? Votes already cast on it will be cleared.`)) startQuestion(i);
        } }),
        el("h3", { class: "section-title", text: "Start over" }),
        el("button", { class: "btn btn-danger", text: "Reset the whole game", onclick: resetGame })));
  }

  if (unlocked()) start(); else showPin();
})();
