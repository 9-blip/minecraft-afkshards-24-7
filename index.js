const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Hardcoded AFK Bots are Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server on port ${PORT}`));

// 2. HARDCODED TARGET USERNAME (NO MORE VARIABLES FOR THIS)
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

  let tpaLoop = null; 
  bot.isTeleporting = false; 

  bot.once('spawn', () => {
    console.log(`[${account.username}] Online. Logging in...`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      
      // START BRUTE-FORCE TPA SPAM AFTER 5 SECONDS
      console.log(`[${account.username}] Initiating brute-force TPA to ${BOSS_NAME}...`);
      setTimeout(() => {
        bot.chat(`/tpa ${BOSS_NAME}`);
        
        tpaLoop = setInterval(() => {
          if (!bot.isTeleporting) {
            bot.chat(`/tpa ${BOSS_NAME}`);
          }
        }, 15000); // Tries every 15 seconds
      }, 5000);

    }, 1500);
  });

  // Anti-AFK Loop
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // CHAT MONITOR: THE ULTIMATE TRIGGER SYSTEM
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();
    const targetLower = BOSS_NAME.toLowerCase(); // "zzynox_"

    // --- TRIGGER 1: YOU SEND /TPAHERE TO THEM ---
    // If the chat says anything involving "zzynox_" AND ("here" OR "request" OR "teleport")
    if (serverMessage.includes(targetLower) && (serverMessage.includes('here') || serverMessage.includes('request'))) {
      console.log(`[${account.username}] Detected TPAHERE from Boss! Accepting instantly...`);
      bot.chat('/tpaccept'); 
      // Some servers require the name, if /tpaccept fails, change the line above to: bot.chat(`/tpaccept ${BOSS_NAME}`);
    }

    // --- TRIGGER 2: TELEPORT COUNTDOWN FREEZE ---
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleporting')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport confirmed! Freezing movement for 8 seconds...`);
      
      bot.isTeleporting = true; 
      if (tpaLoop) clearInterval(tpaLoop); // Stop spamming TPA forever once successful

      // Unfreeze after 8 seconds
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Teleport complete. Resuming AFK swings.`);
      }, 8000);
    }
  });

  // Auto-Reconnect
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Restarting...`);
    if (tpaLoop) clearInterval(tpaLoop);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Error:`, err.message));
}

if (accounts.length === 0) {
  console.error("[System Error] No bot credentials found in variables.");
  process.exit(1);
} else {
  console.log(`[System] Launching ${accounts.length} Hardcoded Bots for Zzynox_...`);
  accounts.forEach(spawnAFKBot);
}
