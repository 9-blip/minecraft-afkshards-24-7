const mineflayer = require('mineflayer');
const http = require('http');
const socks = require('socks').SocksClient; // Connects to the socks library

// 1. DUMMY WEB SERVER FOR RAILWAY HEALTH CHECKS
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Minecraft Proxy Matrix Cluster is Online!\n');
}).listen(PORT, () => console.log(`[System] Dummy server online on port ${PORT}`));

// 2. TARGET CONFIGURATION
const BOSS_NAME = 'Zzynox_'; 
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS, proxy: process.env.BOT_1_PROXY });
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS, proxy: process.env.BOT_2_PROXY });
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS, proxy: process.env.BOT_3_PROXY });
if (process.env.BOT_4_USER && process.env.BOT_4_PASS) accounts.push({ username: process.env.BOT_4_USER, password: process.env.BOT_4_PASS, proxy: process.env.BOT_4_PROXY });

// 3. CORE MATRIX FABRICATOR
function spawnAFKBot(account) {
  console.log(`[System] Routing connection matrix for: ${account.username}...`);

  const botOptions = {
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.20.4',
    viewDistance: 'tiny',
    checkTimeoutInterval: 120000,
    closeTimeout: 120000,
    physicsEnabled: true
  };

  // IF A PROXY VARIABLE EXISTS, INJECT NETWORK TUNNEL HOOKS
  if (account.proxy) {
    try {
      const proxyParts = account.proxy.split(':');
      const proxyHost = proxyParts[0];
      const proxyPort = parseInt(proxyParts[1], 10);

      botOptions.connect = (client) => {
        socks.createConnection({
          proxy: { host: proxyHost, port: proxyPort, type: 5 }, // type 5 = SOCKS5
          command: 'connect',
          destination: { host: SERVER_HOST, port: SERVER_PORT }
        }, (err, info) => {
          if (err) {
            console.error(`[${account.username}] Proxy Gateway Error: ${err.message}`);
            client.emit('error', err);
            return;
          }
          botOptions.socket = info.socket;
          client.setSocket(info.socket);
        });
      };
      console.log(`[${account.username}] Security Proxy Linked: ${proxyHost}:${proxyPort}`);
    } catch (proxyError) {
      console.error(`[${account.username}] Failed parsing proxy string structure.`);
    }
  }

  const bot = mineflayer.createBot(botOptions);
  bot.isTeleporting = false; 
  let autoAcceptInterval = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Stream authenticated via tunnel.`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      
      setTimeout(() => {
        bot.chat('/maghrebsmp');

        setTimeout(() => {
          if (autoAcceptInterval) clearInterval(autoAcceptInterval);
          autoAcceptInterval = setInterval(() => {
            if (!bot.isTeleporting) bot.chat('/tpaccept');
          }, 6000);
          
        }, 5000);
      }, 5000);
    }, 4000);
  });

  // Anti-AFK Swing Action
  const afkInterval = setInterval(() => {
    if (bot.entity && !bot.isTeleporting) bot.swingArm('right');
  }, 30000);

  bot.on('message', (jsonMsg) => {
    const cleanLine = jsonMsg.toString().toLowerCase().trim();
    const targetLower = BOSS_NAME.toLowerCase();

    if (cleanLine.includes(targetLower)) {
      if (cleanLine.includes('!tpa') && !bot.isTeleporting) bot.chat(`/tpa ${BOSS_NAME}`);
      if (cleanLine.includes('!accept')) bot.chat('/tpaccept');
    }

    if ((cleanLine.includes('accepted') || cleanLine.includes('teleporting') || cleanLine.includes('countdown')) && !bot.isTeleporting) {
      bot.isTeleporting = true; 
      setTimeout(() => { bot.isTeleporting = false; }, 9000);
    }
  });

  // Cool-down Reconnect Routine
  bot.on('end', (reason) => {
    if (autoAcceptInterval) clearInterval(autoAcceptInterval);
    clearInterval(afkInterval);

    const randomCooldown = Math.floor(Math.random() * (60000 - 30000 + 1)) + 30000;
    console.log(`[${account.username}] Connection dropped (${reason}). Re-routing stream in ${Math.round(randomCooldown / 1000)}s...`);
    setTimeout(() => spawnAFKBot(account), randomCooldown);
  });

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') console.error(`[${account.username}] Error:`, err.message);
  });
}

// Global Initialization
if (accounts.length === 0) {
  process.exit(1);
} else {
  console.log(`[System] Initializing stealth cluster sequence...`);
  accounts.forEach((account, index) => {
    setTimeout(() => { spawnAFKBot(account); }, index * 30000);
  });
         }
