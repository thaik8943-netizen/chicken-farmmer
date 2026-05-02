module.exports = function cmdProfile(msg, u) {
    const title     = u.coins > 100000 ? '🔱 Huyền Thoại' : u.coins > 10000 ? '💰 Phú Hộ' : '🚜 Nông Dân';
    // BUG FIX: code gốc dùng u.equipped, đúng là u.equippedGa
    const equipped  = u.equippedGa ? `🐔 **${u.equippedGa.name}** [${u.equippedGa.rarity}]` : 'Chưa chọn';

    return msg.reply(
        `🆔 **HỒ SƠ: ${msg.author.username}**\n` +
        `🏅 **Danh hiệu:** ${title}\n` +
        `🛡️ **Đại diện:** ${equipped}\n` +
        `🌾 Thóc: ${u.thoc.toLocaleString()} | 🪙 Coins: ${u.coins.toLocaleString()}\n` +
        `🏗️ Lv Trứng: ${u.lvGa} | Lv Thóc: ${u.lvNo} | Lv Ấp: ${u.lvAp}\n` +
        `🏡 Chuồng: ${u.gaCon.length} con | 🥚 Trứng: T:${u.trung.thuong} B:${u.trung.bac} V:${u.trung.vang}`
    );
};
