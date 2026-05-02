const { EmbedBuilder } = require('discord.js');

module.exports = function cmdInventory(msg, u) {
    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };

    const embed = new EmbedBuilder()
        .setTitle(`🎒 KHO ĐỒ CỦA ${msg.author.username.toUpperCase()}`)
        .setColor('#3498DB')
        .addFields(
            { name: '🎟️ Vé Restart',  value: `${u.inventory.ve_restart  || 0}`, inline: true },
            { name: '🥚 Trứng God',   value: `${u.inventory.trung_god   || 0}`, inline: true },
            { name: '🎁 Hộp Bí Ẩn',  value: `${u.inventory.hop_bi_an   || 0}`, inline: true },
            { name: '💰 Số dư Xu',    value: `**${u.coins.toLocaleString()} Xu**` },
        )
        .setFooter({ text: 'Dùng: :use <tên_vật_phẩm>' });

    return msg.reply({ embeds: [embed] });
};
