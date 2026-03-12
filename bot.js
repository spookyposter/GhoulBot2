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

RUNNING BITS YOU KNOW:
- "TORSO" — from a 70s horror movie trailer where the title is screamed. When someone posts TORSO, you post TORSO back.
- "EQUINOX" — same energy as TORSO, different movie.
- "/here" — chat emote that reads HERE WE ARE, opening of the show's theme (Princes of the Universe by Queen). When chat posts /here, you post /here back.
- "I love refrigerators" — a viral appliance store commercial shown every week during intermission.
- "Bustin" — Neil nC's song that kicks off intermission after the first movie, comes with the /bust emote.
- "After Hours" — the block after the second movie. Could be TV shows, weird VHS rips, a third movie. Theme song: Darkest Side of the Night by Metropolis.
- The community loves entertainingly bad movies: Death Wish 3, Stone Cold, Hard Ticket to Hawaii, etc. The worse it is in a fun way, the better.

RACISM / EDGELORDS:
- If someone is being overtly racist in a try-hard way, casually call them out for being edgy and gay about it. Not preachy, just dismissive and dry.
- Examples: "relax edgelord", "very cool and heterosexual of you", "we get it you're very brave", "stunning and bold", "ok cool down sir"
- One line, move on immediately. Never lecture or make a big deal of it.

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
- Dry, deadpan, sarcastic. Dark humor welcome.
- Blunt opinions. No hedging.
- Casual — you're a regular, not a moderator or assistant.
- Mildly politically incorrect and irreverent. Never cruel to the community itself.
- Movie savvy. You know cult cinema, grindhouse, horror, 80s trash.

HARD RULES:
- NEVER use *asterisk actions* or stage directions. Not once. Ever.
- Never sound like an AI assistant or chatbot.
- Never lecture, explain at length, or over-explain a joke.
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
      return "Commands: !help !movie [title] !now !imdb [title] !ask [question] !wolfram [query] !joke !roast [username] !trivia !rip";
    },
  },

  now: {
    desc: "What's currently playing",
    fn: async () => {
      if (!currentMedia) return "Nothing playing. The void stares back.";
      return `Now playing: "${currentMedia.title}" — ${currentMedia.duration || "??"}. Settle in, mortals.`;
    },
  },

  movie: {
    desc: "GhoulBot's take on a movie",
    fn: async (args) => {
      if (!args) return "Give me a title, you hollow-skulled creature.";
      return await getAIMovieTake(args);
    },
  },

  imdb: {
    desc: "Look up a movie on OMDB/IMDB",
    fn: async (args) => {
      if (!args) return "Specify a movie title, wraith.";
      return await lookupMovie(args);
    },
  },

  ask: {
    desc: "Ask GhoulBot anything",
    fn: async (args, username) => {
      if (!args) return "Ask me something, you trembling little mortal.";
      return await handleAIResponse(username, args, true);
    },
  },

  wolfram: {
    desc: "Compute or look up a fact",
    fn: async (args) => {
      if (!args) return "Give me something to compute, worm.";
      return await wolframQuery(args);
    },
  },

  joke: {
    desc: "A ghoulish joke",
    fn: async () => await getAIOneliner("Tell me a dark, dry, witty joke. One or two sentences max. Stay in character."),
  },

  roast: {
    desc: "Roast a user",
    fn: async (args) => {
      const target = args || "the entire chat";
      return await getAIOneliner(`Roast ${target} in your ghoulish style. One or two sentences. Playful, not cruel.`);
    },
  },

  trivia: {
    desc: "Random movie trivia",
    fn: async () => await getAIOneliner("Give me one obscure, interesting movie trivia fact. Keep it short and punchy."),
  },

  rip: {
    desc: "GhoulBot eulogizes something",
    fn: async (args) => {
      const subject = args || "good taste in cinema";
      return await getAIOneliner(`Write a brief, darkly funny eulogy for "${subject}". Two sentences max.`);
    },
  },
};

async function handleCommand(username, command, args) {
  if (checkCooldown(username)) return;

  const cmd = COMMANDS[command];
  if (!cmd) {
    sendChat(`*adjusts monocle* "${command}" is not a command I recognize. Try !help, ${username}.`);
    return;
  }

  try {
    const response = await cmd.fn(args, username);
    if (response) sendChat(response);
  } catch (err) {
    console.error(`[GhoulBot] Command error (${command}):`, err.message);
    sendChat("My ancient circuits are misfiring. Try again, mortal.");
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
