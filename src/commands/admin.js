const { ADMIN_ID } = require('../../config/constants');
const { EmbedBuilder } = require('discord.js');

// Hàm tính độ tương đồng giữa 2 chuỗi
function getSimilarity(s1, s2) {
    const set1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) set1.add(s1.substring(i, i + 2));
    const set2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) set2.add(s2.substring(i, i + 2));

    let intersection = 0;
    for (const biten of set1) {
        if (set2.has(biten)) intersection++;
    }
    return (2 * intersection) / (set1.size + set2.size);
}

module.exports = async function cmdAdmin(msg, _u, data, saveData) {
    if (msg.author.id !== ADMIN_ID) return msg.reply('❌ Quyền lực này không thuộc về bạn!');

    const args       = msg.content.split(' ');
    const targetUser = msg.mentions.users.first();
    const typeOrName = args[2]; 
    const r          = data[targetUser?.id];

    if (!targetUser || !r)
        return msg.reply('❌ Cú pháp không hợp lệ!');

    // ── 1. Tặng vật phẩm cơ bản ─────────────────────────────────────
    const basicItems = ['xu', 'thoc', 'thuong', 'bac', 'vang'];
    if (typeOrName && basicItems.includes(typeOrName.toLowerCase())) {
        const amt = parseInt(args[3]);
        if (isNaN(amt) || amt <= 0) return msg.reply('❌ Số lượng không hợp lệ!');
        const item = typeOrName.toLowerCase();
        if (item === 'xu') r.coins += amt;
        else if (item === 'thoc') r.thoc += amt;
        else r.trung[item] = (r.trung[item] || 0) + amt;
        await saveData(targetUser.id);
        
        return msg.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🎁 LỘC TỪ ADMIN')
                    .setDescription(`Đã chuyển thành công **${amt.toLocaleString()} ${item.toUpperCase()}** vào kho của <@${targetUser.id}>!`)
                    .setColor('#FFD700')
                    .setTimestamp()
            ]
        });
    }

    // ── 2. Tặng gà thiết kế riêng ────────────────────────────────────
    const rarityInput = args[3]?.toLowerCase();
    const hp          = parseInt(args[4]);
    const atk         = parseInt(args[5]);
    const price       = parseInt(args[6]);
    const amt         = parseInt(args[7]) || 1;

    if (!typeOrName || !rarityInput || isNaN(hp) || isNaN(atk) || isNaN(price)) {
        return msg.reply('❌ Sai cú pháp! `:give @user <Tên-Gà> <hệ> <máu> <atk> <giá> <số>`');
    }

    const rarityList = [
        { key: 'common', name: 'Common ⚪', color: '#BDC3C7' },
        { key: 'rare',   name: 'Rare 🔵', color: '#3498DB' },
        { key: 'epic',   name: 'Epic 🟣', color: '#9B59B6' },
        { key: 'legendary', name: 'Legendary 🟡', color: '#F1C40F' }
    ];

    let bestMatch = null;
    let maxScore = 0;

    for (const item of rarityList) {
        const score = getSimilarity(rarityInput, item.key);
        if (score > maxScore) {
            maxScore = score;
            bestMatch = item;
        }
    }

    const finalRarity = (maxScore >= 0.6) ? bestMatch.name : (rarityInput.charAt(0).toUpperCase() + rarityInput.slice(1));
    const embedColor = (maxScore >= 0.6) ? bestMatch.color : '#FFFFFF';
    const cleanName = typeOrName.replace(/-/g, ' ');

    for (let i = 0; i < amt; i++) {
        r.gaCon.push({
            id: Date.now() + i,
            name: cleanName,
            rarity: finalRarity,
            hp, atk, price,
            locked: false,
        });
    }

    await saveData(targetUser.id);
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: '⚡ HỆ THỐNG BAN PHƯỚC ADMIN ⚡', iconURL: msg.author.displayAvatarURL() })
        .setTitle(`✨ ĐÃ TẶNG: ${cleanName.toUpperCase()} ✨`)
        .setDescription(`Một món quà vô giá vừa được Admin gửi đến túi đồ của <@${targetUser.id}>!`)
        .setColor(embedColor)
        .addFields(
            { name: '📋 THÔNG TIN CHUNG', value: `> **Hệ:** ${finalRarity}\n> **Số lượng:** \`x${amt}\` gà chiến`, inline: false },
            { name: '⚔️ CHỈ SỐ CHIẾN ĐẤU', value: `\`\`\`fix\nHP: ${hp.toLocaleString()} | ATK: ${atk.toLocaleString()}\n\`\`\``, inline: false },
            { name: '💰 GIÁ TRỊ NIÊM YẾT', value: `> **Giá bán:** ${price.toLocaleString()} Xu`, inline: false }
        )
        .setFooter({ text: 'Chúc bạn chăm gà vui vẻ! • Farm Game' })
        .setTimestamp();

    return msg.reply({ embeds: [embed] });
};
