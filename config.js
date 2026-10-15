/* ==========================================================================
   CUZZO GAMES — EDIT THIS FILE
   --------------------------------------------------------------------------
   Everything you might want to change lives here: names, questions, titles.
   Firebase keys are in firebase-config.js (a separate file, set up once).

   After editing, save and push to GitHub. If guests already opened the game,
   they pick up changes the next time they reload the page.

   Rules of thumb
   - Each name must be unique. Changing a name changes its internal id, so
     don't rename people in the middle of the game.
   - "who" is either "cousins" or "elders". It decides which list of names the
     question shows.
   - Only the cousins vote. Nobody can vote for themselves.
   ========================================================================== */

window.CUZZO_CONFIG = {

  /* --- Look and feel ---------------------------------------------------- */
  gameTitle: "Cuzzo Games",
  tagline: "Who really is who? Vote and find out.",

  /* The host screen (host.html) asks for this code. Change it before the
     wedding. It keeps curious cousins out of the host controls; it is not
     bank-grade security. */
  hostPin: "2026",

  /* --- The people ------------------------------------------------------- */
  elders: [
    "Tata Fatou",
    "Tata Amie",
    "Tantie Nima",
    "Tata Oumou",
    "Tonton Almamie",
  ],

  cousins: [
    "Kevin",
    "Deina",
    "Melissa",
    "Aicha",
    "Mariame",
    "Tairou",
    "Marcel",
    "Alex",
    "Tommie",
    "Sophie",
    "Mohamed Fofana Jr",
    "Rabia",
    "Lamine",
    "Lilly",
    "Almamie Jr",
    "Rafiou",
    "Adnan",
    "Malal",
    "Keila",
  ],

  /* --- The questions ---------------------------------------------------- */
  /* text:  what everyone sees
     who:   "cousins" or "elders" (who can be voted for)
     badge: the fun title a winner earns on the final recap (keep it kind!)  */
  questions: [
    { text: "Who is the biggest bum?",                                                     who: "cousins", badge: "Couch Champion" },
    { text: "Who is your favorite?",                                                       who: "cousins", badge: "Everyone's Favorite" },
    { text: "Which aunt or uncle is the most strict?",                                     who: "elders",  badge: "Head of Discipline" },
    { text: "Which cousin is the smartest?",                                               who: "cousins", badge: "Big Brain" },
    { text: "Which cousin has the worst style?",                                           who: "cousins", badge: "Fashion Risk-Taker" },
    { text: "Which cousin has the best style?",                                            who: "cousins", badge: "Style Icon" },
    { text: "Which aunt or uncle is the funniest?",                                        who: "elders",  badge: "Elder Comedian" },
    { text: "Which cousin is the most likely to be late to their own wedding?",            who: "cousins", badge: "Fashionably Late" },
    { text: "Which cousin is the best dancer?",                                            who: "cousins", badge: "Dance Floor Legend" },
    { text: "Which cousin is the worst driver?",                                           who: "cousins", badge: "Scenic Route Driver" },
    { text: "Which aunt or uncle gives the best advice?",                                  who: "elders",  badge: "Wise Counsel" },
    { text: "Which cousin is the biggest drama queen or king?",                            who: "cousins", badge: "Drama Royalty" },
    { text: "Which cousin eats the most?",                                                 who: "cousins", badge: "Buffet Champion" },
    { text: "Which aunt or uncle cooks the best?",                                         who: "elders",  badge: "Master Chef" },
    { text: "Which cousin would survive the longest on a deserted island?",                who: "cousins", badge: "Island Survivor" },
    { text: "Which cousin is the most likely to become famous?",                           who: "cousins", badge: "Future Star" },
    { text: "Which cousin knows everyone's business before they do?",                      who: "cousins", badge: "Family News Anchor" },
    { text: "Which cousin would be the best gang member?",                                 who: "cousins", badge: "Squad Boss" },
    { text: "Which aunt or uncle would be the first to get scammed by an email from a \"prince\"?", who: "elders", badge: "Royal Pen Pal" },
    { text: "Which cousin is the funniest?",                                               who: "cousins", badge: "Class Clown" },
    { text: "Which cousin would take a selfie at a funeral?",                              who: "cousins", badge: "Selfie Specialist" },
  ],

  /* --- Recap titles ----------------------------------------------------- */
  titles: {
    /* Won exactly 1 question: they get that question's badge (above).
       Won 2 or more: they get one of these, by number of wins. "default"
       covers anything higher than the biggest number listed. */
    manyWins: {
      2: "Double Trouble",
      3: "Triple Threat",
      4: "Cousin Royalty",
      default: "Legend of the Family",
    },

    /* Whoever won the most questions (and at least 2) gets this instead. */
    leader: "Cousin of the Night",

    /* People who won nothing still get a title. They are handed out in
       order, so everyone gets a different one until the list repeats. */
    noWinsCousins: [
      "Professional Voter",
      "The Peacemaker",
      "Secret Favorite",
      "Mystery Guest of Honor",
      "Team Player",
      "Backbone of the Family",
      "Quiet Legend",
      "Snack Guardian",
    ],
    noWinsElders: [
      "Beloved Elder",
      "Keeper of the Peace",
      "Pillar of the Family",
      "Wisdom Collector",
      "Honored Guest",
    ],
  },
};
