const mineflayer = require('mineflayer');
const http = require('http');

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft TPA Auto-Request/Accept Bots are Online!\n');
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

  let tpaLoop = null; 
  bot.isTeleporting = false; 

  // Helper function to shut down the outgoing spam loop
  function killSpamLoop() {
    if (tpaLoop) {
      clearInterval(tpaLoop);
      tpaLoop = null;
      console.log(`[${account.username}] Outgoing TPA loop stopped.`);
    }
  }

  bot.once('spawn', () => {
    console.log(`[${account.username}] Online. Logging in...`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      
      // AUTOMATIC OUTGOING TPA SPAM
      setTimeout(() => {
        killSpamLoop();
        console.log(`[${account.username}] Starting automatic 10s TPA spam to ${CONTROLLER_NAME}...`);
        
        bot.chat(`/tpa ${CONTROLLER_NAME}`);
        tpaLoop = setInterval(() => {
          if (!bot.isTeleporting) {
            bot.chat(`/tpa ${CONTROLLER_NAME}`);
          }
        }, 10000);
      }, 3000);

    }, 1500);
  });

  // Anti-AFK Loop: Active only when not in a countdown
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) {
      bot.swingArm('right');
    }
  }, 30000);

  // EMERGENCY CHAT COMMANDS
  bot.on('chat', (username, message) => {
    if (username !== CONTROLLER_NAME) return;

    if (message === '!stop') {
      killSpamLoop();
    }
    if (message === '!start') {
      bot.chat(`/tpa ${CONTROLLER_NAME}`);
    }
  });

  // SERVER MESSAGE MONITOR (Handles Incoming TPA Requests & Inbound/Outbound Confirmations)
  bot.on('message', (jsonMsg) => {
    const serverMessage = jsonMsg.toString().toLowerCase();
    const lowerController = CONTROLLER_NAME.toLowerCase();

    // --- CASE A: YOU sent a TPA request TO the bot ---
    // Looks for patterns like "username has requested to teleport to you"
    if (serverMessage.includes(lowerController) && (serverMessage.includes('request') || serverMessage.includes('tpa'))) {
      console.log(`[${account.username}] Detected incoming TPA from main player. Accepting instantly...`);
      bot.chat('/tpaccept');
      return; // Stop processing further for this message
    }

    // --- CASE B: TELEPORT HAS BEEN CONFIRMED (Works for both directions) ---
    // Catches words like "accepted", "teleporting", "countdown"
    if ((serverMessage.includes('accepted') || serverMessage.includes('teleport')) && !bot.isTeleporting) {
      console.log(`[${account.username}] Teleport sequence initialized. Freezing movement...`);
      
      bot.isTeleporting = true; 
      killSpamLoop(); // Turn off outgoing spam instantly

      // Freeze for 8 seconds (5s server countdown + 3s chunk buffer)
      setTimeout(() => {
        bot.isTeleporting = false;
        console.log(`[${account.username}] Teleport complete. Bot is active.`);
      }, 8000);
    }
  });

  // Auto-Reconnect Logic
  bot.on('end', (reason) => {
    console.log(`[${account.username}] Disconnected: (${reason}). Cleaning up loops...`);
    killSpamLoop();
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
  console.log(`[System] Launching ${accounts.length} Dual-TPA accounts...`);
  accounts.forEach(spawnAFKBot);
}
