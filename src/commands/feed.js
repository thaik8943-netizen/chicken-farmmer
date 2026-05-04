const { EmbedBuilder } = require('discord.js');

module.exports = async function cmdFeed(msg, u, saveData) {
    const args = msg.content.split(' ');
    // Tính toán số lượng cho ăn
    let sl = args[1] === 'all' ? Math.floor((u.thoc || 0) / 50) : parseInt(args[1]);

    // Kiểm tra đầu vào
    if (isNaN(sl) || sl <= 0) {
        return msg.reply({ 
            content: '❌ **Sai cú pháp!** Hãy nhập: `:chogaan <số lượng>` hoặc `:chogaan all`' 
        });
    }

    const totalCost = sl * 50;
    if ((u.thoc || 0) < totalCost) {
        return msg.reply({ 
            content: `❌ **Thiếu thóc!** Bạn cần thêm **${(totalCost - u.thoc).toLocaleString()}** thóc nữa để cho ăn **${sl}** lần.` 
        });
    }

    // --- LOGIC TỈ LỆ DỰA TRÊN LVGA ---
    const lvGa = u.lvGa || 0;
    // Mỗi cấp tăng thêm 0.1% tỉ lệ trứng Vàng (Lv30 tăng thêm 3%)
    const bonusVang = (lvGa * 0.1) / 100; 
    // Mỗi cấp tăng thêm 0.3% tỉ lệ trứng Bạc (Lv30 tăng thêm 9%)
    const bonusBac = (lvGa * 0.3) / 100;

    u.thoc -= totalCost;
    const nhan = { thuong: 0, bac: 0, vang: 0 };

    for (let i = 0; i < sl; i++) {
        const r = Math.random();
        // Tính toán tỉ lệ trúng trứng
        if (r < (0.01 + bonusVang)) {
            nhan.vang++;
        } else if (r < (0.07 + bonusVang + bonusBac)) {
            nhan.bac++;
        } else {
            nhan.thuong++;
        }
    }

    // Cập nhật kho trứng
    u.trung.thuong += nhan.thuong;
    u.trung.bac    += nhan.bac;
    u.trung.vang   += nhan.vang;

    await saveData(msg.author.id);

    // --- TRANG TRÍ EMBED SIÊU CẤP ---
    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: `🌾 HOẠT ĐỘNG: CHO GÀ ĂN`, 
            iconURL: msg.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle('🍗 ĐÀN GÀ ĐÃ NO NÊ!')
        .setColor('#E67E22') // Màu cam thóc chín
        .setDescription(
            `> Bạn đã rải **${totalCost.toLocaleString()}** 🌾 thóc cho đàn gà của mình.\n\n` +
            `**📊 THỐNG KÊ THU HOẠCH:**\n` +
            `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
            `┃ 🥇 **Trứng Vàng:** \`${nhan.vang}\` quả\n` +
            `┃ 🥈 **Trứng Bạc:** \`${nhan.bac}\` quả\n` +
            `┃ 🥚 **Trứng Thường:** \`${nhan.thuong}\` quả\n` +
            `┗━━━━━━━━━━━━━━━━━━━━━━━━┛`
        )
        .addFields({ 
            name: `✨ Kỹ năng hiện tại: [ Cấp ${lvGa} ]`, 
            value: `📈 May mắn cộng thêm: \`+${((bonusVang + bonusBac) * 100).toFixed(1)}%\`` 
        })
        .setFooter({ text: `Số dư thóc còn lại: ${(u.thoc).toLocaleString()} 🌾` })
        .setTimestamp();

    return msg.reply({ embeds: [embed] });
};
