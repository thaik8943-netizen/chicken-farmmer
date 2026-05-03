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
            `1️⃣ **Tỉ lệ Trứng (:upga)** - [Lv.${u.lvGa || 0}/30]\n` +
            `└ Phí lên Lv.${(u.lvGa || 0) + 1}: **${calcCost(u.lvGa).toLocaleString()} 🪙**\n\n` +
            `2️⃣ **Kho Thóc (:upthoc)** - [Lv.${u.lvNo || 0}/30]\n` +
            `└ Phí lên Lv.${(u.lvNo || 0) + 1}: **${calcCost(u.lvNo).toLocaleString()} 🪙**\n\n` +
            `3️⃣ **Máy Ấp Trứng (:upaptrung)** - [Lv.${u.lvAp || 0}/30]\n` +
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

// ── HÀM HỖ TRỢ TÍNH TOÁN (Hòa nhớ thêm u.maxVuMua và u.thocDaThu vào DB nhé) ──
function getReadyThoc(u, now) {
    if (!u.isTrongLua) return 0;
    
    const totalPossible = u.maxVuMua || 0; 
    const alreadyTaken = u.thocDaThu || 0; 
    const remainingInSoil = totalPossible - alreadyTaken; 

    const timePassedMs = now - (u.lastTrong || 0);
    const minutesPassed = Math.floor(timePassedMs / (10 * 60 * 1000)); // 10 phút một lần chín
    const newlyRipened = minutesPassed * 100; 

    return Math.min(newlyRipened, remainingInSoil);
}

// ── :ruong ──────────────────────────────────────────────────────
function ruong(msg, u) {
    if (!u) return;
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true, size: 512 });
    const now = Date.now();
    const thocReady = getReadyThoc(u, now);
    const alreadyTaken = u.thocDaThu || 0;
    const totalPossible = u.maxVuMua || 0;

    let status, color, progress;
    if (!u.isTrongLua) {
        status = '📭 **ĐẤT HOANG**\nHãy gieo hạt để bắt đầu chu kỳ sản xuất!';
        color = '#7F8C8D';
        progress = '░░░░░░░░░░ 0%';
    } else {
        const pct = totalPossible > 0 ? Math.min(100, Math.floor(((alreadyTaken + thocReady) / totalPossible) * 100)) : 0;
        const bars = Math.floor(pct / 10);
        progress = '▰'.repeat(bars) + '▱'.repeat(10 - bars) + ` ${pct}%`;
        
        if (alreadyTaken + thocReady >= totalPossible) {
            status = '⚠️ **VỤ MÙA CẠN KIỆT**\nĐất đã hết dưỡng chất, thu hoạch để gieo vụ mới!';
            color = '#E74C3C';
        } else if (thocReady >= 100) {
            status = '🌾 **LÚA CHÍN DẦN**\nCó thể thu hoạch một phần ngay bây giờ.';
            color = '#F1C40F';
        } else {
            status = '🌱 **ĐANG SINH TRƯỞNG**\nMỗi 10 phút sẽ chín thêm 100 thóc.';
            color = '#2ECC71';
        }
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🌾 QUẢN LÝ ĐIỀN TRANG', iconURL: botAvatar })
        .setColor(color)
        .setThumbnail(botAvatar)
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📜 **TRẠNG THÁI**: ${status}\n` +
            `💰 **SẢN LƯỢNG CHÍN**: \`${thocReady.toLocaleString()}\` Thóc\n` +
            `📈 **TIẾN ĐỘ VỤ MÙA**: \`${progress}\`\n` +
            `📦 **TỔNG THU HOẠCH**: \`${alreadyTaken.toLocaleString()} / ${totalPossible.toLocaleString()}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏗️ **HẠ TẦNG**: Kho Cấp ${u.lvNo || 0}\n` +
            `└ ⚡ Tốc độ: **100 Thóc / 10 phút**`
        )
        .setFooter({ text: `Nông dân: ${msg.author.username} | Dùng :tronglua [số lượng] để gieo hạt` });

    return msg.reply({ embeds: [embed] });
}

// ── :tronglua ────────────────────────────────────────────────────
async function trongLua(msg, u, saveData, now) {
    if ((u.lvGa || 0) < 4) return msg.reply('❌ Cần đạt **Cấp độ Gà 4** (`:upga`) để khai hoang đất!');
    if (u.isTrongLua) return msg.reply('🌾 Đất đang có lúa! Hãy thu hoạch sạch vụ này trước khi gieo mới.');

    const args = msg.content.split(' ');
    const amountToSow = parseInt(args[1]);

    if (!amountToSow || amountToSow <= 0) {
        return msg.reply('❓ Bạn muốn gieo bao nhiêu thóc giống? Ví dụ: `:tronglua 500`.\n💡 Kiếm thóc tại `:daily` hoặc mua ở `:shop`.');
    }

    if (u.thoc < amountToSow) {
        return msg.reply(`❌ Bạn không đủ thóc giống! Hiện có: **${u.thoc.toLocaleString()}**.\n🛒 Ghé ngay \`:shop\` để sắm thêm!`);
    }

    // Giới hạn gieo tối đa dựa trên cấp độ Kho
    const maxSowLimit = 1000 + (u.lvNo || 0) * 500; 
    if (amountToSow > maxSowLimit) {
        return msg.reply(`⚠️ Kho của bạn chỉ hỗ trợ gieo tối đa **${maxSowLimit.toLocaleString()}** thóc mỗi vụ!`);
    }

    u.thoc -= amountToSow;
    u.lastTrong = now;
    u.isTrongLua = true;
    u.thocDaThu = 0; 
    u.maxVuMua = amountToSow * 3; // Lợi nhuận x3 vốn

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setTitle('🌱 GIEO HẠT THÀNH CÔNG')
        .setDescription(`Bạn đã đầu tư **${amountToSow.toLocaleString()}** thóc giống.\n🚀 Vụ mùa này hứa hẹn mang về **${u.maxVuMua.toLocaleString()}** thóc!`)
        .setColor('#3498DB');

    return msg.reply({ embeds: [embed] });
}

// ── :thuhoach ────────────────────────────────────────────────────
async function thuHoach(msg, u, saveData, now) {
    if (!u.isTrongLua) return msg.reply('❌ Đất trống, chưa có gì để thu hoạch cả!');
    
    const thocReady = getReadyThoc(u, now);
    if (thocReady < 100) return msg.reply('⏳ Lúa chưa đủ chín! Chờ ít nhất 10 phút để có 100 hạt đầu tiên.');

    u.thoc += thocReady;
    u.thocDaThu = (u.thocDaThu || 0) + thocReady;
    u.lastTrong = now; // Reset mốc thời gian để mọc lúa mới

    let resultMsg = `💰 Bạn đã thu hoạch được **+${thocReady.toLocaleString()} Thóc**!`;

    // Nếu đã lấy hết sản lượng tối đa của vụ gieo
    if (u.thocDaThu >= (u.maxVuMua || 0)) {
        u.isTrongLua = false;
        u.thocDaThu = 0;
        u.maxVuMua = 0;
        resultMsg += `\n✨ **Vụ mùa kết thúc!** Bạn đã khai thác hết tiềm năng của đợt gieo này.`;
    }

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎊 MÙA VÀNG BỘI THU', iconURL: msg.client.user.displayAvatarURL() })
        .setDescription(resultMsg)
        .setColor('#F1C40F')
        .setFooter({ text: 'Sử dụng :ruong để kiểm tra tình hình điền trang' });

    return msg.reply({ embeds: [embed] });
}
