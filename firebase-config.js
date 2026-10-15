/* ==========================================================================
   FIREBASE SETUP — paste your project's web config here (one time).

   How to get it (about 5 minutes, free):
   1. Go to https://console.firebase.google.com and click "Add project".
      Name it anything (e.g. cuzzo-games). You can turn Google Analytics off.
   2. In the left menu: Build > Realtime Database > Create Database.
      Pick any location, then choose "Start in locked mode".
   3. Open the "Rules" tab, replace everything with the contents of
      database.rules.json from this repo, and click Publish.
   4. Click the gear icon > Project settings > "Your apps" > the </> (Web)
      icon. Register an app (no hosting needed). Firebase then shows a
      firebaseConfig = { ... } block. Copy the values into the object below.

   Make sure databaseURL is filled in. Until it is, the game runs in DEMO MODE
   (works only inside one browser, so you can practice with two tabs).

   These values are not secrets. They only say which database to talk to; the
   rules in database.rules.json decide what anyone can do.
   ========================================================================== */

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",   // e.g. "https://cuzzo-games-default-rtdb.firebaseio.com"
  projectId: "",
  appId: "",
};
