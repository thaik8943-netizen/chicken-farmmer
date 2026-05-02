const { EmbedBuilder } = require('discord.js');
const { formatTime } = require('../utils/helpers');

const TIME_MAP = { thuong: 900000, bac: 3600000, vang: 7200000 };

// ── :aptrung ─────────────────────────────────────────────────────
async function apTrung(msg, u, saveData, now) {
    const args = msg.content.split(' ');
    const t    = args[1];
    const a    = parseInt(args[2]);

    if (!TIME_MAP[t] || isNaN(a) || a <= 0)
        return msg.reply('❌ Cú pháp: `:aptrung <thuong/bac/vang> <số lượng>`');

    if (u.dangAp?.length) {
        const waiting = u.dangAp[0].finishAt - now;
        return msg.reply(`🚫 **Máy ấp đang bận!** Chờ lượt cũ nở hết.\n⏳ Còn: **${formatTime(waiting)}**`);
    }

    if (a > 20) return msg.reply('❌ Tối đa **20 quả** mỗi lần!');
    if ((u.trung[t] || 0) < a) return msg.reply(`❌ Không đủ trứng **${t}** (Hiện có: ${u.trung[t] || 0}).`);

    u.trung[t] -= a;
    u.dangAp.push({ type: t, amount: a, finishAt: now + TIME_MAP[t] });

    await saveData(msg.author.id);
    return msg.reply(
        `🥚 Đã bỏ **${a}** quả trứng **${t}** vào máy.\n` +
        `⏱️ Chờ: **${formatTime(TIME_MAP[t])}**.\n` +
        `⚠️ Bạn không thể ấp thêm cho đến khi đợt này nở!`
    );
}

// ── :thoigianap ──────────────────────────────────────────────────
function thoiGianAp(msg, u, now) {
    if (!u.dangAp?.length) return msg.reply('🚫 Máy ấp đang trống!');

    const list = u.dangAp.map((e, i) => {
        const emoji = e.type === 'vang' ? '🥇' : e.type === 'bac' ? '🥈' : '⚪';
        return `${i + 1}. ${emoji} **${e.amount}** trứng **${e.type}**: \`${formatTime(e.finishAt - now)}\``;
    }).join('\n');

    return msg.reply(`🐣 **TIẾN ĐỘ ẤP TRỨNG**\n━━━━━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━━━━━`);
}

// ── :skipaptrung ─────────────────────────────────────────────────
async function skipApTrung(msg, u, saveData, now) {
    const CD_SKIP    = 2 * 60 * 60 * 1000;
    const SKIP_AMT   = 45 * 60 * 1000;
    const SKIP_COST  = 2000;

    if (u.lastSkip && now - u.lastSkip < CD_SKIP)
        return msg.reply(`⏳ Lệnh tăng tốc đang hồi! Vui lòng chờ **${formatTime(CD_SKIP - (now - u.lastSkip))}**.`);

    if (!u.dangAp?.length) return msg.reply('❌ Máy ấp đang trống!');
    if (u.coins < SKIP_COST) return msg.reply(`❌ Bạn cần **${SKIP_COST.toLocaleString()} Xu** để tăng tốc!`);

    u.coins   -= SKIP_COST;
    u.lastSkip = now;
    u.dangAp.forEach(t => { t.finishAt -= SKIP_AMT; });

    await saveData(msg.author.id);

    const list = u.dangAp.map((t, i) => {
        const left   = t.finishAt - now;
        const status = left <= 0 ? '✅ **SẴN SÀNG NỞ!**' : `⏳ Còn: \`${formatTime(left)}\``;
        return `**${i + 1}. Trứng ${t.type.toUpperCase()}:** ${status}`;
    }).join('\n');

    const mainEmbed = new EmbedBuilder()
        .setTitle('⏩ TĂNG TỐC ẤP TRỨNG')
        .setDescription(`💰 Chi: **${SKIP_COST.toLocaleString()} Xu**\n⏱️ Đã giảm **45 phút**.\n\n**Máy ấp:**\n${list}`)
        .setColor('#3498DB')
        .setTimestamp();

    await msg.reply({ embeds: [mainEmbed] });

    const hatched = u.dangAp.filter(t => now >= t.finishAt);
    if (hatched.length) {
        const hatchEmbed = new EmbedBuilder()
            .setTitle('🐣 TIN VUI: TRỨNG ĐÃ NỞ!')
            .setDescription(`✨ Phép màu xuất hiện! **${hatched.length}** quả trứng nứt vỏ ngay lập tức!\n\n👉 Gõ \`:chuonga\` để đón thành viên mới!`)
            .setColor('#FFD700')
            .setThumbnail('https://i.imgur.com/8E9p6fS.gif');
        msg.channel.send({ embeds: [hatchEmbed] });
    }
}

module.exports = { apTrung, thoiGianAp, skipApTrung };
