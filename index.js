const http = require('http');
http.createServer((req, res) => {
res.write('Bot is online!');
res.end();
}).listen(8080);

require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================= CƠ SỞ DỮ LIỆU 1000 LOẠI GÀ ĐỘC NHẤT =================
const PREFIX = ["Thần", "Thánh", "Cổ", "Vương", "Đế", "Huyền", "Linh", "Ma", "Quỷ", "Phật", "Tiên", "Thú", "Chiến", "Sát", "Hộ", "Pháp", "Long", "Phượng", "Kỳ", "Lân", "Hỏa", "Băng", "Lôi", "Phong", "Thổ"];
const MID = ["Ánh_Sáng", "Bóng_Tối", "Hỏa_Ngục", "Băng_Giá", "Sấm_Sét", "Cuồng_Phong", "Kim_Cương", "Vàng_Ròng", "Đá_Quý", "Vô_Cực", "Hư_Không", "Tử_Vong", "Sự_Sống", "Hỗn_Mang", "Thanh_Khiết", "Tàn_Bạo", "Dũng_Mãnh", "Nhanh_Nhẹn", "Trường_Sinh", "Bất_Diệt"];
const SUFFIX = ["Kê", "Gà", "Điểu", "Quái", "Thần", "Tướng", "Sĩ", "Binh", "Chủ", "Hậu", "Hoàng", "Vương", "Lão", "Phu", "Sư", "Tổ", "Tộc", "Long", "Lân", "Quy"];

const GA_LIST = [];
let nameCounter = 0;
for (let p of PREFIX) {
for (let m of MID) {
for (let s of SUFFIX) {
if (nameCounter < 1000) {
let rarity = nameCounter >= 950 ? "Legendary 🟡" : nameCounter >= 800 ? "Epic 🟣" : nameCounter >= 500 ? "Rare 🔵" : "Common ⚪";
let bonus = 1.5 + (nameCounter * 0.05);
GA_LIST.push({ name: `🐔_${p}_${m}_${s}_${nameCounter}`, bonus: +bonus.toFixed(2), rarity: rarity });
nameCounter++;
}
}
}
}

// ================= DATABASE & UTILS =================
const DATA_FILE = './data.json';
let data = {};

if (fs.existsSync(DATA_FILE)) { 
    try { 
        data = JSON.parse(fs.readFileSync(DATA_FILE)); 
    } catch (e) { 
        console.log("⚠️ Lỗi đọc file data.json, khởi tạo data trống.");
        data = {}; 
    } 
} else {
    // Nếu chưa có file, tạo file mới với nội dung là một object rỗng {}
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2)); 
    console.log("🆕 Đã tạo file data.json mới.");
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function getUser(id) {
if (!data[id]) {
data[id] = {
started: false, thoc: 1000, coins: 500, lvGa: 0, lvNo: 0, lvAp: 0,
eatToday: 0, lastEatReset: 0, trung: { thuong: 10, bac: 5, vang: 2 },
gaCon: [], dangAp: [], equipped: null, lastDaily: 0, lastSteal: 0
};
}
return data[id];
}
function formatTime(ms) {
if (ms <= 0) return "Xong!";
const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
return `${h > 0 ? h + 'h ' : ''}${m}p ${s}s`;
}
function getHint(secret, guess) {
let res = [], sArr = secret.split(''), gArr = guess.split('');
for (let i = 0; i < 5; i++) { if (gArr[i] === sArr[i]) { res[i] = '🟢'; sArr[i] = null; gArr[i] = null; } }
for (let i = 0; i < 5; i++) {
if (gArr[i]) {
let idx = sArr.indexOf(gArr[i]);
if (idx !== -1) { res[i] = '🟡'; sArr[idx] = null; } else { res[i] = '🔴'; }
}
}
return res.join(' ');
}

// ================= ROLE AUTO-UPDATE =================
async function updateTopRoles(guild) {
const TOP_ROLES = { 1: "Trùm Cuối Kê Gia", 2: "Đại Gia Chăn Gà", 3: "Phú Hộ Trại Gà" };
const sorted = Object.entries(data).filter(([id, u]) => u.started).sort(([, a], [, b]) => b.coins - a.coins).slice(0, 3);
for (let i = 0; i < 3; i++) {
const entry = sorted[i]; if (!entry) continue;
const role = guild.roles.cache.find(r => r.name === TOP_ROLES[i + 1]);
if (!role) continue;
role.members.forEach(m => { if (m.id !== entry[0]) m.roles.remove(role); });
try { const member = await guild.members.fetch(entry[0]); if (member) await member.roles.add(role); } catch (e) {}
}
}

// ================= BOT COMMANDS =================
client.on("messageCreate", async (msg) => {
if (msg.author.bot || !msg.content.startsWith(":")) return;
const u = getUser(msg.author.id), now = Date.now();
const today = new Date().setHours(0, 0, 0, 0);
if (u.lastEatReset !== today) { u.eatToday = 0; u.lastEatReset = today; }

// Tự động nở trứng
if (u.dangAp && u.dangAp.length > 0) {
let no = [];
u.dangAp = u.dangAp.filter(e => {
if (now >= e.finishAt) {
for (let i = 0; i < e.amount; i++) {
let pool = e.type === "thuong" ? GA_LIST.slice(0, 600) : (e.type === "bac" ? GA_LIST.slice(450, 850) : GA_LIST.slice(800));
let randIdx = Math.floor(Math.random() * pool.length);
if (u.lvAp > 0 && Math.random() < (u.lvAp * 0.05)) randIdx = Math.min(pool.length - 1, randIdx + 50);
let g = pool[randIdx];
u.gaCon.push({ ...g, id: Date.now() + Math.random(), locked: false });
no.push(g.name);
}
return false;
} return true;
});
if (no.length > 0) { saveData(); msg.reply(`🐣 **Nở rồi!** Đã thêm ${no.length} gà mới vào chuồng.`); }
}

if (!u.started && msg.content !== ":start") return msg.reply("🐔 Gõ `:start` ngay!");

// --- ADMIN GIVE ---
if (msg.content.startsWith(":give")) {
if (msg.author.id !== "873867371419422742") return msg.reply("❌ Quyền lực này không thuộc về bạn!");
const args = msg.content.split(" "), target = msg.mentions.users.first(), type = args[2], amt = parseInt(args[3]);
if (!target || !type || isNaN(amt)) return msg.reply("❌ `:give @user <xu/thoc/thuong/bac/vang> <số>`");
const r = getUser(target.id);
if (type === "xu") r.coins += amt; else if (type === "thoc") r.thoc += amt; else r.trung[type] += amt;
saveData(); return msg.reply(`🎁 Đã tặng ${amt} ${type} cho <@${target.id}>!`);
}
// --- LỆNH: NÂNG CẤP ---
if (msg.content === ":upga" || msg.content === ":upno" || msg.content === ":upaptrung") {
    let typeName = "";
    let key = "";
    
    if (msg.content === ":upga") { typeName = "Tỉ lệ trứng hiếm"; key = "lvGa"; }
    else if (msg.content === ":upno") { typeName = "Kho thóc"; key = "lvNo"; }
    else { typeName = "Máy ấp trứng"; key = "lvAp"; }

    let currentLv = u[key] || 0;
    if (currentLv >= 10) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.10)!`);

    let cost = (currentLv + 1) * 2000; // Công thức giá: 2k, 4k, 6k...
    if (u.coins < cost) return msg.reply(`❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.`);

    u.coins -= cost;
    u[key] = currentLv + 1;
    saveData();
    
    return msg.reply(`🚀 Chúc mừng! Bạn đã nâng cấp **${typeName}** lên **Lv.${u[key]}**. (Tốn ${cost.toLocaleString()} Coins)`);
}
// --- LỆNH: CHỌN GÀ CHIẾN ---
if (msg.content.startsWith(":equip")) {
    const chickenName = msg.content.split(" ").slice(1).join(" ");
    if (!chickenName) return msg.reply("❌ Cú pháp: `:equip <tên đầy đủ của gà>`");

    const chicken = u.gaCon.find(g => g.name === chickenName);
    if (!chicken) return msg.reply("❌ Bạn không sở hữu con gà này hoặc nhập sai tên!");

    u.equipped = chicken;
    saveData();
    return msg.reply(`✅ Đã chọn **${chicken.name}** làm đại diện chiến đấu!`);
}
// --- LỆNH: CHO GÀ ĂN ---
if (msg.content.startsWith(":chogaan")) {
    const args = msg.content.split(" ");
    // Nếu gõ ':chogaan all' thì lấy hết thóc chia 50, ngược lại lấy số lượng chỉ định
    let sl = args[1] === "all" ? Math.floor(u.thoc / 50) : parseInt(args[1]);

    if (isNaN(sl) || sl <= 0) return msg.reply("❌ Cú pháp: `:chogaan <số lượng/all>` (50 thóc = 1 lần thu hoạch)");
    if (u.thoc < sl * 50) return msg.reply(`❌ Bạn không đủ thóc! Cần **${sl * 50} thóc** để cho ăn ${sl} lần.`);

    u.thoc -= sl * 50;
    let nhan = { thuong: 0, bac: 0, vang: 0 };
    
    // Vòng lặp tính toán tỉ lệ rơi trứng
    for (let i = 0; i < sl; i++) {
        let r = Math.random();
        // Bạn có thể cộng thêm bonus từ u.lvGa (nâng cấp) vào đây để tăng tỉ lệ trứng xịn
        if (r < 0.05 + (u.lvGa * 0.01)) nhan.vang++;      // Tỉ lệ trứng vàng (~5%)
        else if (r < 0.25 + (u.lvGa * 0.02)) nhan.bac++; // Tỉ lệ trứng bạc (~20%)
        else nhan.thuong++;                              // Còn lại là trứng thường
    }

    u.trung.thuong += nhan.thuong;
    u.trung.bac += nhan.bac;
    u.trung.vang += nhan.vang;
    
    saveData();
    return msg.reply(`🌾 Bạn đã dùng **${sl * 50} thóc**. Thu hoạch được: 🥚 **${nhan.thuong}** Thường, 🥈 **${nhan.bac}** Bạc, 🥇 **${nhan.vang}** Vàng.`);
}
// --- TRỘM GÀ BẺ KHÓA ---
if (msg.content.startsWith(":tromga")) {
const target = msg.mentions.users.first();
if (!target || target.id === msg.author.id) return msg.reply("❌ Tag người khác!");
const enemy = getUser(target.id), cd = 2 * 60 * 60 * 1000;
if (now - u.lastSteal < cd) return msg.reply(`⏳ Chờ ${formatTime(cd - (now - u.lastSteal))}`);
if (enemy.gaCon.length <= 1) return msg.reply("❌ Hết gà trộm rồi!");
u.lastSteal = now; const secret = Math.floor(10000 + Math.random() * 90000).toString();
msg.reply("🕵️ **BẺ KHÓA (5 số):** 🟢 Đúng | 🟡 Sai chỗ | 🔴 Sai số. Có 5 lượt!");
const coll = msg.channel.createMessageCollector({ filter: m => m.author.id === msg.author.id && /^\d{5}$/.test(m.content), time: 60000, max: 5 });
coll.on('collect', m => {
const hint = getHint(secret, m.content);
if (m.content === secret) {
const s = enemy.gaCon.pop(); u.gaCon.push(s); saveData(); coll.stop();
return m.reply(`🎊 **THÀNH CÔNG!** Trộm được **${s.name}**`);
} else if (coll.collected.size >= 5) {
u.coins = Math.max(0, u.coins - 200); saveData();
return m.reply(`🚨 **BỊ BẮT!** Mã là ${secret}. Phạt 200 Coins.`);
} else m.reply(`Kết quả: ${hint} (Còn ${5 - coll.collected.size} lượt)`);
});
}

// --- THÔNG TIN & BXH ---
if (msg.content === ":thongtin") {
    let title = u.coins > 100000 ? "🔱 Huyền Thoại" : u.coins > 10000 ? "💰 Phú Hộ" : "🚜 Nông Dân";
    let equippedChicken = u.equipped ? `🐔 **${u.equipped.name}** [${u.equipped.rarity}]` : "Chưa chọn";
    
    return msg.reply(`🆔 **HỒ SƠ: ${msg.author.username}**\n🏅 **Danh hiệu:** ${title}\n🛡️ **Đại diện:** ${equippedChicken}\n🌾 Thóc: ${u.thoc} | 🪙 Coins: ${u.coins}\n🏗️ Lv Trứng: ${u.lvGa} | Lv Kho: ${u.lvNo} | Lv Ấp: ${u.lvAp}\n🏡 Chuồng: ${u.gaCon.length} con | 🥚 Trứng: T:${u.trung.thuong} B:${u.trung.bac} V:${u.trung.vang}`);
}

if (msg.content === ":bxh") {
const s = Object.entries(data).filter(([, x]) => x.started).sort(([, a], [, b]) => b.coins - a.coins).slice(0, 10);
let res = "🏆 **BXH ĐẠI GIA GÀ** 🏆\n" + s.map(([id, x], i) => `${i < 3 ? ['🥇', '🥈', '🥉'][i] : '👤'} Top ${i + 1}: <@${id}> - ${x.coins} 🪙`).join('\n');
msg.reply(res); if (msg.guild) updateTopRoles(msg.guild);
}

// --- CÁC LỆNH KHÁC ---
if (msg.content.startsWith(":aptrung")) {
const [, t, aStr] = msg.content.split(" "), a = parseInt(aStr), tm = { thuong: 1800000, bac: 7200000, vang: 14400000 };
if (!tm[t] || isNaN(a) || u.trung[t] < a) return msg.reply("❌ Lỗi cú pháp hoặc thiếu trứng!");
u.trung[t] -= a; u.dangAp.push({ type: t, amount: a, finishAt: now + tm[t] });
saveData(); return msg.reply(`🥚 Đang ấp ${a} trứng ${t}. Xong sau ${formatTime(tm[t])}`);
}

if (msg.content.startsWith(":sellga")) {
    const args = msg.content.split(" ");
    const r = args[1];
    if (!r) return msg.reply("❌ Cú pháp: `:sellga <common/rare/epic/legendary>`");

    // Lọc ra danh sách gà khớp hệ VÀ KHÔNG bị khóa (locked !== true)
    const canSell = u.gaCon.filter(g => g.rarity.toLowerCase().includes(r.toLowerCase()) && !g.locked);
    const lockedCount = u.gaCon.filter(g => g.rarity.toLowerCase().includes(r.toLowerCase()) && g.locked).length;

    if (canSell.length === 0) {
        if (lockedCount > 0) {
            return msg.reply(`❌ Không bán được! Bạn có **${lockedCount}** con gà hệ ${r} nhưng tất cả đã bị **KHÓA**. Hãy dùng \`:unlockga\` trước.`);
        }
        return msg.reply(`❌ Bạn không có con gà nào thuộc hệ **${r}** để bán.`);
    }

    const money = canSell.length * 50;
    u.coins += money;
    
    // Cập nhật lại chuồng gà: Chỉ giữ lại những con không nằm trong danh sách vừa bán
    u.gaCon = u.gaCon.filter(g => !canSell.includes(g));

    saveData();
    return msg.reply(`💰 Đã bán **${canSell.length}** gà hệ ${r}. Thu về **${money.toLocaleString()} Coins**.\n(Giữ lại ${lockedCount} con đang khóa)`);
}

if (msg.content === ":start") { u.started = true; u.gaCon.push(GA_LIST[0]); saveData(); msg.reply("🎊 Bắt đầu!"); }
if (msg.content === ":daily") {
if (now - u.lastDaily < 7200000) return msg.reply("⏳ Chờ 2h!");
u.thoc += 500; u.lastDaily = now; saveData(); msg.reply("🌾 +500 Thóc!");
}
// --- LỆNH: KHÓA/MỞ KHÓA GÀ ---
if (msg.content.startsWith(":lockga") || msg.content.startsWith(":unlockga")) {
    const isLock = msg.content.startsWith(":lockga");
    const args = msg.content.split(" ");
    const rarityStr = args[1]?.toLowerCase();
    const validRarities = ["common", "rare", "epic", "legendary"];

    if (!rarityStr || !validRarities.includes(rarityStr)) {
        return msg.reply("❌ Cú pháp: `:lockga <common/rare/epic/legendary>` hoặc `:unlockga <hệ>`");
    }

    let count = 0;
    u.gaCon.forEach(g => {
        // Kiểm tra xem độ hiếm của con gà có chứa từ khóa (vd: "Legendary 🟡") hay không
        if (g.rarity.toLowerCase().includes(rarityStr)) {
            g.locked = isLock;
            count++;
        }
    });

    if (count === 0) return msg.reply(`❌ Bạn không có con gà nào thuộc hệ **${rarityStr}**.`);

    saveData();
    return msg.reply(`${isLock ? "🔒 Đã khóa" : "🔓 Đã mở khóa"} thành công **${count}** con gà hệ **${rarityStr}**. Những con gà này sẽ không bị bán bởi lệnh \`:sellga\`.`);
}
// --- LỆNH: XEM CHUỒNG GÀ PHÂN TRANG ---
if (msg.content === ":chuonga") {
if (u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à, lo đi ấp trứng đi!");

const pageSize = 10; // Mỗi trang hiện 10 con
let page = 0;
const totalPages = Math.ceil(u.gaCon.length / pageSize);

const generateChuongEmbed = (p) => {
const start = p * pageSize;
const end = start + pageSize;
const chickens = u.gaCon.slice(start, end);

let list = chickens.map((g, i) =>
`${start + i + 1}. **${g.name}** [${g.rarity}] (x${g.bonus}) ${g.locked ? "🔒" : ""}`
).join("\n");

return `🏡 **CHUỒNG GÀ CỦA ${msg.author.username}** (Trang ${p + 1}/${totalPages})\n━━━━━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━━━━━\n*Dùng ⬅️ ➡️ để chuyển trang. Gõ \`:equip <tên>\` để chọn gà chiến!*`;
};

const chuongMsg = await msg.reply(generateChuongEmbed(page));
if (totalPages > 1) {
await chuongMsg.react('⬅️');
await chuongMsg.react('➡️');

const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === msg.author.id;
const collector = chuongMsg.createReactionCollector({ filter, time: 120000 });

collector.on('collect', async (reaction, user) => {
if (reaction.emoji.name === '➡️') {
page = (page + 1) % totalPages;
} else {
page = (page - 1 + totalPages) % totalPages;
}
await chuongMsg.edit(generateChuongEmbed(page));
try { await reaction.users.remove(user.id); } catch(e) {}
});

collector.on('end', () => chuongMsg.reactions.removeAll().catch(() => {}));
}
}

// --- LỆNH: BÁN TRỨNG ---
if (msg.content.startsWith(":selltrung")) {
const args = msg.content.split(" ");
const loai = args[1]; // thuong, bac, vang
const sl = parseInt(args[2]);

if (!loai || isNaN(sl) || sl <= 0) return msg.reply("❌ Cú pháp: `:selltrung <thuong/bac/vang> <số lượng>`");
if (!u.trung[loai] || u.trung[loai] < sl) return msg.reply(`❌ Bạn không đủ trứng ${loai} để bán!`);

const gia = { thuong: 10, bac: 50, vang: 200 }; // Bảng giá trứng
const tienThu = sl * gia[loai];

u.trung[loai] -= sl;
u.coins += tienThu;
saveData();
return msg.reply(`💰 Bạn đã bán **${sl} trứng ${loai}** và thu về **${tienThu.toLocaleString()} Coins**!`);
}
// --- LỆNH: TRỒNG LÚA ---
if (msg.content === ":tronglua") {
const cdTrong = 30 * 60 * 1000; // 30 phút một vụ
if (now - (u.lastTrong || 0) < cdTrong) return msg.reply(`⏳ Đất đang nghỉ, chờ ${formatTime(cdTrong - (now - (u.lastTrong || 0)))} nữa mới gieo mạ được!`);

const thuHoach = Math.floor(Math.random() * (500 - 200 + 1)) + 200; // Nhận 200-500 thóc
u.thoc += thuHoach;
u.lastTrong = now;
saveData();
return msg.reply(`🌾 Bạn đã thu hoạch được **${thuHoach} thóc** từ vụ mùa này!`);
}
// --- LỆNH: HELP PHÂN TRANG CẬP NHẬT (V5.0) ---
if (msg.content === ":help") {
const pages = [
`**TRANG 1: 🌱 KHỞI ĐẦU & CƠ BẢN**
━━━━━━━━━━━━━━━━━━━━
• \`:start\` → Đăng ký tài khoản và nhận gà tân thủ.
• \`:daily\` → Nhận 500 thóc miễn phí (Hồi sau mỗi **2 giờ**).
• \`:tronglua\` → Gieo mạ thu hoạch thóc (Hồi sau mỗi **30 phút**).
• \`:chogaan <số/all>\` → Dùng thóc để thu hoạch trứng.
• \`:thongtin\` → Xem hồ sơ, danh hiệu và tài sản hiện có.
━━━━━━━━━━━━━━━━━━━━
*Bấm ➡️ để xem hệ thống Ấp trứng*`,

`**TRANG 2: 🥚 HỆ THỐNG ẤP TRỨNG & CHUỒNG GÀ**
━━━━━━━━━━━━━━━━━━━━
• \`:aptrung <loại> <số>\` → Bắt đầu ấp trứng (Cần thời gian chờ).
⚪ **Thường:** 30p | 🥈 **Bạc:** 2h | 🥇 **Vàng:** 4h.
• \`:chuonga\` → Xem danh sách 1000 loại gà của bạn.
• \`:equip <tên_gà>\` → Chọn một con gà làm đại diện chiến đấu.
• \`:lockga <hệ>\` → Khóa gà (common/rare/epic/legendary).
• \`:unlockga <hệ>\` → Mở khóa gà để có thể bán.
━━━━━━━━━━━━━━━━━━━━
*Bấm ➡️ để xem hệ thống Kinh doanh*`,

`**TRANG 3: 🆙 NÂNG CẤP & KINH DOANH**
━━━━━━━━━━━━━━━━━━━━
• \`:selltrung <loại> <số>\` → Bán trứng lấy Coins (Tiền mặt).
• \`:sellga <hệ>\` → Bán toàn bộ gà hệ đó (trừ gà bị khóa).
• \`:upga\` → Nâng cấp tỉ lệ đẻ trứng (Max Lv.10).
• \`:upno\` → Nâng cấp kho chứa thóc (Max Lv.5).
• \`:upaptrung\` → Nâng cấp may mắn nở gà xịn.
• \`:bxh\` → Xem bảng xếp hạng và cập nhật Role Top 1-2-3.
━━━━━━━━━━━━━━━━━━━━
*Bấm ➡️ để xem Mini-game Trộm gà*`,

`**TRANG 4: 🥷 MINI-GAME TRỘM GÀ (BẺ KHÓA)**
━━━━━━━━━━━━━━━━━━━━
• \`:tromga @user\` → Đột nhập kho gà hàng xóm.
**🎮 Luật chơi bẻ khóa (Guess the Code):**
- Dự đoán mã **5 chữ số** bị ẩn.
- Phản hồi gợi ý:
🟢: Đúng số & đúng vị trí.
🟡: Đúng số & sai vị trí.
🔴: Con số không có trong mã.
- Có **5 lượt đoán**. Thắng được gà, thua bị phạt 200 Coins!
━━━━━━━━━━━━━━━━━━━━
*Bấm ⬅️ để quay lại trang đầu*`
];

let currentPage = 0;
const helpMsg = await msg.reply(`📖 **HƯỚNG DẪN CHICKEN EMPIRE (Trang ${currentPage + 1}/4)**\n\n${pages[currentPage]}`);

await helpMsg.react('⬅️');
await helpMsg.react('➡️');

const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === msg.author.id;
const collector = helpMsg.createReactionCollector({ filter, time: 60000 });

collector.on('collect', async (reaction, user) => {
if (reaction.emoji.name === '➡️') {
currentPage = (currentPage + 1) % pages.length;
} else {
currentPage = (currentPage - 1 + pages.length) % pages.length;
}

await helpMsg.edit(`📖 **HƯỚNG DẪN CHICKEN EMPIRE (Trang ${currentPage + 1}/4)**\n\n${pages[currentPage]}`);

try {
await reaction.users.remove(user.id);
} catch (e) {}
});

collector.on('end', () => {
helpMsg.reactions.removeAll().catch(() => {});
});
}
});

client.login(process.env.TOKEN);
