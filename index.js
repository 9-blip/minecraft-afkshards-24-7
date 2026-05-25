const mineflayer = require('mineflayer');
const http = require('http');

// 1. HEALTH CHECK SERVER FOR RAILWAY
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Stealth AFK Cluster Online\n');
}).listen(PORT);

const BOSS_NAME = 'Zzynox_'; 
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS });
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS });
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS });

function spawnStealthBot(account) {
  console.log(`[Humanizer] Initializing realistic handshake for: ${account.username}...`);

  const bot = mineflayer.createBot({
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.20.4',
    viewDistance: 'normal', // Changed from tiny to normal to mimic a real client
    physicsEnabled: true,
    // Humanized skin settings
    skinParts: {
      showCape: true,
      showJacked: true,
      showLeftSleeve: true,
      showRightSleeve: true,
      showLeftPants: true,
      showRightPants: true,
      showHat: true
    }
  });

  bot.isTeleporting = false;
  let loginTimeout = null;
  let actionInterval = null;

  bot.once('spawn', () => {
    // Human-like physical delay before typing in chat
    const humanChatDelay = Math.floor(Math.random() * 3000) + 2000;
    console.log(`[${account.username}] Connected to lobby. Waiting ${humanChatDelay}ms to mimic typing...`);

    loginTimeout = setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      
      setTimeout(() => {
        bot.chat('/maghrebsmp');
        
        // Activate human-like look/movement simulation
        startHumanInteractions(bot, account.username);
      }, Math.floor(Math.random() * 2000) + 3000);
    }, humanChatDelay);
  });

  // Mimics tiny human behaviors (randomly looking around slightly, shifting, swinging arms)
  function startHumanInteractions(b, name) {
    if (actionInterval) clearInterval(actionInterval);
    
    actionInterval = setInterval(() => {
      if (b.entity && !b.isTeleporting) {
        const decision = Math.random();
        if (decision < 0.4) {
          // Look slightly to the left or right randomly
          const yaw = b.entity.yaw + (Math.random() * 0.4 - 0.2);
          const pitch = b.entity.pitch + (Math.random() * 0.2 - 0.1);
          b.look(yaw, pitch);
        } else if (decision < 0.6) {
          b.swingArm('right');
        } else if (decision < 0.7) {
          // Sneak for a brief moment
          b.setControlState('sneak', true);
          setTimeout(() => b.setControlState('sneak', false), 400);
        }
      }
    }, Math.floor(Math.random() * 15000) + 15000); // Trigger every 15-30 seconds
  }

  // TPA Stream Parsers
  bot.on('message', (jsonMsg) => {
    const cleanLine = jsonMsg.toString().toLowerCase().trim();
    if (cleanLine.includes(BOSS_NAME.toLowerCase())) {
      if (cleanLine.includes('!tpa')) bot.chat(`/tpa ${BOSS_NAME}`);
      if (cleanLine.includes('!accept')) bot.chat('/tpaccept');
    }
    if (cleanLine.includes('accepted') || cleanLine.includes('teleporting')) {
      bot.isTeleporting = true;
      setTimeout(() => { bot.isTeleporting = false; }, 8000);
    }
  });

  bot.on('end', (reason) => {
    if (loginTimeout) clearTimeout(loginTimeout);
    if (actionInterval) clearInterval(actionInterval);
    
    // Generates a massive, completely random delay before reconnecting (30s to 90s)
    const longCooldown = Math.floor(Math.random() * 60000) + 30000;
    console.log(`[${account.username}] Disconnected (${reason}). Sleeping for ${Math.round(longCooldown / 1000)}s...`);
    setTimeout(() => spawnStealthBot(account), longCooldown);
  });

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') console.error(`[${account.username}] Matrix Exception:`, err.message);
  });
}

// Staggered launch routine to prevent anti-bot connection bursts
if (accounts.length > 0) {
  accounts.forEach((account, index) => {
    // Delays each bot's login by a huge random window so they don't look like a cluster
    const staggeredDelay = index * 45000 + Math.floor(Math.random() * 20000);
    setTimeout(() => spawnStealthBot(account), staggeredDelay);
  });
                            }
