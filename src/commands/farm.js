const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// ── Hàm bổ trợ định dạng thời gian
const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}p ${secs}s`;
};

// ── :nangcap ─────────────────────────────────────────────────────
function nangCap(msg, u) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const calcCost = lv => Math.pow((lv || 0) + 1, 2) * 2000;

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🚀 TRUNG TÂM CÔNG NGHỆ NÔNG TRẠI', iconURL: botAvatar })
        .setColor('#E67E22')
        .setThumbnail(botAvatar)
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `1️⃣ **Tỉ lệ Trứng (:upga)** - [Lv.${u.lvGa || 0}/10]\n` +
            `└ Phí lên Lv.${(u.lvGa || 0) + 1}: **${calcCost(u.lvGa).toLocaleString()} 🪙**\n\n` +
            `2️⃣ **Kho Thóc (:upthoc)** - [Lv.${u.lvNo || 0}/10]\n` +
            `└ Phí lên Lv.${(u.lvNo || 0) + 1}: **${calcCost(u.lvNo).toLocaleString()} 🪙**\n\n` +
            `3️⃣ **Máy Ấp Trứng (:upaptrung)** - [Lv.${u.lvAp || 0}/10]\n` +
            `└ Phí lên Lv.${(u.lvAp || 0) + 1}: **${calcCost(u.lvAp).toLocaleString()} 🪙**\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `⚠️ *Giá nâng cấp tăng theo bình phương cấp độ!*`
        )
        .setFooter({ text: 'Hãy chọn chỉ số bạn muốn ưu tiên nâng cấp trước!' });

    return msg.reply({ embeds: [embed] });
}

// ── :shop ────────────────────────────────────────────────────────
function shop(msg) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const embed = new EmbedBuilder()
        .setAuthor({ name: '🏪 CỬA HÀNG VẬT PHẨM CHICKEN EMPIRE', iconURL: botAvatar })
        .setColor('#F1C40F')
        .setThumbnail(botAvatar)
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🥚 **TRỨNG GIỐNG:**\n` +
            `1️⃣ **Gói Trứng Thường**: **100 🪙**\n\n` +
            `🌾 **LƯƠNG THỰC:**\n` +
            `2️⃣ **Bao Thóc Nhỏ** (100🌾): **5,000 🪙**\n` +
            `3️⃣ **Bao Thóc Lớn** (500🌾): **22,000 🪙**\n` +
            `4️⃣ **Kho Thóc Dự Trữ** (1,000🌾): **40,000 🪙**\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👉 Dùng \`:buy <STT> <Số lượng>\` để mua!`
        );

    return msg.reply({ embeds: [embed] });
}

// ── :buy ─────────────────────────────────────────────────────────
async function buy(msg, u, saveData) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const args = msg.content.split(' ');
    const itemNum = parseInt(args[1]);
    const quantity = parseInt(args[2]) || 1;

    if (isNaN(itemNum) || quantity <= 0) {
        return msg.reply('❌ Cú pháp đúng: `:buy <số thứ tự> <số lượng>`');
    }

    const ITEMS = {
        1: { name: 'Trứng Thường', price: 100 },
        2: { name: '100 Thóc', price: 5000 },
        3: { name: '500 Thóc', price: 22000 },
        4: { name: '1000 Thóc', price: 40000 },
    };

    if (!ITEMS[itemNum]) return msg.reply('❌ Không tìm thấy món đồ này!');

    const { name, price } = ITEMS[itemNum];
    const totalCost = price * quantity;

    if (u.coins < totalCost) {
        return msg.reply(`❌ Bạn thiếu **${(totalCost - u.coins).toLocaleString()} Coins** nữa!`);
    }

    u.coins -= totalCost;
    if (itemNum === 1) u.trung.thuong += quantity;
    else if (itemNum === 2) u.thoc += 100 * quantity;
    else if (itemNum === 3) u.thoc += 500 * quantity;
    else if (itemNum === 4) u.thoc += 1000 * quantity;

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🛒 GIAO DỊCH THÀNH CÔNG', iconURL: botAvatar })
        .setDescription(`✅ Bạn đã mua thành công **${quantity}x ${name}**\n💰 Tổng chi phí: **${totalCost.toLocaleString()} Coins**`)
        .setColor('#2ECC71')
        .setThumbnail(botAvatar);

    return msg.reply({ embeds: [embed] });
}

// ── :ruong ──────────────────────────────────────────────────────
function ruong(msg, u) {
    if (!u) return;
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });

    if ((u.lvGa || 0) < 4) {
        const lockEmbed = new EmbedBuilder()
            .setTitle('🔒 KHU VỰC CHƯA KHAI HOANG')
            .setDescription('Bạn cần đạt **Cấp độ Gà 4** (`:upga`) để mở khóa cánh đồng này!')
            .setColor('#7F8C8D')
            .setThumbnail(botAvatar);
        return msg.reply({ embeds: [lockEmbed] });
    }

    const now = Date.now();
    const CD = 30 * 60 * 1000;
    const timePassed = now - (u.lastTrong || 0);
    const maxThoc = 500 + (u.lvNo || 0) * 200;

    let status, progress, color;
    if (!u.isTrongLua) {
        status = '📭 **Đất trống**\nSẵn sàng gieo hạt.';
        progress = '░░░░░░░░░░ 0%';
        color = '#BDC3C7';
    } else if (timePassed >= CD) {
        status = '🌾 **Lúa chín vàng rực**\nHãy thu hoạch ngay!';
        progress = '▰▰▰▰▰▰▰▰▰▰ 100%';
        color = '#F1C40F';
    } else {
        const pct = Math.floor((timePassed / CD) * 100);
        const bars = Math.floor(pct / 10);
        progress = '▰'.repeat(bars) + '▱'.repeat(10 - bars) + ` ${pct}%`;
        status = `🌱 **Lúa đang lớn**\nChín sau: **${formatTime(CD - timePassed)}**.`;
        color = '#2ECC71';
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🌾 QUẢN LÝ ĐIỀN TRANG', iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setColor(color)
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📜 **TRẠNG THÁI**: ${status}\n` +
            `📈 **TIẾN ĐỘ**: \`${progress}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏗️ **HẠ TẦNG**: Cấp ${u.lvNo || 0}\n` +
            `└ 📦 Kho: **${maxThoc.toLocaleString()} Thóc**`
        )
        .setFooter({ text: `Nông dân: ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() });

    return msg.reply({ embeds: [embed] });
}

// ── :tronglua ────────────────────────────────────────────────────
async function trongLua(msg, u, saveData, now) {
    if ((u.lvGa || 0) < 4) return msg.reply('❌ Cần `:upga` Lv.4!');
    if (u.isTrongLua) return msg.reply('🌾 Đất đã có lúa!');

    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const maxRuong = 500 + (u.lvNo || 0) * 200;
    const thocGiong = Math.floor(Math.random() * (maxRuong * 0.2 - maxRuong * 0.1 + 1)) + Math.floor(maxRuong * 0.1);

    if (u.thoc < thocGiong) return msg.reply(`❌ Thiếu **${(thocGiong - u.thoc).toLocaleString()} thóc** giống.`);

    u.thoc -= thocGiong;
    u.lastTrong = now;
    u.isTrongLua = true;
    u.thocGiongDaDung = thocGiong;

    await saveData(msg.author.id);
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: '🌱 GIEO HẠT THÀNH CÔNG', iconURL: botAvatar })
        .setDescription(`Bạn đã gieo **${thocGiong.toLocaleString()}** thóc giống.\n⏳ Chờ 30 phút để thu hoạch!`)
        .setColor('#3498DB')
        .setThumbnail(botAvatar);

    return msg.reply({ embeds: [embed] });
}

// ── :thuhoach ────────────────────────────────────────────────────
async function thuHoach(msg, u, saveData, now) {
    if (!u.isTrongLua) return msg.reply('❌ Đất trống!');
    const CD = 30 * 60 * 1000;
    if (now - (u.lastTrong || 0) < CD) return msg.reply('⏳ Lúa chưa chín!');

    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const maxThoc = 500 + (u.lvNo || 0) * 200;
    const minThu = Math.max(Math.floor(maxThoc * 0.7), (u.thocGiongDaDung || 0) * 2);
    const thuAmount = Math.floor(Math.random() * (maxThoc - minThu + 1)) + minThu;
    const loiNhuan = thuAmount - (u.thocGiongDaDung || 0);

    u.thoc += thuAmount;
    u.isTrongLua = false;
    u.thocGiongDaDung = 0;
    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎊 VỤ MÙA BỘI THU!', iconURL: botAvatar })
        .setColor('#F1C40F')
        .setImage(botAvatar)
        .setDescription(
            `💰 Tổng thu: **+${thuAmount.toLocaleString()} Thóc**\n` +
            `📈 Lợi nhuận: **+${loiNhuan.toLocaleString()} Thóc**`
        );

    return msg.reply({ embeds: [embed] });
}
module.exports = {
    nangCap,
    shop,
    buy,
    ruong,
    trongLua,
    thuHoach
};
