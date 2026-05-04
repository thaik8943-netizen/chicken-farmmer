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
    for (const biten of set1) { if (set2.has(biten)) intersection++; }
    return (2 * intersection) / (set1.size + set2.size);
}

module.exports = async function cmdUse(msg, u, saveData) {
    const inputName = msg.content.split(/\s+/).slice(1).join(' ').toLowerCase();
    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
    if (!inputName) return msg.reply('❌ Bạn muốn dùng vật phẩm gì? Ví dụ: `.use god`');

    const items = [
        { key: 've_restart', name: 'Vé Restart 🎟️', color: '#3498DB', aliases: ['ve', 'restart'] },
        { key: 'trung_god',  name: 'Trứng God 🥚',  color: '#F1C40F', aliases: ['trung', 'god'] },
        { key: 'hop_bi_an',  name: 'Hộp Bí Ẩn 🎁',  color: '#9B59B6', aliases: ['hop', 'bi an', 'qua'] }
    ];

    let bestMatch = null;
    let maxScore = 0;

    for (const item of items) {
        if (item.key === inputName || item.aliases.includes(inputName)) {
            maxScore = 1; bestMatch = item; break;
        }
        const targets = [item.key, item.key.replace(/_/g, ' '), ...item.aliases];
        for (const target of targets) {
            const score = getSimilarity(inputName, target);
            if (score > maxScore) { maxScore = score; bestMatch = item; }
        }
    }

    const itemKey = (maxScore >= 0.5) ? bestMatch.key : null; 
    if (!itemKey || !u.inventory[itemKey] || u.inventory[itemKey] <= 0)
        return msg.reply(`❌ Không tìm thấy vật phẩm "${inputName}" trong kho đồ!`);

    const embed = new EmbedBuilder()
        .setAuthor({ name: '🎒 HỆ THỐNG VẬT PHẨM', iconURL: msg.author.displayAvatarURL() })
        .setColor(bestMatch.color)
        .setTimestamp();

    // ── XỬ LÝ VÉ RESTART ─────────────────
    if (itemKey === 've_restart') {
        if (!u.dangAp?.length) return msg.reply('❌ Máy ấp đang trống, không thể dùng vé!');
        u.inventory.ve_restart -= 1;
        u.dangAp.forEach(t => { t.finishAt = Date.now(); });
        embed.setTitle(`✨ KÍCH HOẠT: ${bestMatch.name}`)
             .setDescription('> 🎟️ **PHÉP MÀU THỜI GIAN!**\n> Toàn bộ trứng trong máy đã sẵn sàng nở ngay lập tức.');
    } 
    // ── XỬ LÝ TRỨNG GOD (Nâng cấp ATK/HP) ─────────────────
    else if (itemKey === 'trung_god') {
        u.inventory.trung_god -= 1;
        const pool = GA_LIST.filter(g => g.rarity.includes('Legendary'));
        const g = pool[Math.floor(Math.random() * pool.length)];

        // Chỉ số cực phẩm cho hàng God
        const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const fHp = rand(10000, 20000); // HP khủng
        const fAtk = rand(2000, 4500);  // ATK cực mạnh
        const fPrice = rand(150000, 500000);

        u.gaCon.push({ 
            ...g, id: Date.now() + Math.random(), locked: false, 
            rarity: 'Legendary 🟡', hp: fHp, atk: fAtk, price: fPrice 
        });

        embed.setTitle('✨ THỰC THỂ GIÁNG TRẦN ✨')
             .setDescription(
                `> 🌌 **Hào quang vạn trượng!** Một quả trứng **God** đã vỡ tan...\n` +
                `> Linh hồn huyền thoại **${g.name}** đã chọn ngươi làm chủ nhân!\n\n` +
                `**🔥 THÔNG TIN CHIẾN KÊ 🔥**\n` +
                `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
                `┃ 🏅 Phẩm chất: \`Legendary 🟡\`\n` +
                `┃ ❤️ Máu (HP): \`${fHp.toLocaleString()}\` \n` +
                `┃ ⚔️ Sát thương: \`${fAtk.toLocaleString()}\` \n` +
                `┃ 💰 Giá trị: \`${fPrice.toLocaleString()}\` xu\n` +
                `┗━━━━━━━━━━━━━━━━━━━━━━━━┛`
             );
    } 
    // ── XỬ LÝ HỘP BÍ ẨN ─────────────────
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
        embed.setTitle(`🎁 PHẦN QUỞNG BẤT NGỜ`)
             .setDescription(`> Bạn đã mở Hộp Bí Ẩn và...\n> ${giftText}`);
    }

    await saveData(msg.author.id);
    return msg.reply({ embeds: [embed] });
};
