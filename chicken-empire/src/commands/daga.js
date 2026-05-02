const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = async function cmdDaga(msg, u1, data, saveData) {
    const p1 = msg.author;
    const p2 = msg.mentions.users.first();

    if (!p2 || p2.id === p1.id || p2.bot) return msg.reply('❌ Bạn cần tag một người chơi khác để thách đấu!');

    const u2 = data[p2.id];
    if (!u2?.started)      return msg.reply('❌ Đối thủ chưa bắt đầu hành trình nuôi gà!');
    if (!u1.equippedGa || !u2.equippedGa) return msg.reply('❌ Cả hai đều phải trang bị gà chiến (`:equip`) trước khi đá!');
    if (u1.coins < 200 || u2.coins < 200) return msg.reply('❌ Cả hai cần tối thiểu 200 Xu!');

    const challengeEmbed = new EmbedBuilder()
        .setTitle('⚔️ LỜI THÁCH ĐẤU RỰC LỬA')
        .setDescription(
            `<@${p1.id}> đem chiến kê **${u1.equippedGa.name}** thách đấu **${u2.equippedGa.name}** của <@${p2.id}>!\n\n` +
            `💰 **Mức cược:** Người thua mất **200 Xu**.\n🎁 **Phần thưởng:** **200 Thóc** & **100 Xu** cho người thắng.`
        )
        .setColor('#FF4500')
        .setFooter({ text: 'Bạn có 30 giây để xác nhận!' });

    const rowAccept = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_daga') .setLabel('Chấp Nhận').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_daga').setLabel('Từ Chối')  .setStyle(ButtonStyle.Danger),
    );

    const reply = await msg.reply({ embeds: [challengeEmbed], components: [rowAccept] });
    const collectorAccept = reply.createMessageComponentCollector({ filter: i => i.user.id === p2.id, time: 30000, max: 1 });

    collectorAccept.on('collect', async i => {
        if (i.customId === 'decline_daga')
            return i.update({ content: '🚫 Thách đấu đã bị từ chối.', embeds: [], components: [] });

        let turn   = p1.id;
        const scores = { [p1.id]: 0, [p2.id]: 0 };
        const MAX_SCORE = 3;

        const updateGame = async (interaction, log) => {
            const gameEmbed = new EmbedBuilder()
                .setTitle('🏟️ TRƯỜNG GÀ ĐANG RỰC LỬA')
                .setDescription(
                    `${log}\n\n**Tỉ số:**\n🔴 <@${p1.id}>: ${'⭐'.repeat(scores[p1.id])}${'⚫'.repeat(MAX_SCORE - scores[p1.id])}\n` +
                    `🔵 <@${p2.id}>: ${'⭐'.repeat(scores[p2.id])}${'⚫'.repeat(MAX_SCORE - scores[p2.id])}`
                )
                .addFields({ name: 'Lượt tấn công', value: `⚡ <@${turn}>` })
                .setColor(turn === p1.id ? '#FF0000' : '#0000FF')
                .setFooter({ text: "Nhấn 'ĐÁ!' để ra đòn" });

            const rowKick = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kick_action').setLabel('ĐÁ!').setStyle(ButtonStyle.Primary),
            );
            await interaction.update({ embeds: [gameEmbed], components: [rowKick] });
        };

        await updateGame(i, `🥊 **Trận đấu bắt đầu!** <@${p1.id}> ra đòn trước.`);

        const gameCollector = reply.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

        gameCollector.on('collect', async gi => {
            if (gi.user.id !== turn) return gi.reply({ content: '⏳ Chưa đến lượt bạn!', ephemeral: true });

            const HITS   = ['💥 **Cú đá hiểm hóc!** Một đòn trời giáng vào đầu đối thủ!', '⚡ **Phản xạ nhanh!** Gà của bạn tung cú đá móc cực đỉnh!', '🔥 **Tuyệt kỹ!** Đối phương không kịp né tránh.'];
            const MISSES = ['🌬️ **Hụt rồi!** Con gà vừa đá vào không khí.', '💨 **Quá chậm!** Đối thủ đã nhanh chân né được.', '🥴 **Lạng quạng!** Gà của bạn đá trượt và suýt ngã.'];

            const isHit = Math.random() < 0.5;
            const log   = isHit ? HITS[Math.floor(Math.random() * HITS.length)] : MISSES[Math.floor(Math.random() * MISSES.length)];
            if (isHit) scores[turn]++;

            if (scores[turn] >= MAX_SCORE) {
                gameCollector.stop();
                const winnerId = turn;
                const loserId  = turn === p1.id ? p2.id : p1.id;
                const winU = data[winnerId];
                const loseU = data[loserId];
                winU.thoc   += 200; winU.coins  += 100;
                loseU.coins -= 200;
                await Promise.all([saveData(winnerId), saveData(loserId)]);

                const winEmbed = new EmbedBuilder()
                    .setTitle('🏆 CHIẾN THẮNG VANG DỘI')
                    .setDescription(`Chúc mừng <@${winnerId}>!\n\n🎁 **Thưởng:** +200 Thóc, +100 Xu\n🚑 **Hình phạt:** <@${loserId}> mất 200 Xu.`)
                    .setColor('#FFD700');
                return gi.update({ embeds: [winEmbed], components: [] });
            }

            turn = turn === p1.id ? p2.id : p1.id;
            await updateGame(gi, log);
        });

        gameCollector.on('end', (_, reason) => {
            if (reason === 'time') reply.edit({ content: '⏰ Trận đấu bị hủy do quá lâu!', components: [] });
        });
    });
};
