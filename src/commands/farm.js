const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

// ── Hàm bổ trợ định dạng thời gian chuyên nghiệp
const formatTime = (ms) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `\`${mins}p ${secs}s\``;
};

// ── :nangcap (TRUNG TÂM CÔNG NGHỆ) ────────────────────────────────
function nangCap(msg, u) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });
    const serverIcon = msg.guild.iconURL({ dynamic: true, size: 1024 });
    const calcCost = lv => Math.pow((lv || 0) + 1, 2) * 2000;

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🛠️ HỆ THỐNG NÂNG CẤP CÔNG NGHỆ', iconURL: botAvatar })
        .setColor('#E67E22')
        .setThumbnail(botAvatar)
        .setImage(serverIcon)
        .setDescription(
            `> *Nâng tầm hạ tầng để tối ưu hóa sản lượng nông trại của bạn.*\n\n` +
            `🧬 **[1] TỈ LỆ TRỨNG (:upga)**\n` +
            `└ Cấp hiện tại: \`Lv.${u.lvGa || 0}/30\`\n` +
            `└ Chi phí nâng cấp: **${calcCost(u.lvGa).toLocaleString()} 🪙**\n\n` +
            `🌾 **[2] KHO THÓC (:upthoc)**\n` +
            `└ Cấp hiện tại: \`Lv.${u.lvNo || 0}/30\`\n` +
            `└ Chi phí nâng cấp: **${calcCost(u.lvNo).toLocaleString()} 🪙**\n\n` +
            `🐣 **[3] MÁY ẤP TRỨNG (:upaptrung)**\n` +
            `└ Cấp hiện tại: \`Lv.${u.lvAp || 0}/30\`\n` +
            `└ Chi phí nâng cấp: **${calcCost(u.lvAp).toLocaleString()} 🪙**\n\n` +
            `🛡️ *Lưu ý: Giá trị nâng cấp tăng lũy tiến theo cấp độ.*`
        )
        .setFooter({ text: 'Hệ thống tự động đồng bộ sau mỗi lần nâng cấp.' });

    return msg.reply({ embeds: [embed] });
}

// ── :shop (CỬA HÀNG VẬT PHẨM) ──────────────────────────────────────
function shop(msg) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });
    const serverIcon = msg.guild.iconURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🏪 THỊ TRƯỜNG VẬT PHẨM CHICKEN EMPIRE', iconURL: botAvatar })
        .setColor('#F1C40F')
        .setThumbnail(botAvatar)
        .setImage(serverIcon)
        .setDescription(
            `✨ **DANH MỤC TRỨNG GIỐNG**\n` +
            `🛒 **[1]** Gói Trứng Thường: **100 🪙**\n\n` +
            `✨ **DANH MỤC LƯƠNG THỰC**\n` +
            `📦 **[2]** Bao Thóc Nhỏ (100🌾): **5,000 🪙**\n` +
            `📦 **[3]** Bao Thóc Lớn (500🌾): **22,000 🪙**\n` +
            `📦 **[4]** Kho Thóc Dự Trữ (1,000🌾): **40,000 🪙**\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `💡 *Sử dụng lệnh: \`:buy <STT> <Số lượng>\` để giao dịch.*`
        );

    return msg.reply({ embeds: [embed] });
}

// ── :buy (XỬ LÝ GIAO DỊCH) ────────────────────────────────────────
async function buy(msg, u, saveData) {
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });
    const args = msg.content.split(' ');
    const itemNum = parseInt(args[1]);
    const quantity = parseInt(args[2]) || 1;

    if (isNaN(itemNum) || quantity <= 0) return msg.reply('❌ **Sai cú pháp!** Hãy dùng: `:buy <STT> <Số lượng>`');

    const ITEMS = {
        1: { name: 'Trứng Thường', price: 100 },
        2: { name: '100 Thóc', price: 5000, value: 100 },
        3: { name: '500 Thóc', price: 22000, value: 500 },
        4: { name: '1000 Thóc', price: 40000, value: 1000 },
    };

    const item = ITEMS[itemNum];
    if (!item) return msg.reply('❌ **Món đồ không tồn tại trên kệ hàng!**');

    const totalCost = item.price * quantity;
    if (u.coins < totalCost) return msg.reply(`❌ **Số dư không đủ!** Bạn cần thêm \`${(totalCost - u.coins).toLocaleString()}\` Coins.`);

    u.coins -= totalCost;
    if (itemNum === 1) u.trung.thuong += quantity;
    else u.thoc += item.value * quantity;

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '✅ GIAO DỊCH HOÀN TẤT', iconURL: botAvatar })
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📦 **Sản phẩm:** \`${quantity}x ${item.name}\`\n` +
            `💰 **Tổng chi:** \`${totalCost.toLocaleString()} Coins\`\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `*Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi!*`
        )
        .setColor('#2ECC71')
        .setThumbnail(botAvatar);

    return msg.reply({ embeds: [embed] });
}

// ── HÀM BỔ TRỢ TÍNH TOÁN LÚA CHÍN ──
function getReadyThoc(u, now) {
    if (!u.isTrongLua) return 0;
    const totalPossible = u.maxVuMua || 0; 
    const alreadyTaken = u.thocDaThu || 0; 
    const remainingInSoil = Math.max(0, totalPossible - alreadyTaken); 

    const timePassedMs = now - (u.lastTrong || 0);
    const minutesPassed = Math.floor(timePassedMs / (10 * 60 * 1000));
    const newlyRipened = minutesPassed * 100; 

    return Math.min(newlyRipened, remainingInSoil);
}

// ── :ruong (GIAO DIỆN QUẢN LÝ ĐIỀN TRANG) ─────────────────────────
function ruong(msg, u) {
    if (!u) return;
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });
    const now = Date.now();
    const thocReady = getReadyThoc(u, now);
    const alreadyTaken = u.thocDaThu || 0;
    const totalPossible = u.maxVuMua || 0;

    let status, color, progress;
    if (!u.isTrongLua) {
        status = '📭 **ĐẤT HOANG**\nĐất đang nghỉ ngơi, hãy gieo hạt ngay!';
        color = '#7F8C8D';
        progress = '░░░░░░░░░░ 0%';
    } else {
        const pct = totalPossible > 0 ? Math.min(100, Math.floor(((alreadyTaken + thocReady) / totalPossible) * 100)) : 0;
        const bars = Math.floor(pct / 10);
        progress = '▰'.repeat(bars) + '▱'.repeat(10 - bars) + ` ${pct}%`;
        
        if (alreadyTaken + thocReady >= totalPossible) {
            status = '⚠️ **NGƯNG SINH TRƯỞNG**\nĐất đã cạn kiệt, hãy thu hoạch vụ mùa này!';
            color = '#E74C3C';
        } else {
            status = thocReady >= 100 ? '🌾 **SẴN SÀNG THU HOẠCH**' : '🌱 **ĐANG PHÁT TRIỂN**';
            color = thocReady >= 100 ? '#F1C40F' : '#2ECC71';
        }
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: `🌾 ĐIỀN TRANG CỦA ${msg.author.username.toUpperCase()}`, iconURL: msg.author.displayAvatarURL() })
        .setColor(color)
        .setThumbnail(botAvatar)
        .setImage(msg.guild.iconURL({ dynamic: true, size: 1024 }))
        .setDescription(
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📜 **TRẠNG THÁI**: ${status}\n` +
            `💰 **LÚA ĐÃ CHÍN**: \`${thocReady.toLocaleString()}\` Thóc\n` +
            `📊 **TIẾN ĐỘ VỤ**: \`${progress}\`\n\n` +
            `📦 **ĐÃ THU HOẠCH**: \`${alreadyTaken.toLocaleString()} / ${totalPossible.toLocaleString()}\` Thóc\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏗️ **HẠ TẦNG**: Kho Cấp ${u.lvNo || 0}\n` +
            `⚡ **HIỆU SUẤT**: \`100 Thóc / 10 Phút\``
        )
        .setFooter({ text: 'Dùng :tronglua [số lượng] để bắt đầu vụ mới!' });

    return msg.reply({ embeds: [embed] });
}

// ── :tronglua (KHỞI TẠO VỤ MÙA) ────────────────────────────────────
async function trongLua(msg, u, saveData, now) {
    if ((u.lvGa || 0) < 4) return msg.reply('❌ **Quyền hạn thấp!** Cần `Cấp độ Gà 4` để trồng trọt.');
    if (u.isTrongLua) return msg.reply('⚠️ **Cảnh báo!** Đất đang bận, hãy thu hoạch xong vụ cũ.');

    const args = msg.content.split(' ');
    const amountToSow = parseInt(args[1]);

    if (!amountToSow || amountToSow <= 0) return msg.reply('❓ **Thiếu tham số!** Ví dụ: `:tronglua 500`.');

    if (u.thoc < amountToSow) return msg.reply(`❌ **Kho rỗng!** Bạn chỉ còn \`${u.thoc.toLocaleString()}\` thóc.`);

    const maxSowLimit = 1000 + (u.lvNo || 0) * 500; 
    if (amountToSow > maxSowLimit) return msg.reply(`⚠️ **Quá tải!** Kho chỉ chịu được tối đa \`${maxSowLimit.toLocaleString()}\` thóc.`);

    u.thoc -= amountToSow;
    u.lastTrong = now;
    u.isTrongLua = true;
    u.thocDaThu = 0; 
    u.maxVuMua = amountToSow * 3;

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setTitle('🌱 KHAI HỎA VỤ MÙA')
        .setThumbnail(msg.client.user.displayAvatarURL())
        .setDescription(
            `✅ **Gieo hạt thành công!**\n\n` +
            `🔹 Số lượng gieo: \`${amountToSow.toLocaleString()}\` Thóc\n` +
            `🔹 Kỳ vọng thu hoạch: \`${u.maxVuMua.toLocaleString()}\` Thóc\n\n` +
            `*Hãy quay lại sau 10 phút để nhận đợt lúa chín đầu tiên!*`
        )
        .setColor('#3498DB');

    return msg.reply({ embeds: [embed] });
}

// ── :thuhoach (GẶT HÁI THÀNH QUẢ) ──────────────────────────────────
async function thuHoach(msg, u, saveData, now) {
    if (!u.isTrongLua) return msg.reply('❌ **Không có gì để hái!** Hãy gieo hạt trước.');
    
    const thocReady = getReadyThoc(u, now);
    if (thocReady < 100) return msg.reply('⏳ **Chưa chín!** Cần ít nhất \`100\` lúa chín để thu hoạch.');

    u.thoc += thocReady;
    u.thocDaThu = (u.thocDaThu || 0) + thocReady;
    u.lastTrong = now;

    let resultMsg = `💰 Chúc mừng! Bạn đã thu hoạch được **+${thocReady.toLocaleString()} Thóc**!`;

    if (u.thocDaThu >= (u.maxVuMua || 0)) {
        u.isTrongLua = false;
        u.thocDaThu = 0;
        u.maxVuMua = 0;
        resultMsg += `\n✨ **Vụ mùa đã khép lại rực rỡ!**`;
    }

    await saveData(msg.author.id);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎊 VỤ MÙA THẮNG LỢI', iconURL: msg.author.displayAvatarURL() })
        .setThumbnail(msg.client.user.displayAvatarURL())
        .setDescription(resultMsg)
        .setColor('#F1C40F')
        .setFooter({ text: 'Kiểm tra điền trang bằng lệnh :ruong' });

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
