module.exports = async function memberHandler(member) {
    // ID role của bạn
    const AUTO_ROLE_ID = '1499451733888335913';

    try {
        // Lấy role từ fetch thay vì cache để đảm bảo luôn tìm thấy role
        const role = await member.guild.roles.fetch(AUTO_ROLE_ID).catch(() => null);

        if (!role) {
            return console.log(`❌ Không tìm thấy Role ID ${AUTO_ROLE_ID} tại: ${member.guild.name}`);
        }

        // Kiểm tra xem Bot có quyền quản lý Role đó không (tránh lỗi Hierarchy)
        if (!member.guild.members.me.permissions.has('ManageRoles') || role.position >= member.guild.members.me.roles.highest.position) {
            return console.log(`❌ Bot không có đủ quyền hoặc Role ID ${AUTO_ROLE_ID} nằm cao hơn quyền của Bot.`);
        }

        // Cấp role cho thành viên mới
        await member.roles.add(role);
        console.log(`✅ Đã cấp role ${role.name} cho: ${member.user.tag}`);

        // Gửi lời chào tại kênh hệ thống (System Channel)
        const welcomeChannel = member.guild.systemChannel;
        if (welcomeChannel) {
            // Kiểm tra xem Bot có quyền gửi tin nhắn vào kênh đó không
            const permissions = welcomeChannel.permissionsFor(member.guild.members.me);
            if (permissions && permissions.has('SendMessages')) {
                welcomeChannel.send(
                    `Chào mừng <@${member.user.id}> gia nhập máy chủ! Bạn đã được cấp role **${role.name}** tự động. ✨`
                );
            }
        }
    } catch (e) {
        console.log(`❌ Lỗi cấp role tự động cho ${member.user.tag}: ${e.message}`);
    }
};
