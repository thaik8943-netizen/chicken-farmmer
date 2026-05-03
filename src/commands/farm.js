const { EmbedBuilder } = require('discord.js');
const { formatTime } = require('../utils/helpers');

// ── :nangcap ─────────────────────────────────────────────────────
function nangCap(msg, u) {
    const calcCost = lv => Math.pow((lv || 0) + 1, 2) * 2000;
    return msg.reply(
        `🚀 **TRUNG TÂM CÔNG NGHỆ NÔNG TRẠI**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `1️⃣ **Tỉ lệ Trứng (:upga)** - [Lv.${u.lvGa || 0}/10]\n` +
        `└ Tăng tỉ lệ rơi trứng Bạc/Vàng khi cho ăn.\n` +
        `💰 Phí lên Lv.${(u.lvGa || 0) + 1}: **${calcCost(u.lvGa).toLocaleString()} 🪙**\n\n` +
        `2️⃣ **Kho Thóc (:upthoc)** - [Lv.${u.lvNo || 0}/10]\n` +
        `└ Tăng giới hạn thu hoạch lúa & trữ lượng.\n` +
        `💰 Phí lên Lv.${(u.lvNo || 0) + 1}: **${calcCost(u.lvNo).toLocaleString()} 🪙**\n\n` +
        `3️⃣ **Máy Ấp Trứng (:upaptrung)** - [Lv.${u.lvAp || 0}/10]\n` +
        `└ Tăng may mắn nở ra gà Epic/Legendary.\n` +
        `💰 Phí lên Lv.${(u.lvAp || 0) + 1}: **${calcCost(u.lvAp).toLocaleString()} 🪙**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ *Giá nâng cấp tăng theo bình phương cấp độ!*`
    );
}

// ── :shop ────────────────────────────────────────────────────────
function shop(msg) {
    return msg.reply(
        `🏪 **CỬA HÀNG VẬT PHẨM CHICKEN EMPIRE**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🥚 **TRỨNG GIỐNG:**\n` +
        `1️⃣ **Gói Trứng Thường** (1 quả): **100 🪙**\n\n` +
        `🌾 **LƯƠNG THỰC:**\n` +
        `2️⃣ **Bao Thóc Nhỏ** (100🌾): **5,000 🪙**\n` +
        `3️⃣ **Bao Thóc Lớn** (500🌾): **22,000 🪙**\n` +
        `4️⃣ **Kho Thóc Dự Trữ** (1,000🌾): **40,000 🪙**\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👉 Dùng \`:buy <số thứ tự> <số lượng>\` để mua!`
    );
}

// ── :buy ─────────────────────────────────────────────────────────
async function buy(msg, u, saveData) {
    const args     = msg.content.split(' ');
    const itemNum  = parseInt(args[1]);
    const quantity = parseInt(args[2]) || 1;

    if (isNaN(itemNum) || quantity <= 0)
        return msg.reply('❌ Cú pháp: `:buy <số thứ tự> <số lượng>`');

    const ITEMS = {
        1: { name: 'Trứng Thường', price: 100   },
        2: { name: '100 Thóc',     price: 5000  },
        3: { name: '500 Thóc',     price: 22000 },
        4: { name: '1000 Thóc',    price: 40000 },
    };

    if (!ITEMS[itemNum]) return msg.reply('❌ Không tìm thấy món đồ này! Hãy xem `:shop`.');

    const { name, price } = ITEMS[itemNum];
    const totalCost = price * quantity;

    if (u.coins < totalCost)
        return msg.reply(`❌ Bạn cần **${totalCost.toLocaleString()} Coins** nhưng chỉ có **${u.coins.toLocaleString()}**.`);

    u.coins -= totalCost;
    if (itemNum === 1) u.trung.thuong += quantity;
    else if (itemNum === 2) u.thoc += 100  * quantity;
    else if (itemNum === 3) u.thoc += 500  * quantity;
    else if (itemNum === 4) u.thoc += 1000 * quantity;

    await saveData(msg.author.id);
    return msg.reply(`✅ Đã mua: **${quantity}x ${name}** | Chi: **${totalCost.toLocaleString()} Coins**`);
}

// ── :ruong ──────────────────────────────────────────────────────
function ruong(msg, u) {
    if (!u) return;
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });

    if ((u.lvGa || 0) < 4) {
        return msg.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🔒 KHU VỰC CHƯA KHAI HOANG')
                    .setDescription('Cánh đồng này hiện đang bị bao phủ bởi sương mù và cỏ dại. Bạn cần đạt **Cấp độ Gà 4** (`:upga`) để có thể bắt đầu canh tác tại đây!')
                    .setColor('#7F8C8D')
            ]
        });
    }

    const now = Date.now();
    const CD = 30 * 60 * 1000;
    const timePassed = now - (u.lastTrong || 0);
    const maxThoc = 500 + (u.lvNo || 0) * 200;

    let status, progress, color, image;
    
    if (!u.isTrongLua) {
        status = '📭 **Đất trống**\nĐất đã được làm tơi xốp, sẵn sàng để gieo hạt.';
        progress = '░░░░░░░░░░ 0%';
        color = '#BDC3C7';
        image = 'https://cdn-icons-png.flaticon.com/512/2517/2517551.png'; // Icon đất trống
    } else if (timePassed >= CD) {
        status = '🌾 **Lúa chín vàng rực**\nHào quang từ cánh đồng đang mời gọi bạn thu hoạch!';
        progress = '▰▰▰▰▰▰▰▰▰▰ 100%';
        color = '#F1C40F';
        image = 'https://cdn-icons-png.flaticon.com/512/2328/2328402.png'; // Icon lúa chín
    } else {
        const pct = Math.floor((timePassed / CD) * 100);
        const bars = Math.floor(pct / 10);
        progress = '▰'.repeat(bars) + '▱'.repeat(10 - bars) + ` ${pct}%`;
        status = `🌱 **Lúa đang trổ bông**\nSẽ sẵn sàng sau **${formatTime(CD - timePassed)}**.`;
        color = '#2ECC71';
        image = 'https://cdn-icons-png.flaticon.com/512/1047/1047535.png'; // Icon lúa lớn
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🌾 HỆ THỐNG ĐIỀN TRANG NĂNG SUẤT CAO', iconURL: botAvatar })
        .setTitle('🚜 QUẢN LÝ KHU CANH TÁC')
        .setThumbnail(image)
        .setColor(color)
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📜 **TRẠNG THÁI HIỆN TẠI**\n${status}\n\n` +
            `📈 **TIẾN ĐỘ SINH TRƯỞNG**\n\`${progress}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏗️ **HẠ TẦNG CƠ SỞ (Cấp ${u.lvNo || 0})**\n` +
            `└ 📦 Sức chứa kho: **${maxThoc.toLocaleString()} Thóc/vụ**\n` +
            `└ ⚡ Hiệu suất đất: **Ổn định**\n\n` +
            `💡 *Gợi ý: Sử dụng \`:upthoc\` để mở rộng diện tích ruộng!*`
        )
        .setFooter({ text: `Yêu cầu bởi ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
        .setTimestamp();

    return msg.reply({ embeds: [embed] });
}

// ── :tronglua ────────────────────────────────────────────────────
async function trongLua(msg, u, saveData, now) {
    if ((u.lvGa || 0) < 4) return msg.reply('❌ Cần `:upga` Lv.4 để bắt đầu canh tác!');
    if (u.isTrongLua) return msg.reply('🌾 Ruộng đang có lúa rồi! Hãy đợi chín và gõ `:thuhoach`.');

    const maxRuong = 500 + (u.lvNo || 0) * 200;
    const minGiong = Math.floor(maxRuong * 0.1);
    const maxGiong = Math.floor(maxRuong * 0.2);
    const thocGiong = Math.floor(Math.random() * (maxGiong - minGiong + 1)) + minGiong;

    if (u.thoc < thocGiong) {
        return msg.reply(`❌ **Cảnh báo:** Kho dự trữ không đủ! Bạn cần **${thocGiong} thóc** giống để phủ kín cánh đồng này.`);
    }

    u.thoc -= thocGiong;
    u.lastTrong = now;
    u.isTrongLua = true;
    u.thocGiongDaDung = thocGiong;

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🌱 KHỞI TẠO VỤ MÙA MỚI', iconURL: 'https://cdn-icons-png.flaticon.com/512/1047/1047535.png' })
        .setDescription(
            `Bạn đã tung **${thocGiong.toLocaleString()}** hạt giống lên đất.\n` +
            `Mưa thuận gió hòa, lúa sẽ chín sau **30 phút** nữa! ✨`
        )
        .setColor('#3498DB')
        .setFooter({ text: 'Hãy thường xuyên kiểm tra :ruong' });

    return msg.reply({ embeds: [embed] });
}

// ── :thuhoach ────────────────────────────────────────────────────
async function thuHoach(msg, u, saveData, now) {
    if (!u.isTrongLua) return msg.reply('❌ Ruộng đang trống, hãy gõ `:tronglua` trước!');

    const CD = 30 * 60 * 1000;
    const timePassed = now - (u.lastTrong || 0);

    if (timePassed < CD) {
        const remaining = CD - timePassed;
        return msg.reply(`⏳ **Lúa chưa chín!** Bạn cần chờ thêm **${formatTime(remaining)}** để hạt lúa đạt độ chắc mẩy nhất.`);
    }

    const maxThoc = 500 + (u.lvNo || 0) * 200;
    const minThu = Math.max(Math.floor(maxThoc * 0.7), (u.thocGiongDaDung || 0) * 2);
    const thuAmount = Math.floor(Math.random() * (maxThoc - minThu + 1)) + minThu;
    const loiNhuan = thuAmount - (u.thocGiongDaDung || 0);

    u.thoc += thuAmount;
    u.isTrongLua = false;
    u.thocGiongDaDung = 0;

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎊 VỤ MÙA BỘI THU!', iconURL: 'https://g-70.pcloud.com/dHZdofzXZ9VXZ7Z8ZZ5bZZu4A7Zf5Zb0ZH7Z75Z50Z3HZa0ZV0ZE7ZfFZD0ZE0Z3HZa0ZV0ZfHZa0ZV0ZE7ZfXZ67Z5fP6D76DkS67S8T9R0T9R0S6S8S7S6S8S7S6S8S7S6S8S7/image_6ab480.jpg' })
        .setTitle('🧺 KẾT QUẢ THU HOẠCH')
        .setColor('#F1C40F')
        .setThumbnail('https://g-70.pcloud.com/dHZdofzXZ9VXZ7Z8ZZ5bZZu4A7Zf5Zb0ZH7Z75Z50Z3HZa0ZV0ZE7ZfFZD0ZE0Z3HZa0ZV0ZfHZa0ZV0ZE7ZfXZ67Z5fP6D76DkS67S8T9R0T9R0S6S8S7S6S8S7S6S8S7S6S8S7/image_6ab480.jpg')
        .setDescription(
            `Cánh đồng của bạn đã được gặt hái xong!\n\n` +
            `💰 Tổng thu: **+${thuAmount.toLocaleString()} Thóc**\n` +
            `📈 Lợi nhuận ròng: **+${loiNhuan.toLocaleString()} Thóc**\n\n` +
            `🚀 *Sản lượng đã được chuyển thẳng vào kho dự trữ.*`
        )
        .setFooter({ text: 'Đất đang nghỉ ngơi, có thể gieo vụ tiếp theo ngay!' });

    return msg.reply({ embeds: [embed] });
}
