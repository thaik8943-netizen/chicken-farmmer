const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cfg = require('../../config/constants');

const SPECIAL_ITEMS = [
    { id: 've_restart',  name: 'Vé Restart 🎟️',  price: 50000,  desc: 'Bỏ qua thời gian ấp trứng ngay lập tức.', color: '#3498DB' },
    { id: 'trung_god',   name: 'Trứng God 🥚',    price: 200000, desc: 'Nở ra 100% gà Legendary.',               color: '#F1C40F' },
    { id: 'hop_bi_an',   name: 'Hộp Bí Ẩn 🎁',   price: 30000,  desc: 'Mở ra ngẫu nhiên Xu hoặc Thóc.',        color: '#9B59B6' },
];

async function spawnShop(msg, client) {
    const { ADMIN_ID, BOSS_CHANNELS } = cfg;
    if (msg.author.id !== ADMIN_ID) return msg.reply('❌ Bạn không có quyền triệu hồi thần linh!');

    cfg.currentSpecialShop = SPECIAL_ITEMS[Math.floor(Math.random() * SPECIAL_ITEMS.length)];
    const shop = cfg.currentSpecialShop;

    const shopEmbed = new EmbedBuilder()
        .setTitle('✨ SHOP THẦN THOẠI ĐANG MỞ CỬA ✨')
        .setDescription('> *Vị thần thương nhân vừa ghé qua trang trại của bạn!*')
        .addFields(
            { name: '📦 Vật phẩm', value: `**${shop.name}**`,                                                  inline: true },
            { name: '💰 Giá bán',  value: `\`${shop.price.toLocaleString()} Xu\``,                             inline: true },
            { name: '📝 Hiệu quả', value: `*${shop.desc}*` },
            { name: '⏰ Thời gian', value: `Kết thúc lúc <t:${Math.floor((Date.now() + 15 * 60000) / 1000)}:R>` },
        )
        .setColor(shop.color)
        .setThumbnail('https://i.imgur.com/8E9p6fS.gif')
        .setFooter({ text: 'Nhấn nút bên dưới để mua ngay!', iconURL: msg.author.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('buy_special_item')
            .setLabel(`Mua ${shop.name}`)
            .setEmoji('🛒')
            .setStyle(ButtonStyle.Success),
    );

    for (const channelId of BOSS_CHANNELS) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) await channel.send({ embeds: [shopEmbed], components: [row] });
        } catch (e) {
            console.log(`❌ Lỗi gửi shop: ${e.message}`);
        }
    }

    msg.reply('🚀 Shop đã xuất hiện trong **15 phút**!');
    setTimeout(() => { cfg.currentSpecialShop = null; }, 15 * 60000);
}

module.exports = { spawnShop };
