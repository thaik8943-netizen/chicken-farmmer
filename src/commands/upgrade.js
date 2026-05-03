const { EmbedBuilder } = require('discord.js');

module.exports = async function cmdUpgrade(msg, u, saveData) {
    let typeName, key, emoji;
    const content = msg.content.toLowerCase();

    // Nhận diện lệnh chính xác
    if (content === ':upga') { 
        typeName = 'Tỉ lệ trứng hiếm'; 
        key = 'lvGa'; 
        emoji = '🍀';
    } else if (content === ':upthoc') { 
        typeName = 'Kho thóc'; 
        key = 'lvNo'; 
        emoji = '🌾';
    } else if (content === ':upap' || content === ':upaptrung') { 
        typeName = 'Máy ấp trứng'; 
        key = 'lvAp'; 
        emoji = '🐣';
    } else {
        // Nếu gõ lệnh không liên quan thì không hiện gì cả, tránh nhầm lẫn
        return; 
    }
    const currentLv = u[key] || 0;
    const MAX_LEVEL = 30; // Mở giới hạn lên 30

    if (currentLv >= MAX_LEVEL) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.${MAX_LEVEL})!`);

    const cost = Math.pow(currentLv + 1, 2) * 2000;

    if ((u.coins || 0) < cost) {
        return msg.reply(
            `❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.\n` +
            `💰 Giá nâng cấp Lv.${currentLv + 1} là: **${cost.toLocaleString()} Coins**.`
        );
    }

    // Thực hiện trừ tiền và tăng cấp
    u.coins -= cost;
    u[key] = currentLv + 1;
    
    await saveData(msg.author.id);

    // Trả về thông báo đẹp mắt
    const embed = new EmbedBuilder()
        .setAuthor({ name: '🛠️ NÂNG CẤP HỆ THỐNG', iconURL: msg.author.displayAvatarURL() })
        .setTitle(`${emoji} THÀNH CÔNG: ${typeName.toUpperCase()}`)
        .setColor('#2ECC71')
        .setDescription(
            `🚀 Đã nâng cấp lên: **Lv.${u[key]}** / ${MAX_LEVEL}\n` +
            `💸 Chi phí: **${cost.toLocaleString()} Coins**`
        )
        .setTimestamp();

    return msg.reply({ embeds: [embed] });
};
