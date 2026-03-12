FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy bot
COPY bot.js ./

# Run as non-root
RUN addgroup -S ghoul && adduser -S ghoul -G ghoul
USER ghoul

CMD ["node", "bot.js"]
