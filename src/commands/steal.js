const { EmbedBuilder } = require('discord.js');
const { formatTime } = require('../utils/helpers');

module.exports = async function cmdSteal(msg, u, data, saveData, now) {
    const target = msg.mentions.users.first();
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true });

    if (!target || target.id === msg.author.id) return msg.reply('❌ **Lỗi:** Bạn định tự trộm chính mình sao? Hãy tag một mục tiêu!');

    const enemy = data[target.id];
    const cooldown = 2 * 60 * 60 * 1000;

    if (u.lastSteal && now - u.lastSteal < cooldown) {
        return msg.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🚨 ĐANG BỊ TRUY NÃ')
                    .setDescription(`Cảnh sát đang tuần tra khu vực! Hãy ẩn nấp thêm **${formatTime(cooldown - (now - u.lastSteal))}** nữa trước khi bắt đầu phi vụ mới.`)
                    .setColor('#E74C3C')
                    .setThumbnail(botAvatar)
            ]
        });
    }

    if (!enemy || (enemy.gaCon && enemy.gaCon.length <= 1)) return msg.reply('❌ **Phi vụ thất bại:** Chuồng gà này quá nghèo, chỉ còn 1 con duy nhất, không nỡ trộm!');
    const stealable = enemy.gaCon.filter(g => !g.locked);
    if (!stealable.length) return msg.reply('❌ **Cảnh báo:** Hệ thống an ninh của đối phương quá dày đặc (Đã khóa toàn bộ gà)!');

    u.lastSteal = now;
    const secret = Math.floor(1000 + Math.random() * 9000).toString();
    let attempts = [];

    const generateEmbed = (isFinished = false, statusText = '', isSuccess = false) => {
        let desc = `🎭 **MỤC TIÊU:** <@${target.id}>\n`;
        desc += `🔐 **BẢO MẬT:** \`4 CHỮ SỐ\`\n`;
        desc += `⚡ **TÌNH TRẠNG:** ${isFinished ? '`KẾT THÚC`' : '`ĐANG XÂM NHẬP...`'}\n`;
        desc += `━━━━━━━━━━━━━━━━━━━━\n`;
        desc += `📜 **NHẬT KÝ HACKER:**\n`;
        
        desc += attempts.length
            ? attempts.map((a, i) => `\`[Lượt ${i + 1}]\` **${a.guess}** ➔ ${a.result}`).join('\n')
            : '_Đang chờ tín hiệu bẻ khóa..._';

        desc += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        desc += `🟢: Khớp | 🟡: Sai chỗ | 🔴: Không tồn tại\n\n${statusText}`;

        const embed = new EmbedBuilder()
            .setAuthor({ name: '🕶️ PHI VỤ SIÊU ĐẠO CHÍCH', iconURL: botAvatar })
            .setTitle(isFinished ? '🏁 HOÀN TẤT PHI VỤ' : '⌨️ ĐANG GIẢI MÃ FIREWALL...')
            .setDescription(desc)
            .setColor(isFinished ? (isSuccess ? '#2ECC71' : '#FF0000') : '#2F3136')
            .setThumbnail(isFinished ? (isSuccess ? 'https://cdn-icons-png.flaticon.com/512/2311/2311992.png' : 'https://cdn-icons-png.flaticon.com/512/1053/1053077.png') : 'https://cdn-icons-png.flaticon.com/512/2092/2092663.png')
            .setFooter({ text: isFinished ? 'Hệ thống đã ngắt kết nối' : `Bạn còn ${5 - attempts.length} lượt thử cuối cùng!` });

        return { embeds: [embed] };
    };

    const mainMsg = await msg.reply(generateEmbed());

    const coll = msg.channel.createMessageCollector({
        filter: m => m.author.id === msg.author.id && /^\d{4}$/.test(m.content),
        time: 60000, max: 5,
    });

    coll.on('collect', async m => {
        const guess = m.content;
        const secretArr = secret.split('');
        const guessArr = guess.split('');
        const resultArr = Array(4).fill('🔴');

        try { await m.delete(); } catch {}

        for (let i = 0; i < 4; i++) {
            if (guessArr[i] === secretArr[i]) {
                resultArr[i] = '🟢'; secretArr[i] = null; guessArr[i] = null;
            }
        }
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
            return mainMsg.edit(generateEmbed(true, `🎊 **XÂM NHẬP THÀNH CÔNG!**\nMã giải mã: \`${secret}\` ✅\nBạn đã lén mang con gà **${s.name}** ra khỏi chuồng!`, true));
        }

        if (attempts.length >= 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            coll.stop();
            return mainMsg.edit(generateEmbed(true, `🚨 **BỊ PHÁT HIỆN!**\nMã đúng là: \`${secret}\`\nChủ nhà đã thả chó đuổi theo, bạn đánh rơi **200 Coins** khi tháo chạy!`, false));
        }

        mainMsg.edit(generateEmbed());
    });

    coll.on('end', async (_, reason) => {
        if (reason === 'time' && attempts.length < 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            mainMsg.edit(generateEmbed(true, `⏰ **HẾT THỜI GIAN!**\nMã bypass: \`${secret}\`\nBạn đứng hình quá lâu nên hệ thống đã tự động báo động!`, false));
        }
    });
};
