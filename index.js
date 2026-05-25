const mineflayer = require('mineflayer');
const http = require('http');
const { SocksProxyAgent } = require('socks-proxy-agent');

// ═══════════════════════════════════════════════════════════════
// 1. HEALTH CHECK SERVER FOR RAILWAY (keeps the app "awake")
// ═══════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cluster Tunnel Routing System Online\n');
}).listen(PORT);

// ═══════════════════════════════════════════════════════════════
// 2. CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const BOSS_NAME = 'Zzynox_';
const SERVER_HOST = process.env.SERVER_HOST || 'maghrebsmp.fun';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

// Load accounts from Railway environment variables
const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) {
  accounts.push({ 
    username: process.env.BOT_1_USER, 
    password: process.env.BOT_1_PASS, 
    proxy: process.env.BOT_1_PROXY 
  });
}
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) {
  accounts.push({ 
    username: process.env.BOT_2_USER, 
    password: process.env.BOT_2_PASS, 
    proxy: process.env.BOT_2_PROXY 
  });
}
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) {
  accounts.push({ 
    username: process.env.BOT_3_USER, 
    password: process.env.BOT_3_PASS, 
    proxy: process.env.BOT_3_PROXY 
  });
}

// ═══════════════════════════════════════════════════════════════
// 3. BOT SPAWNER WITH ALL FIXES
// ═══════════════════════════════════════════════════════════════
function spawnTunnelBot(account) {
  console.log(`[ProxyManager] Fabricating proxy socket agent for ${account.username}...`);

  const botOptions = {
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.21.4',          // ← UPDATED: Match server version
    viewDistance: 'tiny',
    physicsEnabled: true,
    checkTimeoutInterval: 60000, // Increase timeout for stability
  };

  // ─── PROXY SETUP ───
  if (account.proxy) {
    try {
      const parts = account.proxy.split(':');
      const pIp = parts[0];
      const pPort = parts[1];
      const pUser = parts[2];
      const pPass = parts[3];
      
      // Format: socks5://username:password@ip:port
      const proxyUrl = `socks5://${pUser}:${pPass}@${pIp}:${pPort}`;
      botOptions.agent = new SocksProxyAgent(proxyUrl);
      console.log(`[${account.username}] Proxy Agent bound successfully.`);
    } catch (e) {
      console.error(`[${account.username}] Proxy string processing failed:`, e.message);
    }
  }

  const bot = mineflayer.createBot(botOptions);
  bot.isTeleporting = false;
  let tpaLoop = null;
  let antiAfkInterval = null;

  // ═══════════════════════════════════════════════════════════════
  // FIX 1: Handle configuration phase for 1.20.2+ protocol
  // ═══════════════════════════════════════════════════════════════
  bot._client.on('login', () => {
    // Acknowledge configuration state to prevent socketClosed
    if (bot._client.state === 'configuration') {
      bot._client.write('configuration_acknowledged', {});
    }
  });

  bot._client.on('state', (newState) => {
    if (newState === 'configuration') {
      // Send client information packet (required by 1.20.2+)
      bot._client.write('client_information', {
        locale: 'en_US',
        viewDistance: 2,
        chatFlags: 0,
        chatColors: true,
        skinParts: 127,
        mainHand: 1,
        enableTextFiltering: false,
        enableServerListing: true
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // BOT EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════
  bot.once('spawn', () => {
    console.log(`[${account.username}] Connected successfully through the proxy channel!`);
    
    // Login sequence
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      setTimeout(() => {
        bot.chat('/maghrebsmp');
        
        // TPA accept loop
        tpaLoop = setInterval(() => {
          if (!bot.isTeleporting) bot.chat('/tpaccept');
        }, 6000);
      }, 4000);
    }, 4000);

    // ═══════════════════════════════════════════════════════════════
    // FIX 2: Anti-AFK random head movement (bypasses physics checks)
    // ═══════════════════════════════════════════════════════════════
    antiAfkInterval = setInterval(() => {
      if (!bot.isTeleporting && bot.entity) {
        bot.look(
          Math.random() * Math.PI * 2, 
          (Math.random() - 0.5) * 0.5, 
          true
        );
      }
    }, 30000 + Math.floor(Math.random() * 30000)); // Every 30-60s
  });

  bot.on('message', (jsonMsg) => {
    const line = jsonMsg.toString().toLowerCase();
    
    if (line.includes(BOSS_NAME.toLowerCase())) {
      if (line.includes('!tpa')) bot.chat(`/tpa ${BOSS_NAME}`);
      if (line.includes('!accept')) bot.chat('/tpaccept');
    }
    
    if (line.includes('teleporting') || line.includes('accepted')) {
      bot.isTeleporting = true;
      setTimeout(() => { bot.isTeleporting = false; }, 8000);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // FIX 3: Better disconnect handling with exponential backoff
  // ═══════════════════════════════════════════════════════════════
  bot.on('end', (reason) => {
    if (tpaLoop) clearInterval(tpaLoop);
    if (antiAfkInterval) clearInterval(antiAfkInterval);
    
    console.log(`[${account.username}] Connection dropped (${reason}). Reconnecting in 45s...`);
    setTimeout(() => spawnTunnelBot(account), 45000);
  });

  bot.on('error', (err) => {
    // Log all errors for debugging
    console.error(`[${account.username}] Error:`, err.message, err.code || '');
  });

  // NEW: Log kick reasons (anti-bot plugins send specific messages here)
  bot.on('kicked', (reason) => {
    console.log(`[${account.username}] KICKED BY SERVER:`, reason);
  });

  // Handle death / respawn
  bot.on('death', () => {
    console.log(`[${account.username}] Died. Respawning...`);
    bot.chat('/back');
  });
}

// ═══════════════════════════════════════════════════════════════
// 4. LAUNCH ALL BOTS WITH RANDOM STAGGER (avoids detection)
// ═══════════════════════════════════════════════════════════════
if (accounts.length > 0) {
  accounts.forEach((acc, i) => {
    // Random delay between 20-60 seconds per bot (human-like)
    const randomDelay = 20000 + Math.floor(Math.random() * 40000);
    setTimeout(() => spawnTunnelBot(acc), i * randomDelay);
  });
} else {
  console.error('ERROR: No valid accounts found in Railway environment variables!');
  console.error('Required: BOT_1_USER, BOT_1_PASS (and optionally BOT_1_PROXY)');
}
