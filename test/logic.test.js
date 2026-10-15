const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logic.js");

// Load the real config in Node.
global.window = {};
require("../config.js");
const cfg = global.window.CUZZO_CONFIG;
const people = L.buildPeople(cfg);

test("config has 20 cousins, 5 elders, 21 questions", () => {
  assert.equal(cfg.cousins.length, 20);
  assert.equal(cfg.elders.length, 5);
  assert.equal(cfg.questions.length, 21);
  assert.equal(cfg.questions[0].text, "Who is the biggest bum?");
  assert.equal(cfg.questions[1].text, "Who is your favorite?");
});

test("names are unique and every question has a valid group and badge", () => {
  const ids = Object.keys(people.byId);
  assert.equal(ids.length, cfg.cousins.length + cfg.elders.length, "every name gets a unique id");
  cfg.questions.forEach((q, i) => {
    assert.ok(q.who === "cousins" || q.who === "elders", `q${i + 1} who`);
    assert.ok(q.badge, `q${i + 1} badge`);
  });
});

test("cousin Amie and Tata Amie stay separate people", () => {
  assert.notEqual(L.slugify("Amie"), L.slugify("Tata Amie"));
  assert.equal(people.byId["amie"].group, "cousins");
  assert.equal(people.byId["tata-amie"].group, "elders");
});

test("slugify handles Jr names", () => {
  assert.equal(L.slugify("Mohamed Fofana Jr"), "mohamed-fofana-jr");
  assert.equal(L.slugify("Tantie Nima"), "tantie-nima");
});

test("single winner and top 3", () => {
  const c = ["a", "b", "c", "d"];
  const r = L.computeResult({ v1: "a", v2: "a", v3: "b", v4: "b", v5: "a", v6: "c" }, c);
  assert.deepEqual(r.winners, ["a"]);
  assert.deepEqual(r.top.map((t) => [t.id, t.count, t.place]), [["a", 3, 1], ["b", 2, 2], ["c", 1, 3]]);
  assert.equal(r.total, 6);
});

test("ties: everyone tied for first is a winner", () => {
  const r = L.computeResult({ v1: "a", v2: "b", v3: "c", v4: "c" }, ["a", "b", "c"]);
  assert.deepEqual(r.winners, ["c"]);
  const tie = L.computeResult({ v1: "a", v2: "b" }, ["a", "b", "c"]);
  assert.deepEqual(tie.winners.sort(), ["a", "b"]);
  assert.deepEqual(tie.top.map((t) => t.place), [1, 1]);
});

test("ties beyond third place are all shown", () => {
  const r = L.computeResult({ v1: "a", v2: "a", v3: "b", v4: "c", v5: "d" }, ["a", "b", "c", "d"]);
  assert.deepEqual(r.top.map((t) => t.place), [1, 2, 2, 2]);
});

test("self-votes and off-ballot votes are ignored", () => {
  const r = L.computeResult({ a: "a", b: "zzz", c: "a" }, ["a", "b"]);
  assert.deepEqual(r.counts, { a: 1, b: 0 });
  assert.equal(r.total, 1);
});

test("no votes means no winners", () => {
  const r = L.computeResult({}, ["a", "b"]);
  assert.deepEqual(r.winners, []);
  assert.deepEqual(r.top, []);
});

test("titles: badge for one win, multi-win title, leader, and everyone gets one", () => {
  const kevin = L.slugify("Kevin");
  const deina = L.slugify("Deina");
  const results = [];
  results[0] = { winners: [kevin] };               // Q1
  results[5] = { winners: [kevin, deina] };        // Q6 tie
  results[8] = { winners: [kevin] };               // Q9
  results[3] = { winners: [deina] };               // Q4
  const t = L.computeTitles(results, cfg.questions, people, cfg);
  assert.equal(t[kevin].wins, 3);
  assert.equal(t[kevin].title, cfg.titles.leader);
  assert.equal(t[deina].wins, 2);
  assert.equal(t[deina].title, cfg.titles.manyWins[2]);
  Object.values(t).forEach((o) => assert.ok(o.title, "everyone has a title"));
  const single = L.computeTitles([{ winners: [kevin] }], cfg.questions, people, cfg);
  assert.equal(single[kevin].title, cfg.questions[0].badge);
});
