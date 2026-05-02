const { GA_LIST } = require('../../config/constants');
const { EmbedBuilder } = require('discord.js');

// Hàm tính độ tương đồng giữa 2 chuỗi
function getSimilarity(s1, s2) {
    const set1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) set1.add(s1.substring(i, i + 2));
    const set2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) set2.add(s2.substring(i, i + 2));

    let intersection = 0;
    for (const biten of set1) {
        if (set2.has(biten)) intersection++;
    }
    const total = set1.size + set2.size;
    return total === 0 ? 0 : (2 * intersection) / total;
}

module.exports = async function cmdUse(msg, u, saveData) {
    const args = msg.content.split(' ');
    const inputName = args[1]?.toLowerCase();

    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
    if (!inputName) return msg.reply('❌ Bạn muốn dùng vật phẩm gì? Ví dụ: `.use ve`');

    // Danh sách vật phẩm đối soát
    const items = [
        { key: 've_restart', name: 'Vé Restart 🎟️', color: '#3498DB' },
        { key: 'trung_god',  name: 'Trứng God 🥚',  color: '#F1C40F' },
        { key: 'hop_bi_an',  name: 'Hộp Bí Ẩn 🎁',  color: '#9B59B6' }
    ];

    // Tìm vật phẩm khớp nhất
    let bestMatch = null;
    let maxScore = 0;

    for (const item of items) {
        const score = Math.max(
            getSimilarity(inputName, item.key),
            getSimilarity(inputName, item.key.replace(/_/g, ' '))
        );
        if (score > maxScore) {
            maxScore = score;
            bestMatch = item;
        }
    }

    // Kiểm tra ngưỡng nhận diện (65%)
    const itemKey = (maxScore >= 0.65) ? bestMatch.key : null;

    if (!itemKey || !u.inventory[itemKey] || u.inventory[itemKey] <= 0)
        return msg.reply('❌ Không tìm thấy vật phẩm này trong kho đồ!');

    // ── LOGIC XỬ LÝ VẬT PHẨM ─────────────────────────────────────
    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎒 HỆ THỐNG SỬ DỤNG VẬT PHẨM', iconURL: msg.author.displayAvatarURL() })
        .setTitle(`✨ KÍCH HOẠT THÀNH CÔNG: ${bestMatch.name} ✨`)
        .setColor(bestMatch.color)
        .setTimestamp();

    if (itemKey === 've_restart') {
        if (!u.dangAp?.length) return msg.reply('❌ Máy ấp đang trống!');
        u.inventory.ve_restart -= 1;
        u.dangAp.forEach(t => { t.finishAt = Date.now(); });
        embed.setDescription('> 🎟️ **PHÉP MÀU THỜI GIAN!**\n> Toàn bộ trứng trong máy ấp đã được gia tốc và sẵn sàng nở ngay lập tức.');
    } 

    else if (itemKey === 'trung_god') {
        u.inventory.trung_god -= 1;
        const pool = GA_LIST.filter(g => g.rarity.includes('Legendary'));
        const selected = pool[Math.floor(Math.random() * pool.length)];
        u.gaCon.push({ ...selected, id: Date.now(), locked: false });
        embed.setDescription(`> 🥚 **SỰ GIÁNG TRẦN THẦN THOẠI!**\n> Trứng God đã nở ra một chiến kê cực phẩm: **${selected.name}**!`);
    } 

    else if (itemKey === 'hop_bi_an') {
        u.inventory.hop_bi_an -= 1;
        let giftText = '';
        if (Math.random() < 0.5) {
            const nhan = Math.floor(Math.random() * 81) + 20;
            u.thoc += nhan;
            giftText = `🌾 Nhận được: **${nhan} Thóc**`;
        } else {
            const nhan = Math.floor(Math.random() * 25001) + 5000;
            u.coins += nhan;
            giftText = `💰 Nhận được: **${nhan.toLocaleString()} Xu**`;
        }
        embed.setDescription(`> 🎁 **PHẦN THƯỞNG BẤT NGỜ!**\n> Bạn vừa khám phá chiếc hộp bí ẩn và nhận được:\n> **${giftText}**`);
    }

    await saveData(msg.author.id);
    return msg.reply({ embeds: [embed] });
};
