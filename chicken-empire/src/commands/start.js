const { GA_LIST } = require('../../config/constants');

module.exports = async function cmdStart(msg, u, saveData) {
    if (u.started) return msg.reply('🌾 Bạn đã có trang trại rồi!');
    u.started = true;
    u.coins   = 500;
    u.thoc    = 1000;
    u.gaCon.push({ ...GA_LIST[0], id: Date.now(), locked: false, hp: 50, price: 10 });
    await saveData(msg.author.id);
    return msg.reply(
        '🎉 **CHÚC MỪNG!** Bạn đã nhận được mảnh đất đầu tiên và **1 con gà mặc định**.\n' +
        '👉 Gõ `:thongtin` để xem trang trại hoặc `:chogaan` để bắt đầu kiếm trứng nhé!'
    );
};
