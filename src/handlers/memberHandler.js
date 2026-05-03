module.exports = async function memberHandler(member) {
    // Gán trực tiếp ID role bạn đã cung cấp
    const AUTO_ROLE_ID = '1499451733888335913';
    const role = member.guild.roles.cache.get(AUTO_ROLE_ID);

    if (!role) {
        return console.log(`❌ Không tìm thấy Role ID ${AUTO_ROLE_ID} tại: ${member.guild.name}`);
    }

    try {
        // Cấp role cho thành viên mới
        await member.roles.add(role);
        console.log(`✅ Đã cấp role ${role.name} cho: ${member.user.tag}`);

        // Gửi lời chào tại kênh hệ thống (System Channel)
        const welcomeChannel = member.guild.systemChannel;
        if (welcomeChannel) {
            welcomeChannel.send(
                `Chào mừng <@${member.user.id}> gia nhập máy chủ! Bạn đã được cấp role **${role.name}** tự động. ✨`
            );
        }
    } catch (e) {
        console.log(`❌ Lỗi cấp role tự động cho ${member.user.tag}: ${e.message}`);
    }
};
