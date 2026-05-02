const { ADMIN_ID } = require('../../config/constants');
const { updateTopRoles } = require('../utils/helpers');

module.exports = async function cmdLeaderboard(msg, data) {
    const sorted = Object.entries(data)
        .filter(([id, x]) => x.started && id !== ADMIN_ID)
        .sort(([, a], [, b]) => {
            const hiemA = a.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
            const hiemB = b.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
            return hiemB !== hiemA ? hiemB - hiemA : (b.coins || 0) - (a.coins || 0);
        })
        .slice(0, 10);

    if (!sorted.length) return msg.reply('📭 Hiện chưa có người chơi nào đủ điều kiện!');

    const rows = sorted.map(([id, x], i) => {
        const hiem     = x.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
        return `${rankIcon} <@${id}>\n└ ✨ Gà hiếm: **${hiem}** | 🪙 Xu: **${(x.coins || 0).toLocaleString()}**`;
    }).join('\n\n');

    await msg.reply(
        `🏆 **TOP 10 HUYỀN THOẠI CHĂN GÀ** 🏆\n━━━━━━━━━━━━━━━━━━━━\n${rows}\n━━━━━━━━━━━━━━━━━━━━\n*🔥 BXH đã ẩn Admin & Đội ngũ Tester!*`
    );

    if (msg.guild) updateTopRoles(msg.guild, data);
};
