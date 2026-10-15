# Cuzzo Games

A party voting game for the cousins. Everyone plays on their own phone, the host runs the show from a separate screen, and after each question the winner gets a big reveal. It ends with a recap of all 21 winners and a fun title for every person.

- **Guests** open the main link, tap their name, and vote. No accounts or passwords.
- **Host** opens `host.html` and controls the flow: start a question, close voting, reveal the winner, next question.
- Everything you'll want to change (names, questions, titles) is in **one file: `config.js`**.

---

## 1. Try it right now (demo mode)

Before Firebase is set up, the game runs in demo mode so you can practice.

```
npm run serve        # or: python3 -m http.server 8080
```

Open `http://localhost:8080/host.html` in one tab (host code: `2026`) and `http://localhost:8080/` in another tab. Demo mode only syncs between tabs of the same browser, so it's for practice, not for the real party.

## 2. One-time setup (about 10 minutes, free)

### a) Create the Firebase database

1. Go to <https://console.firebase.google.com> and click **Add project**. Name it anything (for example `cuzzo-games`). Google Analytics can stay off.
2. In the left menu choose **Build > Realtime Database > Create Database**. Pick any location and choose **Start in locked mode**.
3. Open the **Rules** tab. Replace everything with the contents of `database.rules.json` from this repo and click **Publish**.
4. Click the gear icon > **Project settings** > **Your apps** > the `</>` (Web) icon. Register an app (you don't need Firebase Hosting). Firebase shows a `firebaseConfig = { ... }` block.
5. Copy those values into `firebase-config.js`. **`databaseURL` must be filled in**; it looks like `https://cuzzo-games-default-rtdb.firebaseio.com`.

These keys aren't secrets. They only say which database to use. The rules decide what anyone can do.

### b) Put it online (GitHub Pages)

1. Push this repo to GitHub (it's already there).
2. On GitHub: **Settings > Pages > Build and deployment**. Set **Source** to *Deploy from a branch*, branch **main**, folder **/ (root)**, and Save.
3. After a minute or two your link appears. It should look like `https://blackraf.github.io/CuzzoGames/`.
   - Guests use that link.
   - You use that link plus `host.html`.

### c) Make a QR code

Paste the guest link into any free QR generator (for example <https://www.qr-code-generator.com> or the one built into your phone's Share menu), then print it or put it on a screen at the venue.

### d) Change the host code

Open `config.js` and change `hostPin` from `2026` to something only you know.

---

## 3. Running the game on the day

**The day before**
- [ ] Open the guest link on your phone and run through a question from the host screen on a second device (use **More controls > Reset the whole game** when done).
- [ ] Check `config.js` one last time: names spelled right, questions as you like them.

**At the venue**
- [ ] Ask everyone to open the link **once while on good signal** (cell data is fine). After that first load the game files are saved on their phone, so weak wifi only has to carry tiny vote messages.
- [ ] Tip: tell people to "Add to Home Screen" so it opens like an app.
- [ ] Open `host.html` on your phone or laptop. Keep it plugged in; the screen stays awake while the page is open.

**Each question**
1. **Start question N**: guests see the question and their buttons.
2. Watch the live counter ("14 of 19 cousins have voted") and the list of who's still deciding.
3. **Close voting**: votes lock.
4. **Reveal the winner**: drumroll, then the winner with confetti and the top 3. Show your own screen to the room if you like; it displays the same reveal.
5. **Start question N+1**. After question 21, tap **Show the final recap**.

**If something goes wrong**
- Closed voting too early? Tap **Reopen voting**.
- Want to skip around or redo a question? **More controls > Jump to a question** (this clears that question's votes).
- A guest picked the wrong name? They tap **Not you?** at the top and pick again.
- A phone dropped off wifi? It shows a banner and catches up on its own. Votes made while offline are sent when it reconnects.

---

## 4. Editing names, questions and titles

Open `config.js`. It's plain text with comments.

- `cousins` and `elders`: the names (each must be unique). Only cousins play and vote.
- `questions`: the text, `who` (`"cousins"` or `"elders"`, which decides the list of names), and the `badge` the winner earns.
- `titles`: titles for people with several wins, the overall leader, and people who didn't win anything.

Changes go live on GitHub Pages a minute after you push. Phones that already have the game cached pick up the change the next time they reload the page. To force it everywhere, change `CACHE` in `sw.js` (for example `cuzzo-v2`).

Don't rename people after the game has started; their votes are saved under their name.

## 5. How ties and titles work

- **Ties:** if people tie for first, all of them are shown as winners ("It's a tie!") and **each tied person gets credit for the win**. The top 3 shows everyone tied for a top-3 place.
- **Voting rules:** one vote per cousin per question, you can't vote for yourself, and you can change your vote until the host closes voting.
- **Titles:** one win earns that question's `badge`. Two or more wins earn a title from `titles.manyWins`. Whoever has the most wins (and at least 2) is the `leader`. Everyone else gets a friendly "no wins" title.

## 6. Good to know

- **Security is light on purpose.** The host code only keeps curious cousins out of the host screen; it isn't real security. The database rules stop votes after voting closes, votes for yourself, and votes for the wrong question, but there are no accounts, so a determined person could still tamper with the game. That's fine for a family wedding.
- **After the wedding**, delete the Realtime Database in Firebase (or set its rules to `".write": false`) if you want to shut it down.
- **Free tier:** 19 phones is a tiny load for Firebase's free plan.

## 7. Files

| File | What it is |
|---|---|
| `config.js` | **Edit this.** Names, questions, titles, host code. |
| `firebase-config.js` | Your Firebase keys (set up once). |
| `database.rules.json` | Paste into Firebase Realtime Database > Rules. |
| `index.html`, `guest.js` | Guest screens. |
| `host.html`, `host.js` | Host screens. |
| `logic.js` | Tallying votes, ties, top 3, recap titles. |
| `db.js` | Talks to Firebase (or demo mode). |
| `shared.js`, `style.css` | Look and feel, reveal, recap. |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and "Add to Home Screen". |
| `vendor/`, `fonts/` | Firebase SDK and fonts, bundled so nothing loads from the internet. |
| `test/logic.test.js` | Tests for the voting logic. Run with `npm test`. |
