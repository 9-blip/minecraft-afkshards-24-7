const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Chat-Activated AFK Bots are Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server on port ${PORT}`));

// 2. HARDCODED TARGET ACCOUNT (Must match exactly)
const BOSS_NAME = 'Zzynox_'; 

// 3. ENVIRONMENT CONFIGURATION
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
}

// 4. BOT CORE ENGINE
function spawnAFKBot(account) {
  console.log(`[System] Starting bot: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline'
  });

  bot.isTeleporting = false; 

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connected to server network.`);
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Sent /login credentials. Standing by for chat orders...`);
    }, 2000);
  });

  // Anti-AFK Swing Timer (runs every 30 seconds if not frozen)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // CHAT MONITOR: LISTEN FOR PUBLIC CHAT COMMANDS FROM ZZYNOX_
  bot.on('chat', (username, message) => {
    // Completely ignore anyone who isn't you
    if (username !== BOSS_NAME) return;

    // Command 1: You type !tpa in public chat
    if (message === '!tpa' && !bot.isTeleporting) {
      console.log(`[${account.username}] Received !tpa command. Sending request to ${BOSS_NAME}...`);
      bot.chat(`/tpa ${BOSS_NAME}`);
    }

    // Command 2: You type !accept in public chat (if you sent them a /tpahere)
    if (message === '!accept') {
      console.log(`[${account.username}] Received !accept command. Processing /tpaccept...`);
      bot.chat('/tpaccept');
    }
  });

  // SYSTEM MESSAGE MONITOR (Handles countdown freezing when successful)
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();

    // If any server message confirms a teleport sequence has started
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleporting')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport confirmed by server! Freezing for 8 seconds...`);
      
      bot.isTeleporting = true; 

      // Freeze for 8 seconds to allow the 5-second server countdown to complete safely
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Freeze lifted. Bot is ready in the AFK zone.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Sequence
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Reconnecting in 15s...`);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Error:`, err.message));
}

// Global initialization
if (accounts.length === 0) {
  console.error("[System Error] No accounts initialized. Verify variables.");
  process.exit(1);
} else {
  console.log(`[System] Deploying ${accounts.length} chat-controlled nodes for ${BOSS_NAME}...`);
  accounts.forEach(spawnAFKBot);
}
