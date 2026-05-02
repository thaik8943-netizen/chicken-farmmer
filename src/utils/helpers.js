/**
 * Format milliseconds thành chuỗi thời gian đọc được.
 * @param {number} ms
 */
function formatTime(ms) {
    if (ms <= 0) return 'Xong!';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h > 0 ? h + 'h ' : ''}${m}p ${s}s`;
}

/**
 * Xoá dấu tiếng Việt và khoảng trắng để so sánh tên.
 * @param {string} str
 */
function cleanText(str) {
    return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '');
}

/**
 * Tính độ tương đồng đơn giản (dùng cho tên ngắn).
 * @param {string} s1
 * @param {string} s2
 * @returns {number} 0 – 1
 */
function similarity(s1, s2) {
    const longer  = s1.length >= s2.length ? s1 : s2;
    const shorter = s1.length >= s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    if (longer.includes(shorter)) return 0.85;
    let count = 0;
    for (const char of shorter) { if (longer.includes(char)) count++; }
    return count / longer.length;
}

/**
 * Levenshtein distance (dùng trong :equip).
 */
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1[i - 1] !== s2[j - 1])
                    newValue = Math.min(newValue, lastValue, costs[j]) + 1;
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

function getSimilarity(s1, s2) {
    const longer  = s1.length >= s2.length ? s1.toLowerCase() : s2.toLowerCase();
    const shorter = s1.length >= s2.length ? s2.toLowerCase() : s1.toLowerCase();
    const len = longer.length;
    if (len === 0) return 1.0;
    return (len - editDistance(longer, shorter)) / len;
}

/**
 * Cập nhật role Top 3 trên guild.
 */
async function updateTopRoles(guild, data) {
    const TOP_ROLES = { 1: 'Trùm Cuối Kê Gia', 2: 'Đại Gia Chăn Gà', 3: 'Phú Hộ Trại Gà' };
    const sorted = Object.entries(data)
        .filter(([, u]) => u.started)
        .sort(([, a], [, b]) => b.coins - a.coins)
        .slice(0, 3);

    for (let i = 0; i < 3; i++) {
        const entry = sorted[i];
        if (!entry) continue;
        const role = guild.roles.cache.find(r => r.name === TOP_ROLES[i + 1]);
        if (!role) continue;
        try {
            const member = await guild.members.fetch(entry[0]);
            if (member) await member.roles.add(role);
        } catch { /* member rời server */ }
    }
}

module.exports = { formatTime, cleanText, similarity, getSimilarity, updateTopRoles };
