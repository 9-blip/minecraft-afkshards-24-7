const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft 4-Bot Cluster is Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server running on port ${PORT}`));

// 2. HARDCODED TARGET ACCOUNT
const BOSS_NAME = 'Zzynox_'; 

// 3. ENVIRONMENT CONFIGURATION (EXPANDED TO 4 BOTS)
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
}
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) {
  accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS });
}
if (process.env.BOT_4_USER && process.env.BOT_4_PASS) {
  accounts.push({ username: process.env.BOT_4_USER, password: process.env.BOT_4_PASS });
}

// 4. BOT ENGINE
function spawnAFKBot(account) {
  console.log(`[System] Launching instance: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline'
  });

  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Established link. Initializing login routine...`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Login string executed.`);
      
      // FALLBACK AUTOMATION LOOP: 
      // Every 5 seconds, the bot will silently attempt to run /tpaccept just in case 
      // you sent a /tpahere request, bypassing chat parsing failures entirely!
      autoAcceptInterval = setInterval(() => {
        if (!bot.isTeleporting) {
          bot.chat('/tpaccept');
        }
      }, 5000);

    }, 3000);
  });

  // Anti-AFK Swing (30-second loop)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // RAW CHAT LOG STRIPPER
  bot.on('message', (jsonMsg) => {
    const rawLine = jsonMsg.toString();
    const cleanLine = rawLine.toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase();

    // Trigger A: Manual trigger override from public chat
    if (cleanLine.includes(targetLower)) {
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) {
        console.log(`[${account.username}] Manual !tpa command caught.`);
        bot.chat(`/tpa ${BOSS_NAME}`);
      }
      if (cleanLine.includes('!accept')) {
        bot.chat('/tpaccept');
      }
    }

    // Trigger B: Teleport countdown catch
    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting') || cleanLine.includes('countdown')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport confirmation registered. Freezing all interactions.`);
      bot.isTeleporting = true; 

      // 8 seconds total lockdown (5s countdown + 3s server world rendering buffer)
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Safe arrival. Anti-AFK routines operational.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Structure
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Lost connection: (${reason}). Re-instantiating in 15s...`);
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Operational error:`, err.message));
}

// Global Launcher Sequence
if (accounts.length === 0) {
  console.error("[System Error] No credentials found in configurations. Build paused.");
  process.exit(1);
} else {
  console.log(`[System] Initializing cluster matrix for ${accounts.length} nodes...`);
  accounts.forEach(spawnAFKBot);
}
