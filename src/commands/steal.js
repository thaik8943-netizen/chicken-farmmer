const { EmbedBuilder } = require('discord.js');
const { formatTime } = require('../utils/helpers');

module.exports = async function cmdSteal(msg, u, data, saveData, now) {
    const target = msg.mentions.users.first();
    if (!target || target.id === msg.author.id) return msg.reply('❌ Hãy tag người bạn muốn trộm!');

    const enemy       = data[target.id];
    const cooldown    = 2 * 60 * 60 * 1000;

    if (u.lastSteal && now - u.lastSteal < cooldown) {
        return msg.reply(`⏳ Bạn đang bị truy nã! Hãy trốn thêm **${formatTime(cooldown - (now - u.lastSteal))}** nữa.`);
    }

    if (!enemy || (enemy.gaCon && enemy.gaCon.length <= 1)) return msg.reply('❌ Đối phương chỉ còn 1 con gà duy nhất!');
    const stealable = enemy.gaCon.filter(g => !g.locked);
    if (!stealable.length) return msg.reply('❌ Đối phương đã khóa tất cả gà!');

    u.lastSteal = now;
    // Chỉnh sửa 1: Tạo mã 4 số (từ 1000 đến 9999)
    const secret   = Math.floor(1000 + Math.random() * 9000).toString();
    let attempts   = [];

    const generateEmbed = (isFinished = false, statusText = '') => {
        let desc = '🕵️ **HỆ THỐNG BẺ KHÓA AN NINH (4 SỐ)**\n🟢: Đúng | 🟡: Sai chỗ | 🔴: Sai số\n\n**Lịch sử:**\n';
        desc += attempts.length
            ? attempts.map((a, i) => `Lượt ${i + 1}: \`${a.guess}\` ➔ ${a.result}`).join('\n')
            : '_Chưa có lượt đoán nào..._';

        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle(isFinished ? '🏁 KẾT THÚC VỤ TRỘM' : '🔐 ĐANG BẺ KHÓA...')
                    .setDescription(desc + `\n\n${statusText}`)
                    .setColor(isFinished ? (statusText.includes('THÀNH CÔNG') ? '#2ECC71' : '#E74C3C') : '#F1C40F')
                    .setFooter({ text: isFinished ? 'Trò chơi kết thúc' : `Còn ${5 - attempts.length} lượt | Nhập 4 số!` }),
            ],
        };
    };

    const mainMsg = await msg.reply(generateEmbed());

    const coll = msg.channel.createMessageCollector({
        // Chỉnh sửa 2: Đổi Regex kiểm tra từ {5} thành {4}
        filter: m => m.author.id === msg.author.id && /^\d{4}$/.test(m.content),
        time: 60000, max: 5,
    });

    coll.on('collect', async m => {
        const guess    = m.content;
        const secretArr = secret.split('');
        const guessArr  = guess.split('');
        const resultArr = Array(4).fill('🔴'); // Chỉnh sửa 3: Mảng kết quả 4 ô

        try { await m.delete(); } catch {}

        // Vòng lặp so sánh đúng vị trí (Xanh)
        for (let i = 0; i < 4; i++) {
            if (guessArr[i] === secretArr[i]) {
                resultArr[i] = '🟢'; secretArr[i] = null; guessArr[i] = null;
            }
        }
        // Vòng lặp so sánh sai vị trí (Vàng)
        for (let i = 0; i < 4; i++) {
            if (guessArr[i] !== null) {
                const idx = secretArr.indexOf(guessArr[i]);
                if (idx !== -1) { resultArr[i] = '🟡'; secretArr[idx] = null; }
            }
        }

        attempts.push({ guess, result: resultArr.join('') });

        if (guess === secret) {
            const s = stealable[Math.floor(Math.random() * stealable.length)];
            enemy.gaCon = enemy.gaCon.filter(g => g.id !== s.id);
            u.gaCon.push(s);
            await saveData(msg.author.id);
            await saveData(target.id);
            coll.stop();
            return mainMsg.edit(generateEmbed(true, `🎊 **THÀNH CÔNG!**\nMã đúng: \`${secret}\` 🟢🟢🟢🟢\nBạn đã trộm được **${s.name}**!`));
        }

        if (attempts.length >= 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            coll.stop();
            return mainMsg.edit(generateEmbed(true, `🚨 **THẤT BẠI!**\nMã đúng là: \`${secret}\` 🟢🟢🟢🟢\nBạn bị phạt 200 Coins.`));
        }

        mainMsg.edit(generateEmbed());
    });

    coll.on('end', async (_, reason) => {
        if (reason === 'time' && attempts.length < 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            mainMsg.edit(generateEmbed(true, `⏰ **HẾT THỜI GIAN!**\nMã: \`${secret}\` 🟢🟢🟢🟢\nBạn đứng hình quá lâu nên bị tóm!`));
        }
    });
};
