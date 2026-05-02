const {
    EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
    StringSelectMenuBuilder,
} = require('discord.js');

module.exports = async function cmdTrade(msg, _u, data, saveData) {
    const target = msg.mentions.users.first();
    if (!target || target.id === msg.author.id || target.bot)
        return msg.reply('❌ Tag người chơi bạn muốn giao dịch!');

    const u1 = data[msg.author.id];
    const u2 = data[target.id];
    if (!u2 || !u2.started) return msg.reply('❌ Đối phương chưa bắt đầu chơi!');

    const tradeData = {
        [msg.author.id]: { items: [], coins: 0, thoc: 0, confirmed: false },
        [target.id]:     { items: [], coins: 0, thoc: 0, confirmed: false },
    };

    const generateEmbed = () => {
        const createField = (id) => {
            const d = tradeData[id];
            return `\`\`\`yaml\n💰 Xu:     ${d.coins.toLocaleString()}\n🌾 Thóc:   ${d.thoc.toLocaleString()}\n🛖 Chuồng: ${d.items.length ? d.items.map(g => g.name).join(', ') : 'Trống'}\n--------------------------\n${d.confirmed ? '✅ TRẠNG THÁI: ĐÃ KÝ' : '⏳ TRẠNG THÁI: CHỜ...'}\n\`\`\``;
        };
        return new EmbedBuilder()
            .setTitle('🤝 TRUNG TÂM GIAO DỊCH CHIẾN KÊ 🤝')
            .setDescription('> *Cẩn thận trong từng giao kèo, chuồng gà của bạn đang nằm trên bàn đàm phán!*')
            .setColor('#E67E22')
            .addFields(
                { name: `🔏 CHỦ CHUỒNG: ${msg.author.username}`, value: createField(msg.author.id), inline: true },
                { name: `🔏 CHỦ CHUỒNG: ${target.username}`,     value: createField(target.id),     inline: true },
            )
            .setTimestamp()
            .setFooter({ text: 'Hệ thống bảo mật chuồng gà 🐔' });
    };

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('trade_ga')     .setLabel('🛖 VÀO CHUỒNG').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('trade_xu')     .setLabel('🪙 GỬI XU')    .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_thoc')   .setLabel('🌾 GỬI THÓC')  .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_confirm').setLabel('KÝ TÊN (CHỐT)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('trade_cancel') .setLabel('HỦY KÈO')      .setStyle(ButtonStyle.Danger),
    );

    const tradeMsg = await msg.reply({ embeds: [generateEmbed()], components: [mainRow] });
    const collector = tradeMsg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id && i.user.id !== target.id)
            return i.reply({ content: 'Đừng xem trộm chuồng gà nhà người khác chứ!', ephemeral: true });

        const myTrade = tradeData[i.user.id];
        const myDb    = data[i.user.id];

        if (myTrade.confirmed && i.customId !== 'trade_cancel')
            return i.reply({ content: 'Hợp đồng đã ký tạm thời, không thể sửa đồ!', ephemeral: true });

        // ── Chọn gà ──────────────────────────────────────────────
        if (i.customId === 'trade_ga') {
            if (!myDb.gaCon?.length)
                return i.reply({ content: '⚠️ Chuồng gà của bạn đang trống trơn!', ephemeral: true });

            const available = myDb.gaCon.filter(g => !g.locked && !myTrade.items.some(it => it.id === g.id));
            if (!available.length)
                return i.reply({ content: '⚠️ Không còn gà nào sẵn sàng để giao dịch!', ephemeral: true });

            const selectGa = new StringSelectMenuBuilder()
                .setCustomId('sel_ga_trade')
                .setPlaceholder('🏮 Chọn một chiến kê...')
                .addOptions(available.slice(0, 25).map(g => ({
                    label: `🐥 ${g.name}`,
                    description: `Hạng: ${g.rarity || 'Thường'} | HP: ${g.hp}`,
                    value: g.id.toString(),
                })));

            const subRes = await i.reply({
                content: '### 🛖 CHUỒNG GÀ HIỆN CÓ',
                components: [new ActionRowBuilder().addComponents(selectGa)],
                ephemeral: true, fetchReply: true,
            });
            const sub = subRes.createMessageComponentCollector({ time: 60000 });
            sub.on('collect', async si => {
                if (si.customId !== 'sel_ga_trade') return;
                const chicken = myDb.gaCon.find(g => g.id.toString() === si.values[0]);
                if (chicken) {
                    myTrade.items.push(chicken);
                    tradeData[msg.author.id].confirmed = false;
                    tradeData[target.id].confirmed     = false;
                    await si.update({ content: `✅ Đã đưa **${chicken.name}** ra bàn!`, components: [] });
                    tradeMsg.edit({ embeds: [generateEmbed()] });
                }
            });
            return;
        }

        // ── Chỉnh xu / thóc ──────────────────────────────────────
        if (i.customId === 'trade_xu' || i.customId === 'trade_thoc') {
            const type  = i.customId === 'trade_xu' ? 'coins' : 'thoc';
            const label = type === 'coins' ? 'Xu 🪙' : 'Thóc 🌾';
            const makeBtn = (id, lbl, style, delta) =>
                new ButtonBuilder().setCustomId(`adj_${type}_${delta}`).setLabel(lbl).setStyle(style);

            const row1 = new ActionRowBuilder().addComponents(
                makeBtn(null, '🔼 +100', ButtonStyle.Success, 100),
                makeBtn(null, '🔼 +10',  ButtonStyle.Success, 10),
                makeBtn(null, '🔼 +1',   ButtonStyle.Success, 1),
            );
            const row2 = new ActionRowBuilder().addComponents(
                makeBtn(null, '🔽 -100', ButtonStyle.Danger, -100),
                makeBtn(null, '🔽 -10',  ButtonStyle.Danger, -10),
                makeBtn(null, '🔽 -1',   ButtonStyle.Danger, -1),
            );

            const subRes = await i.reply({
                content: `🛠️ **BẢNG CHỈNH TÀI SẢN**\n> Loại: **${label}**\n> Đang góp: **${myTrade[type].toLocaleString()}**`,
                components: [row1, row2], ephemeral: true, fetchReply: true,
            });
            const sub = subRes.createMessageComponentCollector({ time: 60000 });
            sub.on('collect', async si => {
                const [, subType, amount] = si.customId.split('_');
                const val = parseInt(amount);
                if (myTrade[subType] + val < 0)
                    return si.update({ content: '⚠️ Không thể giảm xuống mức âm!', components: [row1, row2] });
                if (myTrade[subType] + val > myDb[subType])
                    return si.update({ content: `⚠️ Bạn chỉ có ${myDb[subType].toLocaleString()}!`, components: [row1, row2] });
                myTrade[subType] += val;
                tradeData[msg.author.id].confirmed = false;
                tradeData[target.id].confirmed     = false;
                await si.update({ content: `✅ Đã sửa: **${myTrade[subType].toLocaleString()}** ${label}`, components: [row1, row2] });
                tradeMsg.edit({ embeds: [generateEmbed()] });
            });
            return;
        }

        // ── Ký tên ────────────────────────────────────────────────
        if (i.customId === 'trade_confirm') {
            myTrade.confirmed = true;
            if (tradeData[msg.author.id].confirmed && tradeData[target.id].confirmed) {
                const t1 = tradeData[msg.author.id];
                const t2 = tradeData[target.id];

                u1.coins = u1.coins - t1.coins + t2.coins;
                u2.coins = u2.coins - t2.coins + t1.coins;
                u1.thoc  = u1.thoc  - t1.thoc  + t2.thoc;
                u2.thoc  = u2.thoc  - t2.thoc  + t1.thoc;

                t1.items.forEach(it => { u1.gaCon = u1.gaCon.filter(g => g.id !== it.id); u2.gaCon.push(it); });
                t2.items.forEach(it => { u2.gaCon = u2.gaCon.filter(g => g.id !== it.id); u1.gaCon.push(it); });

                await Promise.all([saveData(msg.author.id), saveData(target.id)]);
                collector.stop();
                return i.update({ content: '🎊 **GIAO DỊCH HOÀN TẤT!**', embeds: [generateEmbed()], components: [] });
            }
            return i.update({ embeds: [generateEmbed()] });
        }

        if (i.customId === 'trade_cancel') {
            collector.stop();
            return i.update({ content: `✖️ Giao dịch đã bị hủy bởi **${i.user.username}**.`, embeds: [], components: [] });
        }
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') tradeMsg.edit({ content: '⏳ Hết thời hạn giao kèo (5 phút).', components: [] }).catch(() => {});
    });
};
