const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = async function cmdDaga(msg, u1, data, saveData) {
    const p1 = msg.author;
    const p2 = msg.mentions.users.first();
    const botAvatar = msg.client.user.displayAvatarURL({ dynamic: true }); // Lấy ảnh đại diện của Bot

    if (!p2 || p2.id === p1.id || p2.bot) return msg.reply('❌ Bạn cần tag một người chơi khác để thách đấu!');

    const u2 = data[p2.id];
    if (!u2?.started)      return msg.reply('❌ Đối thủ chưa bắt đầu hành trình nuôi gà!');
    if (!u1.equippedGa || !u2.equippedGa) return msg.reply('❌ Cả hai đều phải trang bị gà chiến (`:equip`) trước khi đá!');
    if (u1.coins < 200 || u2.coins < 200) return msg.reply('❌ Cả hai cần tối thiểu 200 Xu để đặt cược!');

    // --- DECOR: LỜI THÁCH ĐẤU ---
    const challengeEmbed = new EmbedBuilder()
        .setAuthor({ name: '⚔️ ĐẤU TRƯỜNG SINH TỬ', iconURL: botAvatar })
        .setTitle('LỜI KHIÊU CHIẾN ĐÃ GỬI!')
        .setDescription(
            `🔥🔥 **SỬ THI ĐẠI CHIẾN** 🔥🔥\n\n` +
            `🔴 **Phe Công:** <@${p1.id}> (Chiến kê: \`${u1.equippedGa.name}\`)\n` +
            `🔵 **Phe Thủ:** <@${p2.id}> (Chiến kê: \`${u2.equippedGa.name}\`)\n\n` +
            `💰 **Mức cược:** \`200 Xu\`\n` +
            `🎁 **Giải thưởng:** \`200 Thóc\` & \`100 Xu\` cho kẻ sống sót cuối cùng!`
        )
        .setColor('#FF4500')
        .setThumbnail(botAvatar)
        .setFooter({ text: '⏳ Bạn có 2 phút để chấp nhận hoặc sẽ bị coi là kẻ hèn nhát!' });

    const rowAccept = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_daga').setLabel('CHẤP NHẬN').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_daga').setLabel('TỪ CHỐI').setStyle(ButtonStyle.Danger),
    );

    const reply = await msg.reply({ content: `<@${p2.id}>! Bạn có một lời thách đấu!`, embeds: [challengeEmbed], components: [rowAccept] });
    
    const collectorAccept = reply.createMessageComponentCollector({ filter: i => i.user.id === p2.id, time: 120000, max: 1 });

    collectorAccept.on('collect', async i => {
        if (i.customId === 'decline_daga')
            return i.update({ content: `🚫 <@${p2.id}> đã rút lui khỏi trận đấu!`, embeds: [], components: [] });

        let turn = p1.id;
        const scores = { [p1.id]: 0, [p2.id]: 0 };
        const MAX_SCORE = 10; 

        const updateGame = async (interaction, log) => {
            const progress1 = '🟥'.repeat(scores[p1.id]) + '⬛'.repeat(MAX_SCORE - scores[p1.id]);
            const progress2 = '🟦'.repeat(scores[p2.id]) + '⬛'.repeat(MAX_SCORE - scores[p2.id]);

            const gameEmbed = new EmbedBuilder()
                .setAuthor({ name: '🏟️ ĐANG DIỄN RA: TRƯỜNG GÀ RỰC LỬA', iconURL: botAvatar })
                .setThumbnail(botAvatar)
                .setDescription(
                    `📜 **DIỄN BIẾN:**\n> *${log}*\n\n` +
                    `❤️ **SINH LỰC CHIẾN KÊ:**\n` +
                    `🔴 <@${p1.id}>: \`[${progress1}]\` (${scores[p1.id]}/${MAX_SCORE})\n` +
                    `🔵 <@${p2.id}>: \`[${progress2}]\` (${scores[p2.id]}/${MAX_SCORE})`
                )
                .addFields({ name: '⚡ LƯỢT TẤN CÔNG', value: `<@${turn}> đang dồn sức!` })
                .setColor(turn === p1.id ? '#FF0000' : '#0000FF')
                .setFooter({ text: "Nhấn 'ĐÁ!' để ra đòn dứt điểm" });

            const rowKick = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kick_action').setLabel('ĐÁ!').setStyle(ButtonStyle.Primary).setEmoji('💥'),
            );
            await interaction.update({ content: '', embeds: [gameEmbed], components: [rowKick] });
        };

        await updateGame(i, `🥊 **TIẾNG CỒNG KHAI CUỘC!** <@${p1.id}> lao vào tấn công trước.`);

        const gameCollector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 300000 });

        gameCollector.on('collect', async gi => {
            if (gi.user.id !== turn) return gi.reply({ content: '⏳ Chưa đến lượt bạn ra đòn!', ephemeral: true });

            const HITS = [
                '💥 **Cú đá hiểm hóc!** Đối phương choáng váng!', 
                '⚡ **Phản xạ thần sầu!** Gà của bạn tung cú đá móc cực đỉnh!', 
                '🔥 **Tuyệt kỹ phi hành!** Đòn đánh khiến khán giả hò reo!',
                '⚔️ **Xuyên phá!** Cú mổ chí mạng vào đối phương!'
            ];
            const MISSES = [
                '🌬️ **Hụt rồi!** Con gà vừa đá vào không khí.', 
                '💨 **Quá chậm!** Đối thủ đã nhanh chân né được.', 
                '🥴 **Mất đà!** Gà của bạn đá trượt và suýt ngã khỏi sàn.',
                '🛡️ **Bị chặn đứng!** Đối phương đã phòng thủ quá chắc chắn!'
            ];

            const isHit = Math.random() < 0.45; 
            const log = isHit ? HITS[Math.floor(Math.random() * HITS.length)] : MISSES[Math.floor(Math.random() * MISSES.length)];
            
            if (isHit) scores[turn]++;

            if (scores[turn] >= MAX_SCORE) {
                gameCollector.stop();
                const winnerId = turn;
                const loserId  = turn === p1.id ? p2.id : p1.id;
                const winU = data[winnerId];
                const loseU = data[loserId];

                winU.thoc += 200; 
                winU.coins += 100;
                loseU.coins -= 200;
                if (loseU.coins < 0) loseU.coins = 0; 

                await Promise.all([saveData(winnerId), saveData(loserId)]);

                const winEmbed = new EmbedBuilder()
                    .setAuthor({ name: '🏆 VINH QUANG THUỘC VỀ KẺ MẠNH', iconURL: botAvatar })
                    .setTitle('HẠ MÀN TRẬN ĐẤU!')
                    .setDescription(
                        `Vương miện đã tìm thấy chủ nhân: <@${winnerId}>!\n\n` +
                        `✨ **THƯỞNG CHIẾN THẮNG:**\n` +
                        `> 🌾 \`+200 Thóc\`\n` +
                        `> 🪙 \`+100 Xu\`\n\n` +
                        `🚑 **HÌNH PHẠT BẠI TRẬN:**\n` +
                        `> <@${loserId}> đã gục ngã và đánh mất \`200 Xu\`.`
                    )
                    .setThumbnail(botAvatar)
                    .setColor('#FFD700')
                    .setFooter({ text: 'BXH đã cập nhật điểm số mới!' });

                return gi.update({ embeds: [winEmbed], components: [] });
            }

            turn = turn === p1.id ? p2.id : p1.id;
            await updateGame(gi, log);
        });

        gameCollector.on('end', (_, reason) => {
            if (reason === 'time') reply.edit({ content: '⏰ Trận đấu đã kéo dài quá lâu và bị hủy bởi trọng tài!', embeds: [], components: [] });
        });
    });

    collectorAccept.on('end', (_, reason) => {
        if (reason === 'time') reply.edit({ content: '⏰ Hết thời gian chờ! Kẻ bị thách đấu quá sợ hãi nên không dám ra mặt.', embeds: [], components: [] });
    });
};
