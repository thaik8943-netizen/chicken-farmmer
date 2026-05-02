const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ADMIN_ID, BOSS_CHANNELS } = require('../../config/constants');

let worldBoss = null;
let updateInterval = null;

// ── HÀM TẠO EMBED DÙNG CHUNG ──────────────────────────────────────
function createBossEmbed(client) {
    if (!worldBoss) return null;

    const s = 15;
    const p = Math.max(0, Math.min(s, Math.round((worldBoss.hp / worldBoss.maxHp) * s)));
    const progressBar = '🛑'.repeat(p) + '🌑'.repeat(s - p);

    return new EmbedBuilder()
        .setTitle(`🏟️ ĐẤU TRƯỜNG SINH TỬ: ${worldBoss.name} 🏟️`)
        .setAuthor({ name: 'Hệ Thống Chiến Trường Toàn Cầu', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `> *Vết nứt không gian đã mở!*\n\n` +
            `⚔️ **Thực thể:** \`${worldBoss.name}\`\n` +
            `🩸 **Sinh lực:** \`${Math.max(0, worldBoss.hp).toLocaleString()} / ${worldBoss.maxHp.toLocaleString()}\` HP\n` +
            `**[${progressBar}]**\n\n` +
            `🛡️ **Trạng thái:** ${worldBoss.hp > 0 ? '💢 Đang phẫn nộ!' : '💀 Đã bị hạ gục'}`
        )
        .addFields({ name: '⏳ Kết thúc', value: `<t:${Math.floor(worldBoss.endTime / 1000)}:R>`, inline: true })
        .setColor(worldBoss.hp < worldBoss.maxHp * 0.2 ? '#FF0000' : '#FF4500')
        .setImage('https://cdn.discordapp.com/attachments/1499736042100621395/1500150161014264062/IMG_8178.jpg?ex=69f76335&is=69f611b5&hm=499ff278df6cd8521e6beff80a1b1a9a4f1e80f7b7d832a86b315e9e8867dcd9&')
        .setFooter({ text: 'Nhấn Tung Đòn để tham chiến | Thưởng x2.5 sát thương' })
        .setTimestamp();
}

// ── :spawnboss ───────────────────────────────────────────────────
async function spawnBoss(msg, client, data, saveData) {
    if (msg.author.id !== ADMIN_ID)
        return msg.reply('❌ **Chỉ có Đại Sư Kê mới có quyền mở đấu trường!**');

    if (worldBoss) return msg.reply('⚠️ Đấu trường đang có biến! Hãy chờ trận đấu kết thúc.');

    const args = msg.content.split(' ');
    const hpInit = parseInt(args[1]) || Math.floor(Math.random() * 15001) + 20000;

    worldBoss = {
        name: '🔥 ĐẠI THẦN GÀ PHẪN NỘ 🔥',
        hp: hpInit, 
        maxHp: hpInit,
        contributors: {},
        endTime: Date.now() + 300000,
        isActive: true,
        messages: [],
    };

    const bossRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('boss_attack').setLabel('⚔️ TUNG ĐÒN').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('boss_status').setLabel('📊 XẾP HẠNG').setStyle(ButtonStyle.Secondary),
    );

    // Gửi tin nhắn đến các kênh chỉ định
    for (const channelId of BOSS_CHANNELS) {
        try {
            const ch = await client.channels.fetch(channelId);
            if (ch) {
                const m = await ch.send({
                    content: '🔔 **LOA LOA LOA! ĐẠI CHIẾN GÀ RỪNG ĐÃ KHAI MỞ!**',
                    embeds: [createBossEmbed(client)], 
                    components: [bossRow],
                });
                worldBoss.messages.push(m);
            }
        } catch (e) { console.log(`Lỗi gửi boss tại kênh ${channelId}: ${e.message}`); }
    }

    // --- TỰ ĐỘNG UPDATE MỖI 1.5 GIÂY ---
    updateInterval = setInterval(async () => {
        if (!worldBoss || !worldBoss.isActive) {
            if (updateInterval) clearInterval(updateInterval);
            return;
        }

        const embed = createBossEmbed(client);
        await Promise.allSettled(worldBoss.messages.map(m => 
            m.edit({ embeds: [embed] }).catch(() => null)
        ));
    }, 1500);

    // Hết thời gian 5 phút
    setTimeout(async () => {
        if (!worldBoss?.isActive) return;
        
        if (updateInterval) clearInterval(updateInterval);
        worldBoss.isActive = false;

        const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 3);
        let summary = '💀 **BOSS ĐÃ CHẠY THOÁT!**\n\n**🏆 TOP 3:**\n';
        
        if (sorted.length)
            sorted.forEach(([id, dmg], i) => { summary += `${['🥇','🥈','🥉'][i]} <@${id}>: \`${dmg.toLocaleString()}\`\n`; });
        else summary += '_Chiến trường lạnh lẽo, không bóng người tham chiến._';

        const failEmbed = new EmbedBuilder()
            .setTitle('🌑 ĐẤU TRƯỜNG KHÉP LẠI')
            .setDescription(summary).setColor('#2F3136');

        for (const m of worldBoss.messages) { 
            try { await m.edit({ embeds: [failEmbed], components: [] }); } catch {} 
        }
        worldBoss = null;
    }, 300000);
}

// ── XỬ LÝ KHI BOSS CHẾT ──────────────────────────────────────────
async function handleBossDefeated(data, saveData) {
    if (!worldBoss?.isActive) return;
    
    if (updateInterval) clearInterval(updateInterval);
    worldBoss.isActive = false;

    const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a);
    const top3 = sorted.slice(0, 3);

    let rewardList = '🎊 **ĐẠI THẦN GÀ ĐÃ GỤC NGÃ!** 🎊\n\n**👑 TAM ĐẠI CHIẾN BINH:**\n';
    top3.forEach(([id, dmg], i) => { rewardList += `${['🥇','🥈','🥉'][i]} <@${id}>: \`${dmg.toLocaleString()}\`\n`; });
    
    rewardList += '\n**💰 PHẦN THƯỞNG:**\n';
    for (const [id, dmg] of sorted) {
        const reward = Math.floor(dmg * 2.5);
        if (data[id]) { 
            data[id].coins = (data[id].coins || 0) + reward; 
            saveData(id); 
        }
    }
    rewardList += `*Tất cả chiến binh đã được hệ thống tự động cộng thưởng x2.5 sát thương.*`;

    const winEmbed = new EmbedBuilder()
        .setTitle('🏆 CHIẾN THẮNG RỰC RỠ')
        .setDescription(rewardList)
        .setColor('#F1C40F')
        .setImage('https://cdn.discordapp.com/attachments/1499736042100621395/1500166915291877426/IMG_8183.jpg?ex=69f772d0&is=69f62150&hm=d0cb4dce7308c2ad455e9a0219226edd6c56224362a84004550173f2ceece036&');

    for (const m of worldBoss.messages) { 
        try { await m.edit({ embeds: [winEmbed], components: [] }); } catch {} 
    }
    worldBoss = null;
}

module.exports = { 
    spawnBoss, 
    handleBossDefeated, 
    get worldBoss() { return worldBoss; } 
};
