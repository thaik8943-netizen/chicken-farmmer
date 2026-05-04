const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');

const HELP_PAGES = {
    basic: {
        title: '🚜 ▬▬▬ DANH MỤC: TÂN THỦ ▬▬▬', color: '#5865F2',
        desc: '```fix\n🔰 HƯỚNG DẪN CƠ BẢN\n```\n' +
              '🔹 `:start` ➜ Khởi tạo trang trại của riêng bạn.\n' +
              '🔹 `:daily` ➜ Nhận 500 thóc cứu trợ (mỗi 2 tiếng).\n' +
              '🔹 `:thongtin` ➜ Kiểm tra hồ sơ, ví tiền và danh hiệu.',
    },
    feed: {
        title: '🌾 ▬▬▬ NUÔI DƯỠNG & SẢN XUẤT ▬▬▬', color: '#2ECC71',
        desc: '```yaml\n🥗 CHĂM SÓC GÀ\n```\n' +
              '🔸 `:chogaan` ➜ Dùng thóc nuôi gà lớn nhanh hơn.\n' +
              '```yaml\n🌱 NÔNG NGHIỆP\n```\n' +
              '🔸 `:tronglua` ➜ Gieo hạt giống xuống ruộng.\n' +
              '🔸 `:ruong` ➜ Kiểm tra tình trạng lúa đang lớn.\n' +
              '🔸 `:thuhoach` ➜ Thu hoạch lúa về kho thóc.',
    },
    hatch: {
        title: '🥚 ▬▬▬ ẤP TRỨNG & QUẢN LÝ ▬▬▬', color: '#F1C40F',
        desc: '```md\n🐣 QUY TRÌNH ẤP TRỨNG\n```\n' +
              '🔹 `:aptrung` ➜ Đưa trứng vào máy ấp thần tốc.\n' +
              '🔹 `:chuongga` ➜ Xem danh sách chiến kê đang sở hữu.\n' +
              '🔹 `:selltrung` ➜ Thanh lý trứng thừa để lấy xu.',
    },
    items: {
        title: '🎒 ▬▬▬ VẬT PHẨM ĐẶC BIỆT ▬▬▬', color: '#9B59B6',
        desc: '```arm\n🎁 TÚI ĐỒ CÁ NHÂN\n```\n' +
              '✨ `:khodo` ➜ Kiểm tra toàn bộ vật phẩm đang có.\n' +
              '🎟️ `:use ve` ➜ Nở toàn bộ trứng ngay lập tức.\n' +
              '🥚 `:use god` ➜ Triệu hồi siêu gà Legendary.\n' +
              '🎁 `:use qua` ➜ Mở Hộp Bí Ẩn nhận Thóc/Xu.',
    },
    upgrade: {
        title: '🏗️ ▬▬▬ NÂNG CẤP CÔNG TRÌNH ▬▬▬', color: '#E67E22',
        desc: '```py\n🏗️ MỞ RỘNG QUY MÔ\n```\n' +
              '🛠️ `:nangcap` ➜ Mở menu nâng cấp tổng thể.\n' +
              '🛠️ `:upga` ➜ Tăng tỉ lệ xuất hiện trứng hiếm.\n' +
              '🛠️ `:upaptrung` ➜ Nâng cấp hiệu suất máy ấp.\n' +
              '🛠️ `:upthoc` ➜ Mở rộng sức chứa kho lương thực.',
    },
    social: {
        title: '🔥 ▬▬▬ GIAO THƯƠNG & SỰ KIỆN ▬▬▬', color: '#E74C3C',
        desc: '```diff\n⚔️ HOẠT ĐỘNG SERVER\n```\n' +
              '🛒 `:shop` ➜ Mua vật phẩm và trang bị mới.\n' +
              '🤝 `:trade @user` ➜ Trao đổi vật phẩm với bạn bè.\n' +
              '👹 `:spawnboss` ➜ Hợp sức tiêu diệt World Boss.\n' +
              '⚠️ `:tromga @user` ➜ Đột nhập trộm gà hàng xóm.',
    },
};

module.exports = async function cmdHelp(msg, _u, client) {
    const botAvatar = client.user?.displayAvatarURL({ size: 128 }); // Giảm size avatar cho gọn

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Chọn một chương trong cẩm nang...')
        .addOptions([
            { label: 'Tân Thủ', value: 'basic', emoji: '🔰' },
            { label: 'Sản Xuất', value: 'feed', emoji: '🌾' },
            { label: 'Ấp Trứng', value: 'hatch', emoji: '🥚' },
            { label: 'Vật Phẩm', value: 'items', emoji: '🎒' },
            { label: 'Nâng Cấp', value: 'upgrade', emoji: '🏗️' },
            { label: 'Sự Kiện', value: 'social', emoji: '🔥' },
        ]);

    const helpEmbed = new EmbedBuilder()
        .setAuthor({ name: 'CHICKEN EMPIRE - WIKI', iconURL: botAvatar })
        .setTitle('📒 CUỐN CẨM NANG TRANG TRẠI THẦN BÍ')
        .setColor('#FFD700')
        .setDescription(
            '✨ **Chào mừng chủ trang trại trẻ tuổi!**\n' +
            'Mọi bí mật để trở thành một **Huyền Thoại** đều nằm trong đây.\n\n' +
            '┏━━━━━━━━━━━━━━━━━━━━━┓\n' +
            '┃ 📥 **Vui lòng chọn danh mục bên dưới** ┃\n' +
            '┗━━━━━━━━━━━━━━━━━━━━━┛'
        )
        .setFooter({ text: `Yêu cầu bởi: ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
        .setTimestamp();

    const response = await msg.reply({
        embeds: [helpEmbed],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) return i.reply({ content: '❌ Đây không phải cẩm nang của bạn!', ephemeral: true });

        const page = HELP_PAGES[i.values[0]];
        if (!page) return;

        const updateEmbed = new EmbedBuilder()
            .setTitle(page.title)
            .setColor(page.color)
            .setAuthor({ name: 'CHI TIẾT HƯỚNG DẪN', iconURL: botAvatar })
            .setDescription(`\n${page.desc}\n\n` + '━━━━━━━━━━━━━━━━━━━━━━');

        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => response.edit({ components: [] }).catch(() => {}));
};
