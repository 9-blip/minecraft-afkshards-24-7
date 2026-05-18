const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Text-Parser AFK Bots are Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server on port ${PORT}`));

// 2. HARDCODED TARGET ACCOUNT
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
    console.log(`[${account.username}] Connected to host network.`);
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Authenticated. Monitoring raw text stream...`);
    }, 2000);
  });

  // Anti-AFK Swing Timer (runs every 30 seconds if not frozen)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // RAW STREAM PARSER (Bypasses Mineflayer's broken format detector)
  bot.on('message', (jsonMsg) => {
    const rawLine = jsonMsg.toString();
    const cleanLine = rawLine.toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase(); // "zzynox_"

    // --- CASE 1: VERIFYING PUBLIC CHAT COMMANDS FROM YOU ---
    // Checks if the line contains your name followed by the exact trigger command
    if (cleanLine.includes(targetLower)) {
      
      // Trigger A: You typed "!tpa" anywhere in your message line
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) {
        console.log(`[${account.username}] Intercepted raw !tpa command from line: "${rawLine}"`);
        bot.chat(`/tpa ${BOSS_NAME}`);
      }

      // Trigger B: You typed "!accept" anywhere in your message line
      if (cleanLine.includes('!accept')) {
        console.log(`[${account.username}] Intercepted raw !accept command.`);
        bot.chat('/tpaccept');
      }

      // --- CASE 2: DETECT INCOMING TPA/TPAHERE FROM SERVER ---
      // Catches custom server strings like "Zzynox_ wants to teleport to you" or "teleport you to them"
      if ((cleanLine.includes('request') || cleanLine.includes('here') || cleanLine.includes('teleport')) && 
          !cleanLine.includes('!tpa') && !cleanLine.includes('!accept') && !bot.isTeleporting) {
        console.log(`[${account.username}] Inbound TPA request signature found. Auto-accepting...`);
        bot.chat('/tpaccept');
      }
    }

    // --- CASE 3: TELEPORT COMPLETED FREEZE DETECTOR ---
    // Monitors the chat log for server confirmation lines
    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleportation state confirmed by server. Freezing bot input...`);
      bot.isTeleporting = true; 

      // 8-second freeze to buffer through a 5-second countdown safely
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Unfrozen. Bot running normal operations in destination zone.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Sequence
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Re-queueing in 15s...`);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Stream error:`, err.message));
}

// Global initialization
if (accounts.length === 0) {
  console.error("[System Error] Deployment aborted: No account variables found.");
  process.exit(1);
} else {
  console.log(`[System] Initializing text-parsing nodes targeting ${BOSS_NAME}...`);
  accounts.forEach(spawnAFKBot);
}
