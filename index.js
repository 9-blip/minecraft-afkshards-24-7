const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft TPA AFK Bots are Online!\n');
}).listen(PORT, () => {
  console.log(`[System] Dummy server listening on port ${PORT}`);
});

// 2. ENVIRONMENT CONFIGURATION
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);
const CONTROLLER_NAME = process.env.CONTROLLER_NAME;

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
}

// 3. BOT CORE ENGINE
function spawnAFKBot(account) {
  console.log(`[System] Starting bot: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline'
  });

  bot.isTeleporting = false; // When true, disables anti-AFK swinging to avoid canceling countdowns

  bot.once('spawn', () => {
    console.log(`[${account.username}] Online. Logging in...`);
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
    }, 1500);
  });

  // Anti-AFK Loop: Only active if NOT in a teleport countdown
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) {
      bot.swingArm('right');
    }
  }, 30000);

  // Listen for your "!tpa" command
  bot.on('chat', (username, message) => {
    if (username !== CONTROLLER_NAME) return;

    if (message === '!tpa') {
      console.log(`[${account.username}] Sending single TPA request to ${CONTROLLER_NAME}`);
      bot.chat(`/tpa ${CONTROLLER_NAME}`);
    }
  });

  // AUTOMATIC TELEPORT FREEZE DETECTOR
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();

    // Detects common Essentials/SMP teleport acceptance phrases
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleport')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport accepted by main player! Freezing for countdown...`);
      
      bot.isTeleporting = true; // Lock down anti-AFK actions instantly

      // Wait 8 seconds (5s server countdown + 3s buffer for chunk loading) then unfreeze
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Teleport complete. Bot is active in the AFK zone.`);
      }, 8000);
    }
  });

  // Auto-Reconnect
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Reconnecting in 15s...`);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Error:`, err.message));
}

// Start sequence
if (accounts.length === 0) {
  console.error("[System Error] No bot credentials found in Railway variables.");
  process.exit(1);
} else {
  console.log(`[System] Launching ${accounts.length} TPA-managed accounts...`);
  accounts.forEach(spawnAFKBot);
}
