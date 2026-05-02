const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const HELP_PAGES = {
    basic: {
        title: '🚜 DANH MỤC: TÂN THỦ', color: '#5865F2',
        desc: '>>> 🔰 `:start`: Khởi tạo trang trại.\n💰 `:daily`: Nhận 500 thóc (mỗi 2 tiếng).\n📊 `:thongtin`: Xem hồ sơ và ví tiền.',
    },
    feed: {
        title: '🌾 NUÔI DƯỠNG & SẢN XUẤT', color: '#2ECC71',
        desc: '>>> 🥗 `:chogaan`: Dùng thóc nuôi gà lớn.\n🌱 `:tronglua`: Gieo hạt giống xuống ruộng.\n🚜 `:ruong`: Kiểm tra tình trạng lúa.\n🌾 `:thuhoach`: Thu hoạch thóc.',
    },
    hatch: {
        title: '🥚 ẤP TRỨNG & QUẢN LÝ', color: '#F1C40F',
        desc: '>>> 🐣 `:aptrung`: Đưa trứng vào máy.\n🏡 `:chuonga`: Xem danh sách chiến kê.\n💰 `:selltrung`: Bán bớt trứng lấy xu.',
    },
    items: {
        title: '🎒 VẬT PHẨM ĐẶC BIỆT', color: '#9B59B6',
        desc: '>>> 🎒 `:khodo`: Kiểm tra túi đồ.\n🎟️ `:use ve_restart`: Nở toàn bộ trứng ngay.\n🥚 `:use trung_god`: Nhận siêu gà Legendary.\n🎁 `:use hop_bi_an`: Mở quà nhận Thóc hoặc Xu.',
    },
    upgrade: {
        title: '🏗️ NÂNG CẤP CÔNG TRÌNH', color: '#E67E22',
        desc: '>>> 🏗️ `:nangcap`: Mở menu nâng cấp.\n🏚️ `:upga`: Nâng tỉ lệ trứng hiếm.\n🏭 `:upaptrung`: Nâng cấp máy ấp.\n📦 `:upthoc`: Mở rộng kho thóc.',
    },
    social: {
        title: '🔥 GIAO THƯƠNG & SỰ KIỆN', color: '#E74C3C',
        desc: '>>> 🛒 `:shop`: Mua vật phẩm.\n🤝 `:trade @user`: Trao đổi với hàng xóm.\n⚔️ `:spawnboss` (admin): Đấu World Boss.\n🥷 `:tromga @user`: Trộm gà (cẩn thận!).',
    },
};

module.exports = async function cmdHelp(msg, _u, client) {
    const botAvatar = client.user?.displayAvatarURL({ dynamic: true, size: 512 }) || msg.guild?.iconURL();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Khám phá bí kíp luyện gà tại đây...')
        .addOptions([
            { label: 'Hướng Dẫn Tân Thủ',       value: 'basic',   emoji: '🔰', description: 'Cách bắt đầu và nhận hỗ trợ mỗi ngày.' },
            { label: 'Nuôi Dưỡng & Sản Xuất',    value: 'feed',    emoji: '🌾', description: 'Trồng lúa, gặt thóc và chăm sóc gà.' },
            { label: 'Ấp Trứng & Quản Lý',       value: 'hatch',   emoji: '🥚', description: 'Kỹ thuật ấp trứng và quản lý chuồng.' },
            { label: 'Vật Phẩm Đặc Biệt',        value: 'items',   emoji: '🎒', description: 'Dùng Vé Restart, Trứng God, Hộp Bí Ẩn.' },
            { label: 'Nâng Cấp Công Trình',      value: 'upgrade', emoji: '🏗️', description: 'Mở rộng quy mô trang trại.' },
            { label: 'Giao Thương & Sự Kiện',    value: 'social',  emoji: '🔥', description: 'Shop, World Boss và hoạt động ngầm.' },
        ]);

    const helpEmbed = new EmbedBuilder()
        .setTitle('📒 CUỐN CẨM NANG CHICKEN EMPIRE')
        .setColor('#FFD700')
        .setAuthor({ name: 'Hệ Thống Hỗ Trợ Trang Trại', iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setDescription('✨ **Chào mừng chủ trang trại!**\n\n> Hãy chọn một danh mục bên dưới để xem chi tiết.')
        .setFooter({ text: `Yêu cầu bởi: ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
        .setTimestamp();

    const response = await msg.reply({
        embeds: [helpEmbed],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id)
            return i.reply({ content: '❌ Bạn không thể điều khiển menu này!', ephemeral: true });

        const page = HELP_PAGES[i.values[0]];
        if (!page) return;

        const updateEmbed = new EmbedBuilder()
            .setTitle(page.title).setDescription(page.desc).setColor(page.color)
            .setAuthor({ name: 'Hướng Dẫn Chi Tiết', iconURL: botAvatar })
            .setThumbnail(botAvatar);

        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => response.edit({ components: [] }).catch(() => {}));
};
