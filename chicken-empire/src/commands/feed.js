module.exports = async function cmdFeed(msg, u, saveData) {
    const args = msg.content.split(' ');
    let sl     = args[1] === 'all' ? Math.floor(u.thoc / 50) : parseInt(args[1]);

    if (isNaN(sl) || sl <= 0) return msg.reply('❌ Cú pháp: `:chogaan <số lượng/all>`');
    if (u.thoc < sl * 50)     return msg.reply('❌ Thiếu thóc!');

    u.thoc -= sl * 50;
    const nhan = { thuong: 0, bac: 0, vang: 0 };

    for (let i = 0; i < sl; i++) {
        const r = Math.random();
        if (r < 0.01)       nhan.vang++;
        else if (r < 0.07)  nhan.bac++;
        else                nhan.thuong++;
    }

    u.trung.thuong += nhan.thuong;
    u.trung.bac    += nhan.bac;
    u.trung.vang   += nhan.vang;

    await saveData(msg.author.id);
    return msg.reply(
        `🌾 Đã dùng **${(sl * 50).toLocaleString()} thóc**.\n` +
        `Thu về: 🥚 ${nhan.thuong} Thường | 🥈 ${nhan.bac} Bạc | 🥇 ${nhan.vang} Vàng`
    );
};
