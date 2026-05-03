const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { ADMIN_ID, BOSS_CHANNELS } = require('../../config/constants');

let worldBoss = null;
let updateInterval = null;

// ── HÀM TẠO EMBED DÙNG CHUNG (GIAO DIỆN CHIẾN TRƯỜNG) ────────────────
function createBossEmbed(client) {
    if (!worldBoss) return null;

    const s = 15;
    const p = Math.max(0, Math.min(s, Math.round((worldBoss.hp / worldBoss.maxHp) * s)));
    // Thanh máu thiết kế kiểu rực lửa
    const progressBar = '🔥'.repeat(p) + '🌑'.repeat(s - p);
    const hpPercent = ((worldBoss.hp / worldBoss.maxHp) * 100).toFixed(1);

    return new EmbedBuilder()
        .setTitle(`⚔️ HUYỀN THOẠI ĐẤU TRƯỜNG: ${worldBoss.name} ⚔️`)
        .setAuthor({ name: 'HỆ THỐNG CHIẾN TRƯỜNG KHỐC LIỆT', iconURL: client.user.displayAvatarURL() })
        .setDescription(
            `> *Bầu trời nhuộm đỏ, thực thể cổ xưa đã thức tỉnh qua vết nứt không gian!*\n\n` +
            `**【 THÔNG TIN THỰC THỂ 】**\n` +
            `👤 **Danh tính:** \`${worldBoss.name}\`\n` +
            `🩸 **Sinh lực:** \`${worldBoss.hp.toLocaleString()}\` / \`${worldBoss.maxHp.toLocaleString()}\` **(${hpPercent}%)**\n` +
            `**[${progressBar}]**\n\n` +
            `🛡️ **Trạng thái:** ${worldBoss.hp > worldBoss.maxHp * 0.5 ? '💢 Đang phẫn nộ!' : '🩸 Đang trọng thương!'}`
        )
        .addFields(
            { name: '👥 Tham chiến', value: `\`${Object.keys(worldBoss.contributors).length}\` chiến binh`, inline: true },
            { name: '⏳ Biến mất', value: `<t:${Math.floor(worldBoss.endTime / 1000)}:R>`, inline: true }
        )
        .setColor(worldBoss.hp < worldBoss.maxHp * 0.25 ? '#8B0000' : '#FF4500')
        .setImage('https://cdn.discordapp.com/attachments/1499736042100621395/1500150161014264062/IMG_8178.jpg')
        .setFooter({ text: 'Nhấn [TUNG ĐÒN] - Sát thương càng cao, vàng thưởng càng lớn!' })
        .setTimestamp();
}

// ── :spawnboss (TRIỆU HỒI THỰC THỂ) ──────────────────────────────────
async function spawnBoss(msg, client, data, saveData) {
    if (msg.author.id !== ADMIN_ID)
        return msg.reply('❌ **Chỉ có Đại Sư Kê mới có quyền mở vết nứt không gian!**');

    if (worldBoss) return msg.reply('⚠️ Đấu trường đang có thực thể chiếm giữ! Hãy chờ trận đấu kết thúc.');

    const args = msg.content.split(' ');
    const hpInit = parseInt(args[1]) || Math.floor(Math.random() * 20001) + 30000;

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

    for (const channelId of BOSS_CHANNELS) {
        try {
            const ch = await client.channels.fetch(channelId);
            if (ch) {
                const m = await ch.send({
                    content: '📢 **CẢNH BÁO NGUY HIỂM: THỰC THỂ CỔ XƯA XUẤT HIỆN!** @everyone',
                    embeds: [createBossEmbed(client)], 
                    components: [bossRow],
                });
                worldBoss.messages.push(m);
            }
        } catch (e) { console.log(`Lỗi tại kênh ${channelId}: ${e.message}`); }
    }

    updateInterval = setInterval(async () => {
        if (!worldBoss || !worldBoss.isActive) {
            if (updateInterval) clearInterval(updateInterval);
            return;
        }
        const embed = createBossEmbed(client);
        await Promise.allSettled(worldBoss.messages.map(m => m.edit({ embeds: [embed] }).catch(() => null)));
    }, 2000);

    setTimeout(async () => {
        if (!worldBoss?.isActive) return;
        if (updateInterval) clearInterval(updateInterval);
        worldBoss.isActive = false;

        const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 5);
        let summary = '💀 **THỰC THỂ ĐÃ CHẠY THOÁT VÀO HƯ VÔ!**\n\n**⚔️ NHỮNG CHIẾN BINH DŨNG CẢM NHẤT:**\n';
        
        if (sorted.length)
            sorted.forEach(([id, dmg], i) => { summary += `**#${i+1}** <@${id}>: \`${dmg.toLocaleString()}\` sát thương\n`; });
        else summary += '_Chiến trường lạnh lẽo, không một bóng người dám đối mặt với cái chết._';

        const failEmbed = new EmbedBuilder()
            .setTitle('🌑 ĐẤU TRƯỜNG SỤP ĐỔ')
            .setDescription(summary)
            .setColor('#1A1A1A')
            .setFooter({ text: 'Vết nứt đã khép lại...' });

        for (const m of worldBoss.messages) { try { await m.edit({ embeds: [failEmbed], components: [] }); } catch {} }
        worldBoss = null;
    }, 300000);
}

// ── XỬ LÝ KHI BOSS BỊ HẠ GỤC (PHÁT THƯỞNG LOGIC) ──────────────────────
async function handleBossDefeated(data, saveData) {
    if (!worldBoss?.isActive) return;
    if (updateInterval) clearInterval(updateInterval);
    worldBoss.isActive = false;

    const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a);
    const participantCount = sorted.length;
    const top3 = sorted.slice(0, 3);

    // ── LOGIC THƯỞNG LINH HOẠT ──
    // Quỹ cơ bản 1/3 HP. Thưởng thêm 5% cho mỗi người tham gia (Tối đa x2 quỹ thưởng - tương đương 20 người)
    const bonusFactor = 1 + (Math.min(participantCount, 20) * 0.05);
    const TOTAL_REWARD_POOL = Math.floor((worldBoss.maxHp / 3) * bonusFactor);

    let rewardList = '🎊 **HUYỀN THOẠI ĐÃ BỊ CHINH PHỤC!** 🎊\n\n' +
                     '**🏆 NHỮNG KẺ DIỆT THẦN:**\n';
    
    top3.forEach(([id, dmg], i) => { 
        const medal = ['🥇 QUÁN QUÂN', '🥈 Á QUÂN', '🥉 CHIẾN BINH'][i];
        rewardList += `> **${medal}:** <@${id}> (\`${dmg.toLocaleString()}\` sát thương)\n`; 
    });
    
    rewardList += `\n**💰 KHO BÁU CHIẾN TRƯỜNG:** \`${TOTAL_REWARD_POOL.toLocaleString()}\` Coins\n` +
                  `*(Quỹ tiền đã tăng **+${((bonusFactor - 1) * 100).toFixed(0)}%** nhờ sức mạnh đoàn kết)*\n\n`;

    for (const [id, dmg] of sorted) {
        // Chia tiền theo tỷ lệ sát thương: (Damage / MaxHP) * Quỹ thưởng
        const contributionRatio = dmg / worldBoss.maxHp;
        const reward = Math.floor(TOTAL_REWARD_POOL * contributionRatio);

        if (data[id]) { 
            data[id].coins = (data[id].coins || 0) + reward; 
            await saveData(id); 
        }
    }

    rewardList += `*Hệ thống đã tự động vinh danh và cộng thưởng cho \`${participantCount}\` chiến binh.*`;

    const winEmbed = new EmbedBuilder()
        .setTitle('🏆 CHIẾN THẮNG HUY HOÀNG')
        .setDescription(rewardList)
        .setColor('#F1C40F')
        .setImage('https://cdn.discordapp.com/attachments/1499736042100621395/1500166915291877426/IMG_8183.jpg')
        .setFooter({ text: 'Hòa bình tạm thời lập lại trên vùng đất này...' });

    for (const m of worldBoss.messages) { try { await m.edit({ embeds: [winEmbed], components: [] }); } catch {} }
    worldBoss = null;
}

module.exports = { 
    spawnBoss, 
    handleBossDefeated, 
    get worldBoss() { return worldBoss; } 
};
