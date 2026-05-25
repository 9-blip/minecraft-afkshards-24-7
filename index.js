const mineflayer = require('mineflayer');
const http = require('http');
const { SocksProxyAgent } = require('socks-proxy-agent');

// 1. HEALTH CHECK SERVER FOR RAILWAY
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Cluster Tunnel Routing System Online\n');
}).listen(PORT);

const BOSS_NAME = 'Zzynox_'; 
const SERVER_HOST = process.env.SERVER_HOST || 'maghrebsmp.fun';
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25565', 10);

const accounts = [];
if (process.env.BOT_1_USER && process.env.BOT_1_PASS) accounts.push({ username: process.env.BOT_1_USER, password: process.env.BOT_1_PASS, proxy: process.env.BOT_1_PROXY });
if (process.env.BOT_2_USER && process.env.BOT_2_PASS) accounts.push({ username: process.env.BOT_2_USER, password: process.env.BOT_2_PASS, proxy: process.env.BOT_2_PROXY });
if (process.env.BOT_3_USER && process.env.BOT_3_PASS) accounts.push({ username: process.env.BOT_3_USER, password: process.env.BOT_3_PASS, proxy: process.env.BOT_3_PROXY });

function spawnTunnelBot(account) {
  console.log(`[ProxyManager] Fabricating proxy socket agent for ${account.username}...`);

  const botOptions = {
    host: SERVER_HOST,
    port: SERVER_PORT,
    username: account.username,
    auth: 'offline',
    version: '1.20.4',
    viewDistance: 'tiny',
    physicsEnabled: true
  };

  // Convert raw Webshare strings into proxy agent strings
  if (account.proxy) {
    try {
      const parts = account.proxy.split(':');
      const pIp = parts[0];
      const pPort = parts[1];
      const pUser = parts[2];
      const pPass = parts[3];
      
      // Formats into socks5://username:password@ip:port
      const proxyUrl = `socks5://${pUser}:${pPass}@${pIp}:${pPort}`;
      botOptions.agent = new SocksProxyAgent(proxyUrl);
      console.log(`[${account.username}] Proxy Agent bound successfully.`);
    } catch (e) {
      console.error(`[${account.username}] Proxy string processing failed.`);
    }
  }

  const bot = mineflayer.createBot(botOptions);
  bot.isTeleporting = false;
  let tpaLoop = null;

  bot.once('spawn', () => {
    console.log(`[${account.username}] Connected successfully through the proxy channel!`);
    
    setTimeout(() => {
      bot.chat(`/login ${account.password}`);
      setTimeout(() => {
        bot.chat('/maghrebsmp');
        
        tpaLoop = setInterval(() => {
          if (!bot.isTeleporting) bot.chat('/tpaccept');
        }, 6000);
      }, 4000);
    }, 4000);
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

  bot.on('end', (reason) => {
    if (tpaLoop) clearInterval(tpaLoop);
    console.log(`[${account.username}] Connection dropped (${reason}). Reconnecting in 45s...`);
    setTimeout(() => spawnTunnelBot(account), 45000);
  });

  bot.on('error', (err) => {
    if (err.code !== 'ECONNRESET') console.error(`[${account.username}] Socket Error:`, err.message);
  });
}

if (accounts.length > 0) {
  accounts.forEach((acc, i) => {
    setTimeout(() => spawnTunnelBot(acc), i * 20000);
  });
}
