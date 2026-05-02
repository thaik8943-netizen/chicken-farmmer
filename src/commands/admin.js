const { ADMIN_ID } = require('../../config/constants');

module.exports = async function cmdAdmin(msg, _u, data, saveData) {
    if (msg.author.id !== ADMIN_ID) return msg.reply('❌ Quyền lực này không thuộc về bạn!');

    const args       = msg.content.split(' ');
    const targetUser = msg.mentions.users.first();
    const typeOrName = args[2]?.toLowerCase();
    const r          = data[targetUser?.id];

    if (!targetUser || !r)
        return msg.reply('❌ Cú pháp không hợp lệ hoặc người dùng chưa khởi tạo trang trại!');

    // ── Tặng vật phẩm cơ bản ─────────────────────────────────────
    if (['xu', 'thoc', 'thuong', 'bac', 'vang'].includes(typeOrName)) {
        const amt = parseInt(args[3]);
        if (isNaN(amt) || amt <= 0) return msg.reply('❌ Vui lòng nhập số lượng hợp lệ!');

        if (typeOrName === 'xu')         r.coins += amt;
        else if (typeOrName === 'thoc')  r.thoc  += amt;
        else                             r.trung[typeOrName] = (r.trung[typeOrName] || 0) + amt;

        await saveData(targetUser.id);
        return msg.reply(`🎁 Đã tặng **${amt.toLocaleString()} ${typeOrName}** cho <@${targetUser.id}>!`);
    }

    // ── Tặng gà thiết kế riêng ────────────────────────────────────
    const rarity = args[3];
    const hp     = parseInt(args[4]);
    const atk    = parseInt(args[5]);
    const price  = parseInt(args[6]);
    const amt    = parseInt(args[7]) || 1;

    if (!typeOrName || !rarity || isNaN(hp) || isNaN(atk) || isNaN(price))
        return msg.reply(
            '❌ **Sai cú pháp!**\n' +
            '1️⃣ Tặng vật phẩm: `:give @user xu/thoc/thuong/bac/vang <số_lượng>`\n' +
            '2️⃣ Tặng gà: `:give @user <tên_gà> <độ_hiếm> <máu> <atk> <giá> <số_lượng>`'
        );

    const cleanName = typeOrName.replace(/_/g, ' ');
    for (let i = 0; i < amt; i++) {
        r.gaCon.push({
            id:     Date.now() + i,
            name:   cleanName,
            rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
            hp, atk, price,
            locked: false,
        });
    }

    await saveData(targetUser.id);
    return msg.reply(`🎁 **QUÀ ĐẶC BIỆT!**\nĐã tặng **${amt}** con **${cleanName}** cho <@${targetUser.id}> thành công!`);
};
