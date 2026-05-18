const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Brute-Force TPA Bots are Online!\n');
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

  let tpaLoop = null; 
  bot.isTeleporting = false; 

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connected to server network. Initiating login...`);
    
    setTimeout(() => {
      // Step 1: Run the authentication command
      bot.chat(`/login ${account.password}`);
      console.log(`[${account.username}] Sent /login credentials.`);
      
      // Step 2: WAIT 4 SECONDS FOR WORLD LIFTOFF / LOBBY SWITCH
      setTimeout(() => {
        if (bot.isTeleporting) return;
        
        console.log(`[${account.username}] Lobby transition cleared. Launching TPA loop to ${BOSS_NAME}...`);
        
        // Fire the initial TPA request immediately
        bot.chat(`/tpa ${BOSS_NAME}`);
        
        // Keep checking and resending every 10 seconds until accepted
        tpaLoop = setInterval(() => {
          if (!bot.isTeleporting) {
            console.log(`[${account.username}] Executing recurring TPA push...`);
            bot.chat(`/tpa ${BOSS_NAME}`);
          }
        }, 10000);

      }, 4000); // 4000ms safety buffer post-login

    }, 2000); // Initial connection buffer
  });

  // Anti-AFK Swing Timer (runs every 30 seconds if not frozen)
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  // CHAT SCANNER AND EVENT SYSTEM
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();
    const targetLower = BOSS_NAME.toLowerCase();

    // TRIGGER A: INCOMING COMMAND RECOGNITION (/tpahere)
    if (serverMessage.includes(targetLower) && (serverMessage.includes('here') || serverMessage.includes('request'))) {
      console.log(`[${account.username}] Intercepted direct TPAHERE message from ${BOSS_NAME}. Auto-accepting.`);
      bot.chat('/tpaccept');
    }

    // TRIGGER B: TELEPORTATION INITIALIZATION DETECTION
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleporting')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport confirmed by server. Disabling loop and freezing execution...`);
      
      bot.isTeleporting = true; 
      if (tpaLoop) {
        clearInterval(tpaLoop);
        tpaLoop = null;
      }

      // Freeze for 8 seconds (Allows the 5-second server countdown to resolve cleanly)
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Freeze lift. Bot successfully initialized inside destination zone.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Sequence
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected from host: (${reason}). Re-queuing stream...`);
    if (tpaLoop) clearInterval(tpaLoop);
    clearInterval(afkInterval);
    setTimeout(() => spawnAFKBot(account), 15000);
  });

  bot.on('error', (err) => console.error(`[${account.username}] Critical Stream Error:`, err.message));
}

// Global initialization
if (accounts.length === 0) {
  console.error("[System Error] No accounts initialized. Verify environment configuration.");
  process.exit(1);
} else {
  console.log(`[System] Deploying ${accounts.length} brute-force TPA nodes targeting user ${BOSS_NAME}...`);
  accounts.forEach(spawnAFKBot);
}
