const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async function cmdCoop(msg, u) {
    if (!u || !u.gaCon?.length) return msg.reply('🏚️ Chuồng trống hoắc à! Đi ấp trứng đi.');

    let currentFilter = 'ALL';
    let page          = 0;
    const PAGE_SIZE   = 5;

    const buildMsg = (p, filter) => {
        const filtered   = filter === 'ALL' ? u.gaCon : u.gaCon.filter(g => g.rarity.toUpperCase().includes(filter));
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
        const chickens   = filtered.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);

        const list = chickens.length
            ? chickens.map((g, i) => {
                const lock       = g.locked ? '🔒' : '🔓';
                const isEquipped = u.equippedGa?.id === g.id ? " ✅ `[ĐANG DÙNG]`" : '';
                const hp         = g.hp  || 50;
                const atk        = g.atk || Math.floor(hp / 10);
                return (
                    `**${p * PAGE_SIZE + i + 1}. ${g.name}** ${lock}${isEquipped}\n` +
                    `└ ✨ \`${g.rarity}\` | ❤️ \`${hp}\` | 💪 \`${atk}\` | 💰 \`${(g.price || 10).toLocaleString()}\``
                );
            }).join('\n\n')
            : `Không có gà hệ **${filter}** nào.`;

        const embed = new EmbedBuilder()
            .setTitle(`🏡 CHUỒNG GÀ (${filter})`)
            .setDescription(list)
            .setColor(filter === 'LEGENDARY' ? '#F1C40F' : '#3498DB')
            .setFooter({ text: `Trang ${p + 1}/${totalPages} | ${filtered.length} con` });

        const rowFilter = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('filter_ALL')      .setLabel('Tất cả').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_COMMON')   .setLabel('Common').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_RARE')     .setLabel('Rare')  .setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('filter_EPIC')     .setLabel('Epic')  .setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('filter_LEGENDARY').setLabel('Legend').setStyle(ButtonStyle.Danger),
        );
        const rowPage = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('next_page').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(p >= totalPages - 1),
        );

        return { embeds: [embed], components: [rowFilter, rowPage] };
    };

    const chuongMsg = await msg.reply(buildMsg(page, currentFilter));
    const collector = chuongMsg.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 120000 });

    collector.on('collect', async i => {
        if (i.customId.startsWith('filter_')) { currentFilter = i.customId.replace('filter_', ''); page = 0; }
        else if (i.customId === 'next_page')    page++;
        else if (i.customId === 'prev_page')    page--;
        await i.update(buildMsg(page, currentFilter));
    });

    collector.on('end', () => chuongMsg.edit({ components: [] }).catch(() => {}));
};
