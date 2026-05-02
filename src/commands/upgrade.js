module.exports = async function cmdUpgrade(msg, u, saveData) {
    let typeName, key;
    if      (msg.content === ':upga')       { typeName = 'Tỉ lệ trứng hiếm'; key = 'lvGa'; }
    else if (msg.content === ':upthoc')     { typeName = 'Kho thóc';          key = 'lvNo'; }
    else                                    { typeName = 'Máy ấp trứng';      key = 'lvAp'; }

    const currentLv = u[key] || 0;
    if (currentLv >= 10) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.10)!`);

    const cost = Math.pow(currentLv + 1, 2) * 2000;
    if (u.coins < cost)
        return msg.reply(
            `❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.\n` +
            `💰 Giá nâng cấp Lv.${currentLv + 1} là: **${cost.toLocaleString()} Coins**.`
        );

    u.coins  -= cost;
    u[key]    = currentLv + 1;
    await saveData(msg.author.id);
    return msg.reply(
        `🚀 Nâng cấp thành công! **${typeName}** đã lên **Lv.${u[key]}**.\n` +
        `💸 Bạn đã chi: **${cost.toLocaleString()} Coins**.`
    );
};
