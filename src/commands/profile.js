const { EmbedBuilder } = require('discord.js');

module.exports = function cmdProfile(msg, u) {
    // 🏆 Xác định danh hiệu dựa trên tài sản
    const title = u.coins > 1000000 ? '🔱 HUYỀN THOẠI' : u.coins > 100000 ? '💰 PHÚ HỘ' : '🚜 NÔNG DÂN';
    
    // 🐔 Thông tin gà đang xuất trận
    const g = u.equippedGa;
    const equipped = g 
        ? `**${g.name}**\n╰ Phẩm chất: \`${g.rarity}\`\n╰ ❤️ \`${(g.hp || 0).toLocaleString()}\` | ⚔️ \`${(g.atk || 0).toLocaleString()}\`` 
        : '`Chưa xuất trận`';

    // 📊 Tính toán kho trứng
    const khoTrung = `🥚 \`${u.trung.thuong}\` | 🥈 \`${u.trung.bac}\` | 🥇 \`${u.trung.vang}\``;

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: `HỒ SƠ NGƯỜI CHƠI: ${msg.author.username.toUpperCase()}`, 
            iconURL: msg.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle(`${title}`)
        .setColor(u.coins > 100000 ? '#F1C40F' : '#2ECC71') // Vàng nếu giàu, xanh nếu nông dân
        .setThumbnail(msg.author.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
            { 
                name: '💰 TÀI SẢN', 
                value: `🪙 **Coins:** \`${u.coins.toLocaleString()}\` xu\n🌾 **Thóc:** \`${u.thoc.toLocaleString()}\` hạt`, 
                inline: true 
            },
            { 
                name: '🏡 TRẠI GÀ', 
                value: `🐓 **Số lượng:** \`${u.gaCon.length}\` con\n${khoTrung}`, 
                inline: true 
            },
            { 
                name: '🛡️ CHIẾN KÊ ĐẠI DIỆN', 
                value: equipped, 
                inline: false 
            },
            { 
                name: '🏗️ CẤP ĐỘ CÔNG TRÌNH', 
                value: `┃ 🥚 **Gà:** \`Lv.${u.lvGa}\` ┃ 🌾 **Thóc:** \`Lv.${u.lvNo}\` ┃ 🐣 **Ấp:** \`Lv.${u.lvAp}\` ┃`, 
                inline: false 
            }
        )
        .setFooter({ text: 'Hệ thống Quản lý Trang trại Gà • 2026' })
        .setTimestamp();

    return msg.reply({ embeds: [embed] });
};
