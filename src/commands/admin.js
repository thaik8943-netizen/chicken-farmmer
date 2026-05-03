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

    // ── 1. Tặng hoặc Tịch thu vật phẩm cơ bản ─────────────────────────────────────
const basicItems = ['xu', 'thoc', 'thuong', 'bac', 'vang'];
if (typeOrName && basicItems.includes(typeOrName.toLowerCase())) {
    const amt = parseInt(args[3]);
    if (isNaN(amt) || amt === 0) return msg.reply('❌ **Lỗi:** Số lượng không hợp lệ hoặc bằng 0!');

    const item = typeOrName.toLowerCase();
    const itemName = item.toUpperCase();
    
    // Thực hiện cộng/trừ tài nguyên
    if (item === 'xu') r.coins += amt;
    else if (item === 'thoc') r.thoc += amt;
    else r.trung[item] = (r.trung[item] || 0) + amt;

    // Chặn giá trị âm dưới 0
    if (item === 'xu' && r.coins < 0) r.coins = 0;
    if (item === 'thoc' && r.thoc < 0) r.thoc = 0;
    if (r.trung[item] < 0) r.trung[item] = 0;

    await saveData(targetUser.id);

    const isSeize = amt < 0; 
    const absAmt = Math.abs(amt).toLocaleString(); 
    const embed = new EmbedBuilder().setTimestamp();

    if (isSeize) {
        // --- DECOR TỊCH THU (PHONG CÁCH TÒA ÁN) ---
        embed.setColor('#C0392B') // Đỏ sẫm uy quyền
             .setAuthor({ name: '🏛️ TÒA ÁN TRANG TRẠI - LỆNH THI HÀNH ÁN', iconURL: 'https://cdn-icons-png.flaticon.com/512/950/950714.png' })
             .setTitle('⚖️ QUYẾT ĐỊNH TỊCH THU TÀI SẢN')
             .setDescription(`Hành vi vi phạm quy định đã bị ghi nhận. Hội đồng Admin quyết định thu hồi tài nguyên của <@${targetUser.id}>.`)
             .addFields(
                 { name: '📉 Tang vật thu hồi', value: `\`${absAmt}\` **${itemName}**`, inline: true },
                 { name: '👤 Trạng thái', value: '`Đã thực thi` ✅', inline: true },
                 { name: '📜 Ghi chú', value: '*Tài sản đã được chuyển về ngân khố quốc gia.*' }
             )
             .setThumbnail('https://cdn-icons-png.flaticon.com/512/3820/3820177.png') // Icon búa công lý
             .setFooter({ text: `Người thực thi: ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() });
    } else {
        // --- DECOR TẶNG (PHONG CÁCH QUÝ TỘC) ---
        embed.setColor('#F1C40F') // Vàng hoàng gia
             .setAuthor({ name: '🌟 NGÂN KHỐ HOÀNG GIA - BAN THƯỞNG', iconURL: 'https://cdn-icons-png.flaticon.com/512/1041/1041883.png' })
             .setTitle('🎁 LỘC TRỜI BAN TỪ ADMIN')
             .setDescription(`Một phần quà từ phương xa đã được gửi đến cho <@${targetUser.id}>. Hãy sử dụng thật thông minh nhé!`)
             .addFields(
                 { name: '💰 Vật phẩm ban tặng', value: `\`+${absAmt}\` **${itemName}**`, inline: true },
                 { name: '💎 Loại hình', value: '`Lộc Admin` ✨', inline: true },
                 { name: '🌈 Thông điệp', value: '*Chúc bạn có những giây phút chăn gà vui vẻ!*' }
             )
             .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135810.png') // Icon túi tiền/quà
             .setFooter({ text: `Người ban tặng: ${msg.author.tag}`, iconURL: msg.author.displayAvatarURL() });
    }

    return msg.reply({ embeds: [embed] });
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
