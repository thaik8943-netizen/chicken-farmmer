const { EmbedBuilder } = require('discord.js');
const { data, saveData, getUser } = require('../database');
const { currentSpecialShop } = require('../../config/constants');

// worldBoss state is shared via the boss module
let worldBossRef = null;
function setWorldBossRef(ref) { worldBossRef = ref; }
function getWorldBossRef() { return worldBossRef; }

module.exports = async function interactionHandler(interaction) {
    // ── Buy special item (shop thần thoại) ──────────────────────
    if (interaction.isButton() && interaction.customId === 'buy_special_item') {
        const cfg = require('../../config/constants');
        const shop = cfg.currentSpecialShop;
        if (!shop) return interaction.reply({ content: '❌ Shop đã đóng cửa rồi!', ephemeral: true });

        const u = getUser(interaction.user.id);
        if ((u.coins || 0) < shop.price) {
            return interaction.reply({ content: `❌ Bạn thiếu **${(shop.price - u.coins).toLocaleString()} Xu**!`, ephemeral: true });
        }

        if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
        u.coins -= shop.price;
        u.inventory[shop.id] = (u.inventory[shop.id] || 0) + 1;
        await saveData(interaction.user.id);

        return interaction.reply({
            content: `✅ Mua thành công **${shop.name}**! Kiểm tra kho đồ: \`:khodo\``,
            ephemeral: true,
        });
    }

    // ── World Boss buttons ────────────────────────────────────────
    const worldBoss = require('../commands/boss').worldBoss;
    if (!interaction.isButton() || !worldBoss || !worldBoss.isActive) return;

    if (interaction.customId === 'boss_attack') {
        const u = data[interaction.user.id];
        if (!u || !u.equippedGa) {
            return interaction.reply({ content: '❌ Bạn chưa trang bị gà chiến!', ephemeral: true });
        }

        await interaction.deferUpdate();

        const damage      = u.equippedGa.atk || 120;
        const crit        = Math.random() < 0.15 ? 2 : 1;
        const finalDamage = damage * crit;

        worldBoss.hp -= finalDamage;
        worldBoss.contributors[interaction.user.id] =
            (worldBoss.contributors[interaction.user.id] || 0) + finalDamage;

        await interaction.followUp({
            content: `${crit > 1 ? '🔥 **BẠO KÍCH!**' : '⚔️'} Gà **${u.equippedGa.name}** gây **${finalDamage.toLocaleString()}** sát thương!`,
            ephemeral: true,
        });

        const totalHits = Object.keys(worldBoss.contributors).length;
        if (worldBoss.hp <= 0) {
            const { handleBossDefeated } = require('../commands/boss');
            await handleBossDefeated(data, saveData);
        } else if (totalHits % 5 === 0) {
            const { updateGlobalBossDisplay } = require('../commands/boss');
            await updateGlobalBossDisplay();
        }
    }

    if (interaction.customId === 'boss_status') {
        const top = Object.entries(worldBoss.contributors)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id, dmg], i) => `**#${i + 1}** <@${id}>: \`${dmg.toLocaleString()}\` ⚔️`)
            .join('\n') || '_Chưa có ai ra đòn._';

        const statusEmbed = new EmbedBuilder()
            .setTitle('📊 THỐNG KÊ CHIẾN TRƯỜNG')
            .setDescription(`❤️ Máu Boss còn lại: \`${Math.max(0, worldBoss.hp).toLocaleString()}\`\n\n**TOP SÁT THƯƠNG:**\n${top}`)
            .setColor('#3498db');

        return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }
};
