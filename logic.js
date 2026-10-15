/* Pure game logic: no DOM, no Firebase. Runs in the browser and in Node (tests). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CuzzoLogic = factory();
})(typeof self !== "undefined" ? self : this, function () {

  /** "Mohamed Fofana Jr" -> "mohamed-fofana-jr" */
  function slugify(name) {
    return String(name)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /** Build the people lists with ids from the config. */
  function buildPeople(cfg) {
    const mk = (group) => (cfg[group] || []).map((name) => ({ id: slugify(name), name, group }));
    const cousins = mk("cousins");
    const elders = mk("elders");
    const byId = {};
    cousins.concat(elders).forEach((p) => { byId[p.id] = p; });
    return { cousins, elders, byId };
  }

  /** Ids of the people a question can be voted for. */
  function candidatesFor(question, people) {
    return (question.who === "elders" ? people.elders : people.cousins).map((p) => p.id);
  }

  /**
   * votes: { voterId: targetId }
   * candidateIds: who can receive votes
   * Ignores self-votes and votes for anyone not on the ballot.
   */
  function computeResult(votes, candidateIds, nameOf) {
    const allowed = new Set(candidateIds);
    const counts = {};
    candidateIds.forEach((id) => { counts[id] = 0; });
    let total = 0;
    Object.keys(votes || {}).forEach((voter) => {
      const target = votes[voter];
      if (!allowed.has(target) || target === voter) return;
      counts[target] += 1;
      total += 1;
    });

    const nm = nameOf || ((id) => id);
    const ranked = candidateIds
      .filter((id) => counts[id] > 0)
      .sort((a, b) => counts[b] - counts[a] || nm(a).localeCompare(nm(b)));

    // Competition ranking: 1,1,3 ... so ties share a place.
    const top = [];
    ranked.forEach((id, i) => {
      const place = i > 0 && counts[id] === counts[ranked[i - 1]] ? top[i - 1].place : i + 1;
      top.push({ id, count: counts[id], place });
    });

    const max = ranked.length ? counts[ranked[0]] : 0;
    const winners = max > 0 ? ranked.filter((id) => counts[id] === max) : [];

    return {
      total,
      winners,
      // Top 3 places; everyone tied for a top-3 place is shown.
      top: top.filter((t) => t.place <= 3),
      counts,
    };
  }

  /**
   * results: array (index = question number) of { winners: [ids] } or null.
   * Returns { [personId]: { wins, won: [questionIndexes], title } }
   */
  function computeTitles(results, questions, people, cfg) {
    const t = cfg.titles || {};
    const everyone = people.cousins.concat(people.elders);
    const out = {};
    everyone.forEach((p) => { out[p.id] = { wins: 0, won: [], title: "" }; });

    (results || []).forEach((r, qi) => {
      if (!r || !r.winners) return;
      r.winners.forEach((id) => {
        if (!out[id]) return;
        out[id].wins += 1;
        out[id].won.push(qi);
      });
    });

    const maxWins = Math.max(0, ...everyone.map((p) => out[p.id].wins));
    const many = t.manyWins || {};
    let cousinNoWin = 0;
    let elderNoWin = 0;

    everyone.forEach((p) => {
      const o = out[p.id];
      if (o.wins === 0) {
        const list = (p.group === "elders" ? t.noWinsElders : t.noWinsCousins) || ["Honored Guest"];
        const n = p.group === "elders" ? elderNoWin++ : cousinNoWin++;
        o.title = list[n % list.length];
      } else if (maxWins >= 2 && o.wins === maxWins && t.leader) {
        o.title = t.leader;
      } else if (o.wins === 1) {
        const q = questions[o.won[0]];
        o.title = (q && q.badge) || "Winner";
      } else {
        o.title = many[o.wins] || many.default || "Legend";
      }
    });
    return out;
  }

  return { slugify, buildPeople, candidatesFor, computeResult, computeTitles };
});
