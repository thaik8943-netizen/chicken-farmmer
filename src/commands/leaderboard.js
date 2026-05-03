const { ADMIN_ID } = require('../../config/constants');
const { updateTopRoles } = require('../utils/helpers');

module.exports = async function cmdLeaderboard(msg, data) {
    const sorted = Object.entries(data)
        .filter(([id, x]) => x.started && id !== ADMIN_ID)
        .sort(([, a], [, b]) => {
            // Mục 1: So sánh số gà hiếm (Legendary + Epic)
            const hiemA = a.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
            const hiemB = b.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
            if (hiemB !== hiemA) return hiemB - hiemA;

            // Mục 2: Nếu bằng gà hiếm, so sánh số Thóc
            const thocA = a.thoc || 0;
            const thocB = b.thoc || 0;
            if (thocB !== thocA) return thocB - thocA;

            // Mục 3: Nếu vẫn bằng nhau, so sánh số Xu
            return (b.coins || 0) - (a.coins || 0);
        })
        .slice(0, 10);

    if (!sorted.length) return msg.reply('📭 Hiện chưa có người chơi nào đủ điều kiện!');

    const rows = sorted.map(([id, x], i) => {
        const hiem = x.gaCon.filter(g => g.rarity.includes('Legendary') || g.rarity.includes('Epic')).length;
        const thoc = x.thoc || 0;
        const xu   = x.coins || 0;
        
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
        
        // Hiển thị 3 thông số trên cùng 1 dòng cho gọn hoặc chia dòng tùy Hòa
        return `${rankIcon} <@${id}>\n└ ✨ Gà: **${hiem}** | 🌾 Thóc: **${thoc.toLocaleString()}** | 🪙 Xu: **${xu.toLocaleString()}**`;
    }).join('\n\n');

    await msg.reply(
        `🏆 **TOP 10 HUYỀN THOẠI CHĂN GÀ** 🏆\n━━━━━━━━━━━━━━━━━━━━\n${rows}\n━━━━━━━━━━━━━━━━━━━━\n*🔥 Ưu tiên: Gà Hiếm > Thóc > Xu!*`
    );

    if (msg.guild) updateTopRoles(msg.guild, data);
};
