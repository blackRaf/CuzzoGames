/* Shared UI helpers for the guest and host screens. */
(function () {
  const REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** el("div", {class:"x", onclick: fn, text:"hi"}, child, child...) — builds DOM safely (no innerHTML). */
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => {
      const v = props[k];
      if (v == null || v === false) return;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().forEach((c) => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return n;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
  const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

  /* ---------- Confetti (one burst, ~4s) ---------- */
  function confetti() {
    if (REDUCED) return;
    const c = el("canvas", { class: "confetti", "aria-hidden": "true" });
    document.body.append(c);
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr);
    const colors = ["#ffb627", "#ff4f81", "#20c9a6", "#fff3dc", "#9b6cff"];
    const bits = Array.from({ length: 140 }, () => ({
      x: W * (0.2 + Math.random() * 0.6), y: H * 0.35,
      vx: (Math.random() - 0.5) * 14 * dpr, vy: (-6 - Math.random() * 12) * dpr,
      w: (6 + Math.random() * 8) * dpr, h: (8 + Math.random() * 10) * dpr,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      col: colors[(Math.random() * colors.length) | 0],
    }));
    const start = performance.now();
    (function frame(t) {
      const age = t - start;
      ctx.clearRect(0, 0, W, H);
      bits.forEach((b) => {
        b.vy += 0.35 * dpr; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.globalAlpha = Math.max(0, 1 - age / 4200);
        ctx.fillStyle = b.col; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
      });
      if (age < 4200) requestAnimationFrame(frame); else c.remove();
    })(start);
  }

  /* ---------- Connection banner ---------- */
  function mountStatus(db, mount) {
    const banner = el("div", { class: "banner banner-warn", role: "status", hidden: true },
      "Connection lost. Your screen will catch up when the wifi is back.");
    mount.append(banner);
    let timer = null;
    db.onConnection((ok) => {
      clearTimeout(timer);
      if (ok) banner.hidden = true;
      else timer = setTimeout(() => { banner.hidden = false; }, 2500); // ignore brief blips
    });
    if (db.mode === "demo") {
      mount.append(el("div", { class: "banner banner-demo" },
        "Demo mode: votes stay in this browser. Add your Firebase keys in firebase-config.js to play on many phones."));
    }
  }

  /* ---------- Reveal ---------- */
  /**
   * Fills `box` with the result for one question. With animate=true it plays
   * the drumroll first. Returns a cancel function.
   */
  function renderReveal(box, { question, result, people, animate }) {
    clear(box);
    const nameOf = (id) => (people.byId[id] ? people.byId[id].name : id);
    const winners = (result && result.winners) || [];
    const top = (result && result.top) || [];
    let cancelled = false;
    const timers = [];

    const qText = el("p", { class: "reveal-q", text: question.text });

    if (!winners.length) {
      box.append(qText, el("div", { class: "stage" },
        el("p", { class: "winner-label", text: "Nobody voted on this one." }),
        el("p", { class: "muted", text: "Plot twist. Next question!" })));
      return () => {};
    }

    const stage = el("div", { class: "stage" });
    const list = el("ol", { class: "podium", "aria-label": "Top results" });
    box.append(qText, stage, list);

    function showWinner() {
      if (cancelled) return;
      clear(stage);
      const tie = winners.length > 1;
      stage.append(
        el("p", { class: "winner-label", text: tie ? "It's a tie!" : "And the winner is" }),
        ...winners.map((id, i) => el("p", { class: "winner-name pop", style: { animationDelay: `${i * 0.12}s` }, text: nameOf(id) })),
        el("p", { class: "winner-sub", text: tie
          ? `${winners.length} way tie with ${plural(top[0].count, "vote")} each`
          : plural(top[0].count, "vote") }),
        question.badge ? el("p", { class: "badge", text: `🏅 ${question.badge}` }) : null
      );
      const max = top[0].count || 1;
      top.forEach((t, i) => {
        const row = el("li", { class: "podium-row" + (t.place === 1 ? " first" : ""), style: { animationDelay: `${0.25 + i * 0.12}s` } },
          el("span", { class: "medal", "aria-hidden": "true", text: MEDALS[t.place] || "" }),
          el("span", { class: "podium-name", text: nameOf(t.id) }),
          el("span", { class: "podium-votes", text: plural(t.count, "vote") }),
          el("span", { class: "bar", style: { width: `${Math.max(6, (t.count / max) * 100)}%` } })
        );
        list.append(row);
      });
      confetti();
    }

    if (animate && !REDUCED) {
      stage.append(
        el("p", { class: "winner-label", text: "And the winner is" }),
        el("p", { class: "drumroll", "aria-live": "polite" }, el("span", { text: "." }), el("span", { text: "." }), el("span", { text: "." }))
      );
      timers.push(setTimeout(showWinner, 2600));
    } else {
      showWinner();
    }
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }

  /* ---------- Recap ---------- */
  function renderRecap(box, { config, people, questions, resultsByQid, titles, meId }) {
    clear(box);
    const nameOf = (id) => (people.byId[id] ? people.byId[id].name : id);
    const everyone = people.cousins.concat(people.elders);

    box.append(el("h2", { class: "screen-title", text: "That's a wrap!" }));

    if (meId && titles[meId]) {
      const t = titles[meId];
      box.append(el("section", { class: "my-title" },
        el("p", { class: "my-title-kicker", text: "Your title" }),
        el("p", { class: "my-title-name", text: t.title }),
        el("p", { class: "my-title-sub", text:
          t.wins ? `${nameOf(meId)} won ${plural(t.wins, "question")}` : `${nameOf(meId)}, you're a star in your own way` })));
    }

    const sorted = everyone.slice().sort((a, b) =>
      titles[b.id].wins - titles[a.id].wins || a.name.localeCompare(b.name));
    box.append(el("h3", { class: "section-title", text: "Everyone's title" }),
      el("ul", { class: "title-list" }, sorted.map((p) =>
        el("li", { class: "title-row" + (p.id === meId ? " me" : "") + (titles[p.id].wins ? " has-wins" : "") },
          el("span", { class: "title-person", text: p.name }),
          el("span", { class: "title-name", text: titles[p.id].title }),
          el("span", { class: "title-wins", text: titles[p.id].wins ? plural(titles[p.id].wins, "win") : "" })))));

    box.append(el("h3", { class: "section-title", text: "All the winners" }),
      el("ol", { class: "winner-list" }, questions.map((q, i) => {
        const r = resultsByQid["q" + (i + 1)];
        const w = r && r.winners && r.winners.length ? r.winners.map(nameOf).join(" & ") : "No votes";
        return el("li", { class: "winner-item" },
          el("span", { class: "winner-item-q", text: q.text }),
          el("span", { class: "winner-item-w", text: w }));
      })));
  }

  window.CuzzoUI = { el, clear, plural, confetti, mountStatus, renderReveal, renderRecap, REDUCED };

  /* Offline support */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
