const { GA_LIST } = require('../../config/constants');

module.exports = async function cmdUse(msg, u, saveData) {
    const args    = msg.content.split(' ');
    const itemKey = args[1]?.toLowerCase();

    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
    if (!itemKey || !u.inventory[itemKey] || u.inventory[itemKey] <= 0)
        return msg.reply('❌ Bạn không có vật phẩm này!');

    if (itemKey === 've_restart') {
        if (!u.dangAp?.length) return msg.reply('❌ Máy ấp đang trống!');
        u.inventory.ve_restart -= 1;
        u.dangAp.forEach(t => { t.finishAt = Date.now(); });
        await saveData(msg.author.id);
        return msg.reply('🎟️ **VÉ RESTART KÍCH HOẠT!** Trứng đã sẵn sàng nở.');
    }

    if (itemKey === 'trung_god') {
        u.inventory.trung_god -= 1;
        const pool = GA_LIST.filter(g => g.rarity.includes('Legendary'));
        const selected = pool[Math.floor(Math.random() * pool.length)];
        u.gaCon.push({ ...selected, id: Date.now(), locked: false });
        await saveData(msg.author.id);
        return msg.reply(`✨ Trứng God đã nở ra **${selected.name}**!`);
    }

    if (itemKey === 'hop_bi_an') {
        u.inventory.hop_bi_an -= 1;
        if (Math.random() < 0.5) {
            const nhan = Math.floor(Math.random() * 81) + 20;
            u.thoc += nhan;
            msg.reply(`🌾 Bạn nhận được **${nhan} Thóc**!`);
        } else {
            const nhan = Math.floor(Math.random() * 25001) + 5000;
            u.coins += nhan;
            msg.reply(`💰 Bạn nhận được **${nhan.toLocaleString()} Xu**!`);
        }
        await saveData(msg.author.id);
    }
};
