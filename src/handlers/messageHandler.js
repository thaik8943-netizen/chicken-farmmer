const { getUser, saveData, data } = require('../database');
const { EmbedBuilder } = require('discord.js');

// ── Import tất cả command handlers ────────────────────────────────
const cmdStart      = require('../commands/start');
const cmdAdmin      = require('../commands/admin');
const cmdUpgrade    = require('../commands/upgrade');
const cmdTrade      = require('../commands/trade');
const cmdShop       = require('../commands/shop');
const cmdUse        = require('../commands/use');
const cmdInventory  = require('../commands/inventory');
const cmdDaga       = require('../commands/daga');
const cmdSteal      = require('../commands/steal');
const cmdProfile    = require('../commands/profile');
const cmdLeaderboard= require('../commands/leaderboard');
const cmdFarm       = require('../commands/farm');
const cmdHatch      = require('../commands/hatch');
const cmdFeed       = require('../commands/feed');
const cmdSell       = require('../commands/sell');
const cmdCoop       = require('../commands/coop');
const cmdBoss       = require('../commands/boss');
const cmdHelp       = require('../commands/help');
const cmdEquip      = require('../commands/equip');

module.exports = async function messageHandler(msg, client) {
    if (msg.author.bot || !msg.content.startsWith(':')) return;

    const u   = getUser(msg.author.id);
    const now = Date.now();

    // Reset số lần cho ăn hàng ngày
    const today = new Date().setHours(0, 0, 0, 0);
    if (new Date(u.lastEatReset).setHours(0,0,0,0) !== today) {
        u.eatToday    = 0;
        u.lastEatReset = today;
    }

    // Tự động nở trứng
    await autoHatch(msg, u, now);

    // ── Route commands ────────────────────────────────────────────
    const content = msg.content;

    if (content === ':start')                                     return cmdStart(msg, u, saveData);
    if (content.startsWith(':give'))                              return cmdAdmin(msg, u, data, saveData);
    if ([':upga',':upthoc',':upaptrung'].includes(content))       return cmdUpgrade(msg, u, saveData);
    if (content.startsWith(':trade'))                             return cmdTrade(msg, u, data, saveData);
    if (content === ':trieuhoishopthanthoai')                     return cmdShop.spawnShop(msg, client);
    if (content.startsWith(':use'))                               return cmdUse(msg, u, saveData);
    if (content === ':khodo')                                     return cmdInventory(msg, u);
    if (content.startsWith(':daga'))                              return cmdDaga(msg, u, data, saveData);
    if (content.startsWith(':tromga'))                            return cmdSteal(msg, u, data, saveData, now);
    if (content === ':thongtin')                                  return cmdProfile(msg, u);
    if (content === ':bxh')                                       return cmdLeaderboard(msg, data);
    if (content === ':nangcap')                                   return cmdFarm.nangCap(msg, u);
    if (content === ':shop')                                      return cmdFarm.shop(msg);
    if (content.startsWith(':buy'))                               return cmdFarm.buy(msg, u, saveData);
    if (content === ':ruong')                                     return cmdFarm.ruong(msg, u);
    if (content === ':tronglua')                                  return cmdFarm.trongLua(msg, u, saveData, now);
    if (content === ':thuhoach')                                  return cmdFarm.thuHoach(msg, u, saveData, now);
    if (content.startsWith(':aptrung'))                           return cmdHatch.apTrung(msg, u, saveData, now);
    if (content === ':thoigianap')                                return cmdHatch.thoiGianAp(msg, u, now);
    if (content === ':skipaptrung')                               return cmdHatch.skipApTrung(msg, u, saveData, now);
    if (content.startsWith(':chogaan'))                           return cmdFeed(msg, u, saveData);
    if (content.startsWith(':sellga'))                            return cmdSell.sellGa(msg, u, saveData);
    if (content.startsWith(':selltrung'))                         return cmdSell.sellTrung(msg, u, saveData);
    if (content === ':daily')                                     return cmdSell.daily(msg, u, saveData, now);
    if (content.startsWith(':lockga') || content.startsWith(':unlockga')) return cmdSell.lockGa(msg, u, saveData);
    if (content === ':chuonga')                                   return cmdCoop(msg, u);
    if (content.startsWith(':spawnboss'))                         return cmdBoss.spawnBoss(msg, client, data, saveData);
    if (content.startsWith(':equip'))                             return cmdEquip(msg, u, saveData);
    if (content === ':help')                                      return cmdHelp(msg, u, client);
};

// ── Auto-hatch logic ──────────────────────────────────────────────
const { GA_LIST } = require('../../config/constants');

async function autoHatch(msg, u, now) {
    if (!u.dangAp || u.dangAp.length === 0) return;

    const hatched = [];
    u.dangAp = u.dangAp.filter(e => {
        if (now < e.finishAt) return true;

        for (let i = 0; i < e.amount; i++) {
            const r = Math.random() * 100;
            let selectedRarity = 'Common ⚪';

            if (e.type === 'vang') {
                if (r < 0.01)      selectedRarity = 'Legendary 🟡';
                else if (r < 1.01) selectedRarity = 'Epic 🟣';
                else if (r < 16)   selectedRarity = 'Rare 🔵';
            } else if (e.type === 'bac') {
                if (r < 0.001)    selectedRarity = 'Legendary 🟡';
                else if (r < 0.1) selectedRarity = 'Epic 🟣';
                else if (r < 8)   selectedRarity = 'Rare 🔵';
            } else {
                if (r < 1) selectedRarity = 'Rare 🔵';
            }

            const pureRarity = selectedRarity.split(' ')[0];
            let pool = GA_LIST.filter(g => g.rarity.includes(pureRarity));
            if (!pool.length) pool = GA_LIST.filter(g => g.rarity.includes('Common'));
            const g = pool[Math.floor(Math.random() * pool.length)];

            const STATS = {
                'Common ⚪':    { hp: [50, 100],       price: [10, 30] },
                'Rare 🔵':      { hp: [200, 400],      price: [200, 500] },
                'Epic 🟣':      { hp: [1000, 2000],    price: [5000, 15000] },
                'Legendary 🟡': { hp: [8000, 15000],   price: [100000, 300000] },
            };
            const s = STATS[selectedRarity];
            const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
            hatched.push({
                ...g,
                id:     Date.now() + Math.random(),
                locked: false,
                rarity: selectedRarity,
                hp:     rand(s.hp[0], s.hp[1]),
                price:  rand(s.price[0], s.price[1]),
            });
        }
        return false;
    });

    if (hatched.length === 0) return;

    u.gaCon.push(...hatched);
    await saveData(msg.author.id);

    const hasLegendary = hatched.some(g => g.rarity.includes('Legendary'));
    const hasEpic      = hatched.some(g => g.rarity.includes('Epic'));
    const desc = hatched.map(g =>
        `**${g.name}** \`${g.rarity}\`\n└ ❤️ HP: \`${g.hp}\` | 💰 Giá: \`${g.price.toLocaleString()}\``
    ).join('\n\n');

    const embed = new EmbedBuilder().setTimestamp();

    if (hasLegendary) {
        embed.setTitle('✨ NGUYÊN TỬ LỰC: HUYỀN THOẠI GIÁNG TRẦN! ✨')
             .setColor('#f1c40f')
             .setThumbnail('https://i.imgur.com/8E9p6fS.gif')
             .setDescription(`🎊 Chúc mừng bạn đã phá vỡ mọi giới hạn!\n\n${desc}`);
        return msg.reply({ content: `🌟 **THÔNG BÁO CHẤN ĐỘNG!** <@${msg.author.id}>`, embeds: [embed] });
    }
    if (hasEpic) {
        embed.setTitle('🟣 SIÊU CẤP XUẤT HIỆN!').setColor('#9b59b6').setDescription(desc);
        return msg.reply({ embeds: [embed] });
    }
    embed.setTitle('🐣 KẾT QUẢ ẤP TRỨNG').setColor('#2ecc71').setDescription(desc);
    msg.reply({ embeds: [embed] });
}
