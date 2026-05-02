const { AUTO_ROLE_ID } = require('../../config/constants');

module.exports = async function memberHandler(member) {
    const role = member.guild.roles.cache.get(AUTO_ROLE_ID);
    if (!role) {
        return console.log(`❌ Không tìm thấy Role ID ${AUTO_ROLE_ID} tại: ${member.guild.name}`);
    }
    try {
        await member.roles.add(role);
        console.log(`✅ Đã cấp role ${role.name} cho: ${member.user.tag}`);
        const welcomeChannel = member.guild.systemChannel;
        if (welcomeChannel) {
            welcomeChannel.send(
                `Chào mừng <@${member.user.id}> gia nhập máy chủ! Bạn đã được cấp role **${role.name}** tự động. 🌾`
            );
        }
    } catch (e) {
        console.log(`❌ Lỗi cấp role tự động cho ${member.user.tag}: ${e.message}`);
    }
};
