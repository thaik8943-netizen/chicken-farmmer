const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ADMIN_ID, BOSS_CHANNELS } = require('../../config/constants');

let worldBoss = null;

// ── :spawnboss ───────────────────────────────────────────────────
async function spawnBoss(msg, client, data, saveData) {
    if (msg.author.id !== ADMIN_ID)
        return msg.reply('❌ **Chỉ có Đại Sư Kê mới có quyền mở đấu trường!**');

    if (worldBoss) return msg.reply('⚠️ Đấu trường đang có biến! Hãy chờ trận đấu kết thúc.');

    const args   = msg.content.split(' ');
    const hpInit = parseInt(args[1]) || Math.floor(Math.random() * 15001) + 20000;

    worldBoss = {
        name:  '🔥 ĐẠI THẦN GÀ PHẪN NỘ 🔥',
        hp:    hpInit, maxHp: hpInit,
        contributors: {},
        endTime:  Date.now() + 300000,
        isActive: true,
        messages: [],
    };

    const progressBar = (cur, max) => {
        const s = 15, p = Math.max(0, Math.min(s, Math.round((cur / max) * s)));
        return '🛑'.repeat(p) + '🌑'.repeat(s - p);
    };

    const createBossEmbed = () =>
        new EmbedBuilder()
            .setTitle(`🏟️ ĐẤU TRƯỜNG SINH TỬ: ${worldBoss.name} 🏟️`)
            .setAuthor({ name: 'Hệ Thống Chiến Trường Toàn Cầu', iconURL: client.user.displayAvatarURL() })
            .setDescription(
                `> *Vết nứt không gian đã mở!*\n\n` +
                `⚔️ **Thực thể:** \`${worldBoss.name}\`\n` +
                `🩸 **Sinh lực:** \`${Math.max(0, worldBoss.hp).toLocaleString()} / ${worldBoss.maxHp.toLocaleString()}\` HP\n` +
                `**[${progressBar(worldBoss.hp, worldBoss.maxHp)}]**\n\n` +
                `🛡️ **Trạng thái:** ${worldBoss.hp > 0 ? '💢 Đang phẫn nộ!' : '💀 Đã bị hạ gục'}`
            )
            .addFields({ name: '⏳ Thời gian', value: `<t:${Math.floor(worldBoss.endTime / 1000)}:R>`, inline: true })
            .setColor('#FF4500')
            .setImage('https://i.imgur.com/vH8lBq9.gif')
            .setFooter({ text: 'Nhấn Tung Đòn để tham chiến | Thưởng x2.5 sát thương' })
            .setTimestamp();

    const bossRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('boss_attack').setLabel('⚔️ TUNG ĐÒN') .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('boss_status').setLabel('📊 XẾP HẠNG').setStyle(ButtonStyle.Secondary),
    );

    // Gửi đến các kênh chỉ định
    for (const channelId of BOSS_CHANNELS) {
        try {
            const ch = await client.channels.fetch(channelId);
            if (ch) {
                const m = await ch.send({
                    content: '🔔 **LOA LOA LOA! ĐẠI CHIẾN GÀ RỪNG ĐÃ KHAI MỞ!**',
                    embeds: [createBossEmbed()], components: [bossRow],
                });
                worldBoss.messages.push(m);
            }
            await new Promise(r => setTimeout(r, 500));
        } catch (e) { console.log(`Lỗi gửi boss tại kênh ${channelId}: ${e.message}`); }
    }

    // Hết thời gian
    setTimeout(async () => {
        if (!worldBoss?.isActive) return;
        worldBoss.isActive = false;

        const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 3);
        let summary  = '💀 **BOSS ĐÃ CHẠY THOÁT!**\n\n**🏆 TOP 3:**\n';
        if (sorted.length)
            sorted.forEach(([id, dmg], i) => { summary += `${['🥇','🥈','🥉'][i]} <@${id}>: \`${dmg.toLocaleString()}\`\n`; });
        else summary += '_Chiến trường lạnh lẽo, không bóng người tham chiến._';

        const failEmbed = new EmbedBuilder()
            .setTitle('🌑 ĐẤU TRƯỜNG KHÉP LẠI')
            .setDescription(summary).setColor('#2F3136');

        for (const m of worldBoss.messages) { try { await m.edit({ embeds: [failEmbed], components: [] }); } catch {} }
        worldBoss = null;
    }, 300000);
}

// ── Boss HP display ───────────────────────────────────────────────
async function updateGlobalBossDisplay() {
    if (!worldBoss?.messages.length) return;
    const embed = new EmbedBuilder()
        .setTitle(`🏟️ ${worldBoss.name}`)
        .setDescription(
            `🩸 **HP:** \`${Math.max(0, worldBoss.hp).toLocaleString()} / ${worldBoss.maxHp.toLocaleString()}\`\n` +
            `[${'🛑'.repeat(Math.max(0, Math.min(15, Math.round((worldBoss.hp / worldBoss.maxHp) * 15))))}` +
            `${'🌑'.repeat(15 - Math.max(0, Math.min(15, Math.round((worldBoss.hp / worldBoss.maxHp) * 15))))}]`
        )
        .setColor('#FF4500');
    await Promise.allSettled(worldBoss.messages.map(m => m.edit({ embeds: [embed] }).catch(() => null)));
}

// ── Boss defeated ─────────────────────────────────────────────────
async function handleBossDefeated(data, saveData) {
    if (!worldBoss?.isActive) return;
    worldBoss.isActive = false;

    const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a);
    const top3   = sorted.slice(0, 3);

    let rewardList = '🎊 **ĐẠI THẦN GÀ ĐÃ GỤC NGÃ!** 🎊\n\n**👑 TAM ĐẠI CHIẾN BINH:**\n';
    top3.forEach(([id, dmg], i) => { rewardList += `${['🥇','🥈','🥉'][i]} <@${id}>: \`${dmg.toLocaleString()}\`\n`; });
    rewardList += '\n**💰 PHẦN THƯỞNG:**\n';

    for (const [id, dmg] of sorted) {
        const reward = Math.floor(dmg * 2.5);
        if (data[id]) { data[id].coins = (data[id].coins || 0) + reward; saveData(id); }
        rewardList += `• <@${id}>: +${reward.toLocaleString()} Xu\n`;
    }

    const winEmbed = new EmbedBuilder()
        .setTitle('🏆 CHIẾN THẮNG RỰC RỠ').setDescription(rewardList).setColor('#F1C40F');

    for (const m of worldBoss.messages) { try { await m.edit({ embeds: [winEmbed], components: [] }); } catch {} }
    worldBoss = null;
}

module.exports = { spawnBoss, updateGlobalBossDisplay, handleBossDefeated, get worldBoss() { return worldBoss; } };
