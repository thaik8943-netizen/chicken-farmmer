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

// ── :ruong ───────────────────────────────────────────────────────
function ruong(msg, u) {
    if (!u) return;
    if ((u.lvGa || 0) < 4)
        return msg.reply('❌ **Ruộng chưa khai hoang!** Cần nâng `:upga` lên Lv.4 để mở đất canh tác.');

    const now         = Date.now();
    const CD          = 30 * 60 * 1000;
    const timePassed  = now - (u.lastTrong || 0);
    const maxThoc     = 500 + (u.lvNo || 0) * 200;

    let status, progress;
    if (!u.isTrongLua) {
        status   = '🌾 **Ruộng đang trống.** Hãy gõ `:tronglua` để bắt đầu!';
        progress = '░░░░░░░░░░ 0%';
    } else if (timePassed >= CD) {
        status   = '🌾 **Lúa đã chín vàng!** Hãy gõ `:thuhoach` để thu hoạch.';
        progress = '██████████ 100%';
    } else {
        const pct      = Math.floor((timePassed / CD) * 100);
        const bars     = Math.floor(pct / 10);
        progress = '█'.repeat(bars) + '░'.repeat(10 - bars) + ` ${pct}%`;
        status   = `🌱 **Lúa đang lớn...**\nCòn **${formatTime(CD - timePassed)}** nữa.`;
    }

    const embed = new EmbedBuilder()
        .setTitle('🚜 QUẢN LÝ ĐIỀN TRANG')
        .setColor('#F1C40F')
        .setDescription(
            `📊 Trạng thái: ${status}\n⏲️ Tiến độ: \`${progress}\`\n\n` +
            `📦 **Giới hạn ruộng (Lv.${u.lvNo || 0}):**\n└ Tối đa: **${maxThoc.toLocaleString()} Thóc/vụ**\n\n` +
            `💡 *Nâng cấp \`:upthoc\` để tăng sản lượng!*`
        );

    return msg.reply({ embeds: [embed] });
}

// ── :tronglua ────────────────────────────────────────────────────
async function trongLua(msg, u, saveData, now) {
    if ((u.lvGa || 0) < 4) return msg.reply('❌ Cần `:upga` Lv.4 để bắt đầu canh tác!');
    if (u.isTrongLua) return msg.reply('🌾 Ruộng đang có lúa rồi! Hãy đợi chín và gõ `:thuhoach`.');

    const maxRuong  = 500 + (u.lvNo || 0) * 200;
    const minGiong  = Math.floor(maxRuong * 0.1);
    const maxGiong  = Math.floor(maxRuong * 0.2);
    const thocGiong = Math.floor(Math.random() * (maxGiong - minGiong + 1)) + minGiong;

    if (u.thoc < thocGiong)
        return msg.reply(`❌ Bạn không đủ thóc giống! Vụ này cần **${thocGiong} thóc**.`);

    u.thoc          -= thocGiong;
    u.lastTrong      = now;
    u.isTrongLua     = true;
    u.thocGiongDaDung = thocGiong;

    await saveData(msg.author.id);
    return msg.reply(`🌱 Bạn đã gieo **${thocGiong} thóc giống**. ⏳ Chờ 30 phút để lúa chín!`);
}

// ── :thuhoach ────────────────────────────────────────────────────
async function thuHoach(msg, u, saveData, now) {
    if (!u.isTrongLua) return msg.reply('❌ Ruộng đang trống, hãy gõ `:tronglua` trước!');

    const CD         = 30 * 60 * 1000;
    const timePassed = now - (u.lastTrong || 0);

    if (timePassed < CD) {
        const remaining = Math.ceil((CD - timePassed) / 60000);
        return msg.reply(`⏳ Lúa chưa chín! Còn khoảng **${remaining} phút** nữa.`);
    }

    const maxThoc    = 500 + (u.lvNo || 0) * 200;
    const minThu     = Math.max(Math.floor(maxThoc * 0.7), (u.thocGiongDaDung || 0) * 2);
    const thuHoach   = Math.floor(Math.random() * (maxThoc - minThu + 1)) + minThu;
    const loiNhuan   = thuHoach - (u.thocGiongDaDung || 0);

    u.thoc          += thuHoach;
    u.isTrongLua     = false;
    u.thocGiongDaDung = 0;

    await saveData(msg.author.id);
    return msg.reply(
        `🌾 **Thu hoạch thành công!**\n` +
        `📦 Nhận được: **${thuHoach.toLocaleString()} thóc**\n` +
        `📈 Lợi nhuận: **+${loiNhuan.toLocaleString()} thóc**`
    );
}

module.exports = { nangCap, shop, buy, ruong, trongLua, thuHoach };
