const { cleanText, similarity } = require('../utils/helpers');
const { formatTime }            = require('../utils/helpers');

// ── :sellga ──────────────────────────────────────────────────────
async function sellGa(msg, u, saveData) {
    if (!u) return msg.reply('❌ Bạn chưa có trang trại!');

    const rawInput = msg.content.split(' ').slice(1).join(' ');
    if (!rawInput) return msg.reply('❌ Nhập tên hoặc hệ gà muốn bán!');

    const inputClean = cleanText(rawInput);
    const allMatches = u.gaCon.filter(g =>
        similarity(cleanText(g.rarity), inputClean) >= 0.8 ||
        similarity(cleanText(g.name),   inputClean) >= 0.8
    );

    if (!allMatches.length)
        return msg.reply(`❌ Không tìm thấy gà nào khớp với "**${rawInput}**".`);

    const canSell    = allMatches.filter(g => !g.locked);
    const lockedCount = allMatches.length - canSell.length;

    if (!canSell.length) return msg.reply('🛡️ Những con gà bạn muốn bán đều đang **KHÓA**.');

    const totalMoney = canSell.reduce((s, g) => s + (g.price || 10), 0);
    const sellIds    = new Set(canSell.map(g => g.id));
    u.gaCon  = u.gaCon.filter(g => !sellIds.has(g.id));
    u.coins += totalMoney;

    await saveData(msg.author.id);

    let response = `💰 Đã bán **${canSell.length}** gà khớp với "**${rawInput}**". Thu về: **${totalMoney.toLocaleString()} Xu**.`;
    if (lockedCount) response += `\n⚠️ Đã giữ lại **${lockedCount}** con đang khóa.`;
    return msg.reply(response);
}

// ── :selltrung ───────────────────────────────────────────────────
async function sellTrung(msg, u, saveData) {
    if (!u) return msg.reply('❌ Bạn chưa có trang trại!');

    const args    = msg.content.split(' ');
    const loai    = args[1];
    const inputSl = args[2];
    const GIA     = { thuong: 10, bac: 50, vang: 200 };

    if (!loai || !GIA[loai])
        return msg.reply('❌ Cú pháp: `:selltrung <thuong/bac/vang> <số lượng hoặc all>`');

    let sl = inputSl?.toLowerCase() === 'all' ? (u.trung[loai] || 0) : parseInt(inputSl);

    if (isNaN(sl) || sl <= 0) return msg.reply(`❌ Nhập số lượng cụ thể hoặc \`all\` để bán trứng ${loai}!`);
    if ((u.trung[loai] || 0) < sl) return msg.reply(`❌ Không đủ trứng **${loai}** (Hiện có: ${u.trung[loai] || 0}).`);

    const tienThu    = sl * GIA[loai];
    u.trung[loai]   -= sl;
    u.coins          = (u.coins || 0) + tienThu;

    await saveData(msg.author.id);
    return msg.reply(`💰 Bán **${sl.toLocaleString()} trứng ${loai}** → **${tienThu.toLocaleString()} Coins**`);
}

// ── :daily ───────────────────────────────────────────────────────
async function daily(msg, u, saveData, now) {
    const CD = 7200000;
    if (now - u.lastDaily < CD) {
        const left    = CD - (now - u.lastDaily);
        const minutes = Math.floor(left / 60000);
        const seconds = Math.floor((left % 60000) / 1000);
        return msg.reply(`⏳ Bạn đã điểm danh rồi! Quay lại sau **${minutes} phút ${seconds} giây**.`);
    }

    u.thoc      = (u.thoc || 0) + 500;
    u.lastDaily = now;
    await saveData(msg.author.id);
    return msg.reply('🌾 **Chúc mừng!** Bạn đã nhận **500 Thóc** cho ngày hôm nay.');
}

// ── :lockga / :unlockga ──────────────────────────────────────────
async function lockGa(msg, u, saveData) {
    const isLock   = msg.content.startsWith(':lockga');
    const rawInput = msg.content.split(' ').slice(1).join(' ');

    if (!rawInput)
        return msg.reply(`❌ Cú pháp: \`:${isLock ? 'lockga' : 'unlockga'} <hệ hoặc tên gà>\``);

    const inputClean   = cleanText(rawInput);
    const validRarities = ['common', 'rare', 'epic', 'legendary'];
    let count = 0;

    u.gaCon.forEach(g => {
        const rc = cleanText(g.rarity);
        const nc = cleanText(g.name);
        const match =
            (validRarities.includes(inputClean) && rc.includes(inputClean)) ||
            similarity(nc, inputClean) >= 0.8;
        if (match) { g.locked = isLock; count++; }
    });

    if (!count) return msg.reply(`❌ Không tìm thấy gà nào khớp với "**${rawInput}**".`);

    await saveData(msg.author.id);
    const action = isLock ? '🔒 Đã khóa' : '🔓 Đã mở khóa';
    return msg.reply(`${action} thành công **${count}** con gà khớp với "**${rawInput}**".`);
}

module.exports = { sellGa, sellTrung, daily, lockGa };
