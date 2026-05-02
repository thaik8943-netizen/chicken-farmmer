const { getSimilarity } = require('../utils/helpers');

module.exports = async function cmdEquip(msg, u, saveData) {
    const inputName = msg.content.split(' ').slice(1).join(' ');
    if (!inputName) return msg.reply('❌ Cú pháp: `:equip <tên gà>`');
    if (!u?.gaCon?.length) return msg.reply('🏚️ Bạn không có con gà nào trong chuồng!');

    let best = null, maxSim = 0;
    u.gaCon.forEach(ga => {
        const s = getSimilarity(inputName, ga.name);
        if (s > maxSim) { maxSim = s; best = ga; }
    });

    if (maxSim >= 0.65) {
        u.equippedGa = best;
        await saveData(msg.author.id);
        return msg.reply(`✅ Đã nhận diện: 🐔 **${best.name}**\n👉 Đã trang bị thành công!`);
    } else if (maxSim > 0.4) {
        return msg.reply(`❓ Có phải bạn muốn trang bị **${best.name}**? Hãy gõ tên chính xác hơn.`);
    }
    return msg.reply('❌ Không tìm thấy gà nào có tên tương tự trong chuồng!');
};
