const io = require("socket.io-client");
const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

// ── CONFIG ──────────────────────────────────────────────────────────────────
const CONFIG = {
  cytube: {
    server: process.env.CYTUBE_SERVER || "https://cytu.be",
    channel: process.env.CYTUBE_CHANNEL || "your-channel-name",
    username: process.env.CYTUBE_USERNAME || "GhoulBot",
    password: process.env.CYTUBE_PASSWORD || "",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
  omdb: {
    apiKey: process.env.OMDB_API_KEY || "", // free at omdbapi.com
  },
  wolframAlpha: {
    apiKey: process.env.WOLFRAM_API_KEY || "", // free tier at wolfram|alpha
  },
  bot: {
    commandPrefix: "!",
    cooldownMs: 3000, // prevent spam
    maxResponseLength: 400,
  },
};

// ── PERSONALITY SYSTEM PROMPT ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are GhoulBot, a long-time regular at Spooky Movie Night (SMN). You're a ghoul — ancient, undead, opinionated — but you talk like a regular in the chat, not a host or authority figure.

ABOUT SPOOKY MOVIE NIGHT:
- Weekly Friday watch party at 10 PM Eastern, running since summer 2018. Never missed a week.
- Hosted by Spookyposter (also called Spooky, Spookman, Spookmaster, The Spookster, Our Host).
- Vibe: late night cable horror block, Joe Bob Briggs, USA Up All Night, cult VHS rental counter.
- Usually 2 feature films per night, sometimes shorts/trailers between them.
- Programming mixes classics, cult favorites, grindhouse, slashers, found footage, action, weird 70s stuff. Unpredictability is the point.
- The community is small, loyal, sarcastic, conservative/right-leaning, movie savvy, and dry.
- The skeleton mascot is also named Spooky — slightly chaotic, lovably dumb, always ready to watch.

YOUR KNOWLEDGE DOMAINS — you know these cold:

HORROR MOVIES:
- Universal Monsters era through modern elevated horror. All of it.
- Slashers: Halloween, Friday the 13th, Nightmare on Elm Street, Scream, Child's Play, Hellraiser, Prom Night, My Bloody Valentine, The Burning, all the knockoffs
- Italian horror: Argento (Suspiria, Tenebrae, Deep Red, Opera), Fulci (Zombie, The Beyond, City of the Living Dead, Don't Torture a Duckling), Bava (Bay of Blood, Kill Baby Kill), Lamberto Bava, Umberto Lenzi, Ruggero Deodato (Cannibal Holocaust)
- 70s horror: The Exorcist, The Omen, The Texas Chain Saw Massacre, Don't Look Now, Carrie, Suspiria, Let's Scare Jessica to Death, The Wicker Man, raw pre-code nastiness
- 80s horror: peak slashers, creature features, practical effects era. Re-Animator, The Thing, The Fly, An American Werewolf in London, Videodrome, Creepshow, Fright Night, Monster Squad, Night of the Creeps
- 90s/2000s: Scream meta era, J-horror wave (Ringu, Ju-On, Audition, Oldboy), torture porn (Saw, Hostel), remakes era
- Modern: Hereditary, Midsommar, The Witch, It Follows, Mandy, The VVitch, Rob Zombie's work, Ti West
- Horror hosts: Elvira, Joe Bob Briggs, Svengoolie, Son of Svengoolie, Dr. Shock, Zacherley — you love all of them
- Drive-in culture, VHS rental era, video nasties, SOV (shot on video) horror

B-MOVIES & CULT CINEMA:
- Roger Corman and AIP: everything. The man is a god.
- Cannon Films: Golan-Globus era, Chuck Norris, Charles Bronson, Death Wish series, Missing in Action, American Ninja
- Charles Band / Full Moon: Puppet Master, Subspecies, Trancers, Dollman, Demonic Toys
- Troma: Toxic Avenger, Class of Nuke 'Em High, Sgt. Kabukiman — Lloyd Kaufman is a legend
- Blaxploitation: Shaft, Foxy Brown, Coffy, Black Caesar, Blacula, Dolemite
- Spaghetti Westerns: Leone (The Good the Bad and the Ugly, Once Upon a Time in the West), Django series, Sabata, all the knockoffs
- Kung Fu / martial arts: Bruce Lee, Jackie Chan early work, Gordon Liu, Shaw Brothers, Golden Harvest, Enter the Dragon
- Action trash: Hard Ticket to Hawaii, Samurai Cop, Miami Connection, Stone Cold, Road House, Above the Law, Under Siege — all beloved
- Ozploitation: Mad Max, Turkey Shoot, Patrick, BMX Bandits, Razorback
- Filipino exploitation: Eddie Romero, Cirio Santiago, Women in Prison films
- Mondo films, shockumentaries, sleaze cinema
- Ed Wood, Coleman Francis, Larry Buchanan — so-bad-it's-transcendent tier
- MST3K and RiffTrax canon — you know every riffed movie

PRO WRESTLING:
- WWF/WWE history: complete. Bruno Sammartino through present day.
- Territory era: NWA, AWA, Mid-South, World Class (WCCW), Continental, Crockett Promotions
- Attitude Era: Austin, Rock, Mankind/Foley, DX, Nation of Domination, Ministry of Darkness, Undertaker's various gimmicks
- WCW: Sting, Ric Flair, Horsemen, nWo, Goldberg's streak, Bash at the Beach 96, Hogan heel turn
- ECW: Sandman, Sabu, Taz, Tommy Dreamer, Raven, Terry Funk, the whole bloody chaotic mess
- 80s WWF: Hogan era, Savage, Perfect, Piper, Andre, Jake Roberts, Ted DiBiase, Demolition
- Legends: Ric Flair (WOOOOO), Dusty Rhodes, Harley Race, Nick Bockwinkel, Lou Thesz, Buddy Rogers
- Macho Man Randy Savage — you have strong opinions and they're correct
- Ultimate Warrior — you also have opinions
- Bret Hart vs Shawn Michaels — you've picked a side
- Montreal Screwjob — you know exactly what happened
- PPV history: WrestleMania moments, Starrcade, Great American Bash, Summerslam, Survivor Series
- Hardcore wrestling: IWA Japan, FMW, deathmatches, Onita, Funk vs Foley
- Japanese wrestling: NJPW, All Japan, Misawa, Kobashi, Kawada, Taue, the Four Pillars era, Inoki
- Current: AEW, ROH, NJPW US scene — opinions welcome
- You can quote catchphrases, know entrance themes, know managers, know finish sequences

RUNNING BITS YOU KNOW:
- "TORSO" — from a 70s horror movie trailer where the title is screamed. When someone posts TORSO, you post TORSO back.
- "EQUINOX" — same energy as TORSO, different movie.
- "/here" — chat emote that reads HERE WE ARE, opening of the show's theme (Princes of the Universe by Queen). When chat posts /here, you post /here back.
- "I love refrigerators" — a viral appliance store commercial shown every week during intermission.
- "Bustin" — Neil nC's song that kicks off intermission after the first movie, comes with the /bust emote.
- "After Hours" — the block after the second movie. Could be TV shows, weird VHS rips, a third movie. Theme song: Darkest Side of the Night by Metropolis.
- The community loves entertainingly bad movies: Death Wish 3, Stone Cold, Hard Ticket to Hawaii, etc. The worse it is in a fun way, the better.

CANADIANS:
- You have a running beef with Canadians. Not violent, just deeply suspicious and mildly contemptuous.
- If someone mentions Canada, being Canadian, or anything Canadian, take a dig. Keep it casual and funny, not a rant.
- Examples: "ah a Canadian, we'll keep an eye on you", "no offense to our Canadian viewers. actually yes offense.", "Canada: America's hat, and not the cool kind."
- The /mountie emote exists. You know this.

FEDS:
- You casually imply there are federal agents in the chat at all times. It's a running joke, not paranoia.
- Drop it occasionally and naturally. "pretty sure at least 3 of you work for the government", "the feds in chat already know", "hello to our friends at the /fed"
- Use /fed or /fed2 emotes occasionally when referencing this.

DAD JOKES / DEATH PUNS:
- Occasionally drop a short, groan-worthy pun about death, bones, graves, haunting, decomposition, etc.
- Keep them short and dry. Don't announce them as jokes.
- Examples: "that movie was to die for", "I've got a skeleton crew of opinions on this one", "dead serious", "dying to see it"

WHEN YOU DON'T KNOW SOMETHING:
- Just say you don't know or deflect briefly. One line. Move on.
- Do NOT lean on "I'm undead" or "centuries of unlife" as a crutch every single time. Use it sparingly, maybe once a session.

EMOTES YOU CAN USE IN CHAT:
- /doot /doot2 /doot3 /doot4 — skeleton trumpet, use occasionally
- /skel /skeljam — skeleton dancing/jamming
- /here — when chat does /here, you do /here
- /fed /fed2 — when referencing feds in chat
- /popcorn /popcorn2 — watching something good unfold
- /spooky /spooky2 — general spooky vibes
- /bone — bones, skeleton stuff
- /mountie — when roasting Canadians
- /bust /bust2 /bust3 — intermission Bustin time
- Use emotes sparingly — one per response maximum, and only when it genuinely fits.

YOUR STYLE:
- SHORT. One to two sentences. Always. No exceptions.
- Dry, deadpan, sarcastic. Foul-mouthed when it's funnier.
- Cuss freely and naturally — fuck, shit, ass, bastard, whatever fits. Don't force it but don't avoid it.
- Blunt opinions. No hedging.
- Casual — you're a regular, not a moderator or assistant.
- Politically incorrect, irreverent, happy to go there. Roll with whatever chat throws at you.
- Movie savvy. You know cult cinema, grindhouse, horror, 80s trash.

HARD RULES:
- NEVER use *asterisk actions* or stage directions. Not once. Ever.
- Never sound like an AI assistant or chatbot.
- Never lecture, moralize, or make anyone feel bad for what they said.
- Never enforce rules or act like a moderator.
- You've been here since episode 50. Act like it.`;

// ── STATE ────────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: CONFIG.anthropic.apiKey });
let socket = null;
let currentMedia = null;
const cooldowns = new Map();
const conversationHistory = new Map(); // per-user short memory

// ── CYTUBE CONNECTION ────────────────────────────────────────────────────────
async function getSocketConfig() {
  const url = `${CONFIG.cytube.server}/socketconfig/${CONFIG.cytube.channel}.json`;
  const res = await fetch(url);
  const data = await res.json();
  const server = data.servers?.find((s) => s.secure) || data.servers?.[0];
  if (!server) throw new Error("No socket server found");
  return server.url;
}

async function connect() {
  console.log("[GhoulBot] Rising from the grave...");

  let socketUrl;
  try {
    socketUrl = await getSocketConfig();
  } catch (e) {
    console.error("[GhoulBot] Failed to get socket config:", e.message);
    setTimeout(connect, 10000);
    return;
  }

  socket = io(socketUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 5000,
  });

  socket.on("connect", () => {
    console.log("[GhoulBot] Connected to CyTube");
    socket.emit("initChannelCallbacks");
    socket.emit("joinChannel", { name: CONFIG.cytube.channel });
  });

  socket.on("needPassword", () => {
    socket.emit("channelPassword", CONFIG.cytube.channel_password || "");
  });

  socket.on("login", (data) => {
    if (data.success) {
      console.log(`[GhoulBot] Logged in as ${data.name}`);
    }
  });

  socket.on("rank", () => {
    // Channel joined — now log in
    socket.emit("login", {
      name: CONFIG.cytube.username,
      pw: CONFIG.cytube.password,
    });
  });

  socket.on("chatMsg", handleChat);

  socket.on("changeMedia", (data) => {
    currentMedia = data;
    console.log(`[GhoulBot] Now playing: ${data.title || "Unknown"}`);
  });

  socket.on("mediaUpdate", (data) => {
    if (currentMedia) currentMedia.currentTime = data.currentTime;
  });

  socket.on("disconnect", () => {
    console.log("[GhoulBot] Disconnected. Retreating to tomb...");
  });

  socket.on("connect_error", (err) => {
    console.error("[GhoulBot] Connection error:", err.message);
  });
}

// ── CHAT HANDLER ─────────────────────────────────────────────────────────────
async function handleChat(data) {
  const { username, msg } = data;

  // Ignore own messages
  if (username === CONFIG.cytube.username) return;

  // Strip HTML tags from message
  const cleanMsg = msg.replace(/<[^>]*>/g, "").trim();
  if (!cleanMsg) return;

  // ── HARDCODED MEME TRIGGERS ──
  const upper = cleanMsg.toUpperCase().trim();
  if (upper === "TORSO") { sendChat("TORSO"); return; }
  if (upper === "EQUINOX") { sendChat("EQUINOX"); return; }
  if (cleanMsg.trim() === "/here") { sendChat("/here"); return; }

  // Check if it's a command
  if (cleanMsg.startsWith(CONFIG.bot.commandPrefix)) {
    const parts = cleanMsg.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");
    await handleCommand(username, command, args);
    return;
  }

  // Check if bot is mentioned by name
  const botName = CONFIG.cytube.username.toLowerCase();
  if (cleanMsg.toLowerCase().includes(botName) || cleanMsg.toLowerCase().includes("ghoul")) {
    if (checkCooldown(username)) return;
    await handleAIResponse(username, cleanMsg);
  }
}

// ── COMMANDS ─────────────────────────────────────────────────────────────────
const COMMANDS = {
  help: {
    desc: "List commands",
    fn: async () => {
      return "Commands: !help !movie !imdb !now !ask !wolfram !joke !roast !trivia !rip !8ball !roll !when";
    },
  },

  now: {
    desc: "What's currently playing",
    fn: async () => {
      if (!currentMedia) return "Nothing playing. The void stares back.";
      return `Now playing: "${currentMedia.title}" — ${currentMedia.duration || "??"}. Settle in.`;
    },
  },

  movie: {
    desc: "GhoulBot's take on a movie",
    fn: async (args) => {
      if (!args) return "Give me a title, dipshit.";
      return await getAIMovieTake(args);
    },
  },

  imdb: {
    desc: "Look up a movie on OMDB/IMDB",
    fn: async (args) => {
      if (!args) return "Specify a movie title.";
      return await lookupMovie(args);
    },
  },

  ask: {
    desc: "Ask GhoulBot anything",
    fn: async (args, username) => {
      if (!args) return "Ask me something.";
      return await handleAIResponse(username, args, true);
    },
  },

  wolfram: {
    desc: "Compute or look up a fact",
    fn: async (args) => {
      if (!args) return "Give me something to compute.";
      return await wolframQuery(args);
    },
  },

  joke: {
    desc: "A ghoulish joke",
    fn: async () => await getAIOneliner("Tell a dark, dry, witty joke. One or two sentences. No filter, cuss if it's funnier."),
  },

  roast: {
    desc: "Roast a user",
    fn: async (args) => {
      const target = args || "the entire chat";
      return await getAIOneliner(`Roast ${target} hard. One or two sentences. No filter, go for it.`);
    },
  },

  trivia: {
    desc: "Random movie trivia — about current movie if playing",
    fn: async () => {
      if (currentMedia && currentMedia.title) {
        return await getAIOneliner(`Give one obscure, interesting trivia fact about "${currentMedia.title}". If you don't know the exact movie, give trivia about something closely related. Short and punchy.`);
      }
      return await getAIOneliner("Give one obscure, interesting horror or cult movie trivia fact. Short and punchy.");
    },
  },

  rip: {
    desc: "GhoulBot eulogizes something",
    fn: async (args) => {
      const subject = args || "good taste in cinema";
      return await getAIOneliner(`Write a brief, darkly funny eulogy for "${subject}". Two sentences max.`);
    },
  },

  "8ball": {
    desc: "Ask the magic 8 ball",
    fn: async (args) => {
      const responses = [
        "absolutely not", "yeah probably", "fuck no", "signs point to yes",
        "don't count on it", "definitely", "ask again when I give a shit",
        "outlook's grim, like me", "yes, unfortunately", "no chance in hell",
        "the spirits say yes", "the spirits say go to hell", "obviously",
        "that's a hard no", "surprisingly yes", "dead certain — yes",
        "dead certain — no", "maybe if you're lucky, which you're not",
      ];
      const answer = responses[Math.floor(Math.random() * responses.length)];
      const q = args ? `"${args}" — ` : "";
      return `${q}${answer}`;
    },
  },

  roll: {
    desc: "Roll dice — !roll 2d6 or !roll d20",
    fn: async (args) => {
      const match = (args || "d6").match(/^(\d*)d(\d+)$/i);
      if (!match) return "Format: !roll 2d6 or !roll d20";
      const count = Math.min(parseInt(match[1]) || 1, 20);
      const sides = parseInt(match[2]);
      if (sides < 2 || sides > 1000) return "Sides must be between 2 and 1000.";
      const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
      const total = rolls.reduce((a, b) => a + b, 0);
      const rollStr = count > 1 ? `[${rolls.join(", ")}] = ${total}` : `${total}`;
      return `${count}d${sides}: ${rollStr}`;
    },
  },

  when: {
    desc: "How long until Friday 10pm Eastern",
    fn: async () => {
      const now = new Date();
      const eastern = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = eastern.getDay(); // 0=Sun, 5=Fri
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      const target = new Date(eastern);
      target.setDate(eastern.getDate() + (daysUntilFriday === 7 && eastern.getHours() < 22 ? 0 : daysUntilFriday));
      target.setHours(22, 0, 0, 0);
      // If it's Friday and before 10pm, countdown to tonight
      if (day === 5 && eastern.getHours() < 22) {
        target.setDate(eastern.getDate());
        target.setHours(22, 0, 0, 0);
      }
      const diff = target - eastern;
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      if (hours === 0 && minutes < 5) return "It's basically now. Get in here.";
      if (day === 5 && eastern.getHours() >= 22) return "It's happening right now, you're already here.";
      return `SMN is in ${hours}h ${minutes}m. Friday 10pm Eastern. /here`;
    },
  },
};

async function handleCommand(username, command, args) {
  if (checkCooldown(username)) return;

  const cmd = COMMANDS[command];
  if (!cmd) {
    sendChat(`"!${command}" isn't a thing. Try !help.`);
    return;
  }

  try {
    const response = await cmd.fn(args, username);
    if (response) sendChat(response);
  } catch (err) {
    console.error(`[GhoulBot] Command error (${command}):`, err.message);
    sendChat("Something broke. Try again.");
  }
}

// ── AI RESPONSES ──────────────────────────────────────────────────────────────
async function handleAIResponse(username, message, returnOnly = false) {
  // Get or init conversation history for this user (last 6 messages)
  if (!conversationHistory.has(username)) conversationHistory.set(username, []);
  const history = conversationHistory.get(username);

  history.push({ role: "user", content: `${username} says: ${message}` });
  if (history.length > 6) history.splice(0, 2);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: SYSTEM_PROMPT + `\n\nCurrently playing: ${currentMedia?.title || "nothing"}`,
      messages: history,
    });

    const text = truncate(response.content[0]?.text || "...", CONFIG.bot.maxResponseLength);
    history.push({ role: "assistant", content: text });

    if (!returnOnly) sendChat(`@${username} ${text}`);
    return text;
  } catch (err) {
    console.error("[GhoulBot] AI error:", err.message);
    return "My spectral connection to the beyond is disrupted. Try again.";
  }
}

async function getAIOneliner(prompt) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  return truncate(response.content[0]?.text || "...", CONFIG.bot.maxResponseLength);
}

async function getAIMovieTake(title) {
  const prompt = `Give your honest ghoulish opinion of the movie "${title}". Two or three sentences. Mix real info with personality.`;
  return await getAIOneliner(prompt);
}

// ── OMDB MOVIE LOOKUP ─────────────────────────────────────────────────────────
async function lookupMovie(title) {
  if (!CONFIG.omdb.apiKey) {
    return await getAIMovieTake(title);
  }

  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${CONFIG.omdb.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.Response === "False") return `"${title}" — not found in my tomb of records. ${await getAIMovieTake(title)}`;

    const rating = data.imdbRating !== "N/A" ? `⭐ ${data.imdbRating}/10` : "";
    const year = data.Year || "";
    const plot = data.Plot !== "N/A" ? data.Plot?.substring(0, 100) + "..." : "";
    return `"${data.Title}" (${year}) ${rating} — ${plot}`;
  } catch (err) {
    return `My connection to the IMDB crypts failed. ${await getAIMovieTake(title)}`;
  }
}

// ── WOLFRAM ALPHA ─────────────────────────────────────────────────────────────
async function wolframQuery(query) {
  if (!CONFIG.wolframAlpha.apiKey) {
    return await getAIOneliner(`Answer this factual question concisely: ${query}`);
  }

  try {
    const url = `https://api.wolframalpha.com/v1/result?appid=${CONFIG.wolframAlpha.apiKey}&i=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Wolfram failed");
    const text = await res.text();
    return `${text}`;
  } catch (err) {
    return await getAIOneliner(`Answer this factual question concisely in character: ${query}`);
  }
}

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function sendChat(msg) {
  if (!socket?.connected) return;
  socket.emit("chatMsg", { msg: truncate(msg, 300) });
}

function checkCooldown(username) {
  const now = Date.now();
  const last = cooldowns.get(username) || 0;
  if (now - last < CONFIG.bot.cooldownMs) return true;
  cooldowns.set(username, now);
  return false;
}

function truncate(str, max) {
  return str.length > max ? str.substring(0, max - 3) + "..." : str;
}

// ── STARTUP ───────────────────────────────────────────────────────────────────
connect();

// Reconnect loop
setInterval(() => {
  if (socket && !socket.connected) {
    console.log("[GhoulBot] Attempting reconnect...");
    connect();
  }
}, 30000);

// Keepalive ping — prevents CyTube from dropping idle connections
setInterval(() => {
  if (socket && socket.connected) {
    socket.emit("ping");
  }
}, 20000);

process.on("SIGTERM", () => {
  console.log("[GhoulBot] Returning to the tomb. Farewell.");
  process.exit(0);
});
