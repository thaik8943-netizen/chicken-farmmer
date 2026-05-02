require('dotenv').config();
const http = require('http');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const { connectDB } = require('./src/database');
const messageHandler = require('./src/handlers/messageHandler');
const interactionHandler = require('./src/handlers/interactionHandler');
const memberHandler = require('./src/handlers/memberHandler');

// ── Keepalive server ──────────────────────────────────────────────
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Gà đang online!');
}).listen(process.env.PORT || 8080);

// ── Discord client ────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// ── Startup ───────────────────────────────────────────────────────
client.once('ready', async () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    await connectDB();
});

// ── Event handlers ────────────────────────────────────────────────
client.on('guildMemberAdd', (member) => memberHandler(member));
client.on('messageCreate',  (msg)    => messageHandler(msg, client));
client.on('interactionCreate', (interaction) => interactionHandler(interaction));

client.login(process.env.TOKEN);
