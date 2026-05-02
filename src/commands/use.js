const { GA_LIST } = require('../../config/constants');
const { EmbedBuilder } = require('discord.js');

// Hàm tính độ tương đồng cải tiến
function getSimilarity(s1, s2) {
    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

    const set1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) set1.add(s1.substring(i, i + 2));
    const set2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) set2.add(s2.substring(i, i + 2));

    let intersection = 0;
    for (const biten of set1) {
        if (set2.has(biten)) intersection++;
    }
    
    // Dice's Coefficient
    return (2 * intersection) / (set1.size + set2.size);
}

module.exports = async function cmdUse(msg, u, saveData) {
    // Lấy toàn bộ phần văn bản sau lệnh .use để xử lý tên có dấu cách
    const inputName = msg.content.split(/\s+/).slice(1).join(' ').toLowerCase();

    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
    if (!inputName) return msg.reply('❌ Bạn muốn dùng vật phẩm gì? Ví dụ: `.use ve`');

    const items = [
        { key: 've_restart', name: 'Vé Restart 🎟️', color: '#3498DB', aliases: ['ve', 'restart'] },
        { key: 'trung_god',  name: 'Trứng God 🥚',  color: '#F1C40F', aliases: ['trung', 'god'] },
        { key: 'hop_bi_an',  name: 'Hộp Bí Ẩn 🎁',  color: '#9B59B6', aliases: ['hop', 'bi an', 'qua'] }
    ];

    let bestMatch = null;
    let maxScore = 0;

    for (const item of items) {
        // Kiểm tra khớp trực tiếp (Ưu tiên cao nhất)
        if (item.key === inputName || item.aliases.includes(inputName)) {
            maxScore = 1;
            bestMatch = item;
            break;
        }

        // Tính điểm tương đồng với key, tên gốc và các bí danh (aliases)
        const targets = [item.key, item.key.replace(/_/g, ' '), ...item.aliases];
        for (const target of targets) {
            const score = getSimilarity(inputName, target);
            if (score > maxScore) {
                maxScore = score;
                bestMatch = item;
            }
        }
    }

    // Ngưỡng 0.65 cho chuỗi dài, nhưng nếu gõ đúng alias thì đã là 1.0
    const itemKey = (maxScore >= 0.5) ? bestMatch.key : null; 

    if (!itemKey || !u.inventory[itemKey] || u.inventory[itemKey] <= 0)
        return msg.reply(`❌ Không tìm thấy vật phẩm nào khớp với "${inputName}"!`);

    // ── PHẦN LOGIC XỬ LÝ (Giữ nguyên như cũ của bạn) ─────────────────
    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎒 HỆ THỐNG SỬ DỤNG VẬT PHẨM', iconURL: msg.author.displayAvatarURL() })
        .setTitle(`✨ KÍCH HOẠT THÀNH CÔNG: ${bestMatch.name} ✨`)
        .setColor(bestMatch.color)
        .setFooter({ text: `Độ chính xác nhận diện: ${Math.round(maxScore * 100)}%` })
        .setTimestamp();

    if (itemKey === 've_restart') {
        if (!u.dangAp?.length) return msg.reply('❌ Máy ấp đang trống!');
        u.inventory.ve_restart -= 1;
        u.dangAp.forEach(t => { t.finishAt = Date.now(); });
        embed.setDescription('> 🎟️ **PHÉP MÀU THỜI GIAN!**\n> Trứng đã sẵn sàng nở ngay lập tức.');
    } 
    else if (itemKey === 'trung_god') {
        u.inventory.trung_god -= 1;
        const pool = GA_LIST.filter(g => g.rarity.includes('Legendary'));
        const selected = pool[Math.floor(Math.random() * pool.length)];
        u.gaCon.push({ ...selected, id: Date.now(), locked: false });
        embed.setDescription(`> 🥚 **GIÁNG TRẦN!**\n> Bạn nhận được gà: **${selected.name}**!`);
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
        embed.setDescription(`> 🎁 **BẤT NGỜ!**\n> ${giftText}`);
    }

    await saveData(msg.author.id);
    return msg.reply({ embeds: [embed] });
};
