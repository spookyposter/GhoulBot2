# 👻 GhoulBot — CyTube AI Chat Bot

A ghoulish, dry-witted AI bot for your CyTube movie night channel.
Powered by Claude AI with OMDB (movie lookup) and Wolfram Alpha (facts/math) support.

---

## Commands

| Command | Description |
|---|---|
| `!help` | List all commands |
| `!now` | What's currently playing |
| `!movie [title]` | GhoulBot's take on a film |
| `!imdb [title]` | Look up movie info (OMDB) |
| `!ask [question]` | Ask GhoulBot anything |
| `!wolfram [query]` | Compute or look up a fact |
| `!joke` | A dark, dry joke |
| `!roast [username]` | Playfully roast someone |
| `!trivia` | Random obscure movie trivia |
| `!rip [subject]` | GhoulBot eulogizes something |

GhoulBot also responds when mentioned by name in chat.

---

## Setup

### 1. Create a CyTube bot account
- Register a separate CyTube account for the bot (e.g. `GhoulBot`)
- Make it a moderator on your channel so it can chat

### 2. Get API keys (all free tiers available)
- **Anthropic** (required): https://console.anthropic.com — create an API key
- **OMDB** (optional but recommended): https://omdbapi.com — free key for movie lookups
- **Wolfram Alpha** (optional): https://developer.wolframalpha.com — free 2000 calls/month

### 3. Deploy to Bunny.net Magic Containers

#### A. Push image to Docker Hub
```bash
# Install Docker Desktop if you haven't: https://docker.com

# Build the image
docker build -t yourdockerhubuser/ghoulbot:latest .

# Log in and push
docker login
docker push yourdockerhubuser/ghoulbot:latest
```

#### B. Create Magic Container on Bunny.net
1. Log into bunny.net → **Magic Containers** → **Add Application**
2. **Image**: `yourdockerhubuser/ghoulbot:latest`
3. **Region**: Pick closest to you (one region is fine for a bot)
4. **Replicas**: 1
5. **No endpoint needed** — the bot connects OUT, doesn't need inbound traffic

#### C. Set Environment Variables in Bunny dashboard
```
CYTUBE_SERVER=https://cytu.be
CYTUBE_CHANNEL=your-channel-name-here
CYTUBE_USERNAME=GhoulBot
CYTUBE_PASSWORD=your-bot-account-password
ANTHROPIC_API_KEY=sk-ant-...
OMDB_API_KEY=your-omdb-key
WOLFRAM_API_KEY=your-wolfram-key
```

#### D. Deploy
Click **Deploy** — the ghoul rises in seconds.

---

## Running Locally (for testing)

```bash
# Install Node.js if needed: https://nodejs.org

npm install

# Set env vars then run
CYTUBE_CHANNEL=yourchannel \
CYTUBE_USERNAME=GhoulBot \
CYTUBE_PASSWORD=yourpass \
ANTHROPIC_API_KEY=sk-ant-... \
node bot.js
```

---

## Cost Estimate (Bunny Magic Containers)

A chat bot is extremely lightweight — it mostly idles waiting for messages.
Expected cost: **$0.05–$0.50/month** depending on chat activity.

---

## Customizing the Personality

Edit the `SYSTEM_PROMPT` in `bot.js` to adjust GhoulBot's character.
Add new commands by adding entries to the `COMMANDS` object.
