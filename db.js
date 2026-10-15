/* Tiny data layer. Same API whether the data lives in Firebase or in demo mode.

   db.mode                     "firebase" | "demo"
   db.on(path, cb)             cb(value|null) now and on every change; returns an unsubscribe fn
   db.set(path, value)         Promise
   db.update({path: value})    Promise (null deletes a path)
   db.onConnection(cb)         cb(true|false)

   Data layout
     game            { phase: lobby|voting|closed|revealed|recap, qi: 0-based index, qid: "q1" }
     players/{id}    timestamp when that cousin joined
     votes/{qid}/{voterId} = targetId
     results/{qid}   { winners: [ids], top: [{id,count,place}], total }
*/
(function () {
  const cfg = window.FIREBASE_CONFIG || {};
  const useFirebase =
    typeof firebase !== "undefined" &&
    /^https:\/\/.+\.(firebaseio\.com|firebasedatabase\.app)/.test(cfg.databaseURL || "");

  function split(path) { return String(path).split("/").filter(Boolean); }

  /* ---------------- Firebase ---------------- */
  function makeFirebase() {
    firebase.initializeApp(cfg);
    const d = firebase.database();
    return {
      mode: "firebase",
      on(path, cb) {
        const ref = d.ref(path);
        const h = ref.on("value", (s) => cb(s.val()));
        return () => ref.off("value", h);
      },
      set: (path, value) => d.ref(path).set(value),
      update: (obj) => d.ref().update(obj),
      onConnection(cb) {
        d.ref(".info/connected").on("value", (s) => cb(!!s.val()));
      },
    };
  }

  /* ---------------- Demo mode (localStorage, syncs across tabs) ---------------- */
  function makeDemo() {
    const KEY = "cuzzo-demo-v1";
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    let tree = load();
    const subs = []; // { path, cb, last }

    function getAt(t, path) {
      let n = t;
      for (const k of split(path)) { if (n == null || typeof n !== "object") return null; n = n[k]; }
      return n === undefined ? null : n;
    }
    function setAt(t, path, value) {
      const keys = split(path);
      if (!keys.length) return value == null ? {} : value;
      let n = t;
      for (let i = 0; i < keys.length - 1; i++) {
        if (n[keys[i]] == null || typeof n[keys[i]] !== "object") n[keys[i]] = {};
        n = n[keys[i]];
      }
      const last = keys[keys.length - 1];
      if (value == null) delete n[last]; else n[last] = JSON.parse(JSON.stringify(value));
      return t;
    }
    function notify() {
      subs.forEach((s) => {
        const v = getAt(tree, s.path);
        const j = JSON.stringify(v);
        if (j !== s.last) { s.last = j; s.cb(v == null ? null : JSON.parse(j)); }
      });
    }
    function write(fn) {
      tree = load();
      fn();
      try { localStorage.setItem(KEY, JSON.stringify(tree)); } catch (e) {}
      notify();
      return Promise.resolve();
    }
    window.addEventListener("storage", (e) => { if (e.key === KEY) { tree = load(); notify(); } });

    return {
      mode: "demo",
      on(path, cb) {
        const s = { path, cb, last: undefined };
        subs.push(s);
        setTimeout(() => {
          if (!subs.includes(s)) return;
          tree = load();
          const v = getAt(tree, path);
          s.last = JSON.stringify(v);
          cb(v == null ? null : JSON.parse(s.last));
        }, 0);
        return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
      },
      set: (path, value) => write(() => { setAt(tree, path, value); }),
      update: (obj) => write(() => { Object.keys(obj).forEach((p) => setAt(tree, p, obj[p])); }),
      onConnection(cb) { setTimeout(() => cb(true), 0); },
    };
  }

  window.CuzzoDB = useFirebase ? makeFirebase() : makeDemo();
})();
