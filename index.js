require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const fs = require('fs');

const client = new Client({
intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================= CƠ SỞ DỮ LIỆU 1000 LOẠI GÀ ĐỘC NHẤT =================
const PREFIX = ["Thần", "Thánh", "Cổ", "Vương", "Đế", "Huyền", "Linh", "Ma", "Quỷ", "Phật", "Tiên", "Thú", "Chiến", "Sát", "Hộ", "Pháp", "Long", "Phượng", "Kỳ", "Lân", "Hỏa", "Băng", "Lôi", "Phong", "Thổ"];
const MID = ["Ánh_Sáng", "Bóng_Tối", "Hỏa_Ngục", "Băng_Giá", "Sấm_Sét", "Cuồng_Phong", "Kim_Cương", "Vàng_Ròng", "Đá_Quý", "Vô_Cực", "Hư_Không", "Tử_Vong", "Sự_Sống", "Hỗn_Mang", "Thanh_Khiết", "Tàn_Bạo", "Dũng_Mãnh", "Nhanh_Nhẹn", "Trường_Sinh", "Bất_Diệt"];
const SUFFIX = ["Kê", "Gà", "Điểu", "Quái", "Thần", "Tướng", "Sĩ", "Binh", "Chủ", "Hậu", "Hoàng", "Vương", "Lão", "Phu", "Sư", "Tổ", "Tộc", "Long", "Lân", "Quy"];

// ================= CƠ SỞ DỮ LIỆU 1000 LOẠI GÀ ĐỘC NHẤT =================
function getChickenPrice(rarity) {
    const r = rarity.toLowerCase();
    if (r.includes("legendary")) return Math.floor(Math.random() * (300 - 200 + 1)) + 200; // 200-300 xu
    if (r.includes("epic")) return Math.floor(Math.random() * (200 - 100 + 1)) + 100;      // 100-200 xu
    if (r.includes("rare")) return Math.floor(Math.random() * (100 - 50 + 1)) + 50;        // 50-100 xu
    return Math.floor(Math.random() * (50 - 10 + 1)) + 10;                                // 10-50 xu (Common)
}

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
if (msg.content === ":upga" || msg.content === ":upthoc" || msg.content === ":upaptrung") {
    let typeName = "";
    let key = "";
    
    if (msg.content === ":upga") { 
        typeName = "Tỉ lệ trứng hiếm"; 
        key = "lvGa"; 
    }
    else if (msg.content === ":upthoc") { // Đã đổi từ :upno thành :upthoc
        typeName = "Kho thóc"; 
        key = "lvNo"; // Vẫn giữ key 'lvNo' trong database để không làm mất dữ liệu cũ của người chơi
    }
    else { 
        typeName = "Máy ấp trứng"; 
        key = "lvAp"; 
    }

    let currentLv = u[key] || 0;
    if (currentLv >= 10) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.10)!`);

    let cost = (currentLv + 1) * 2000; 
    if (u.coins < cost) return msg.reply(`❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.`);

    u.coins -= cost;
    u[key] = currentLv + 1;
    saveData();
    
    return msg.reply(`🚀 Chúc mừng! Bạn đã nâng cấp **${typeName}** lên **Lv.${u[key]}**. (Tốn ${cost.toLocaleString()} Coins)`);
}
// --- LỆNH: GIAO DỊCH GÀ (TRADE) ---
if (msg.content.startsWith(":trade")) {
    const target = msg.mentions.users.first();
    const args = msg.content.split(" ");
    
    // Cú pháp: :trade @user <tên gà của mình>
    if (!target || target.id === msg.author.id) return msg.reply("❌ Cú pháp: `:trade @user <tên gà của bạn>`");
    
    const myChickenName = args.slice(2).join(" ");
    if (!myChickenName) return msg.reply("❌ Bạn muốn mang con gà nào đi giao dịch? Nhập tên đầy đủ nhé!");

    const uTarget = getUser(target.id);
    if (!uTarget.started) return msg.reply("❌ Người kia chưa chơi game!");

    // Tìm gà trong chuồng người gửi
    const myChickenIndex = u.gaCon.findIndex(g => g.name === myChickenName);
    if (myChickenIndex === -1) return msg.reply("❌ Bạn không có con gà này trong chuồng!");
    if (u.gaCon[myChickenIndex].locked) return msg.reply("❌ Con gà này đang bị **KHÓA**, hãy mở khóa trước khi trade!");

    const myChicken = u.gaCon[myChickenIndex];

    const tradeInquiry = await msg.channel.send(`🤝 **ĐỀ NGHỊ GIAO DỊCH**\n━━━━━━━━━━━━━━━━━━━━\n<@${msg.author.id}> muốn tặng con gà:\n🐔 **${myChicken.name}** [${myChicken.rarity}]\n\nCho <@${target.id}>. Bạn có đồng ý nhận không?\n*(Bấm ✅ để nhận, ❌ để từ chối)*`);

    await tradeInquiry.react('✅');
    await tradeInquiry.react('❌');

    const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === target.id;
    const collector = tradeInquiry.createReactionCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async (reaction) => {
        if (reaction.emoji.name === '✅') {
            // Kiểm tra lại lần cuối xem người gửi còn gà không (tránh bug double trade)
            const checkAgain = u.gaCon.findIndex(g => g.name === myChickenName);
            if (checkAgain === -1) return msg.channel.send("❌ Giao dịch thất bại! Con gà đã không còn ở đó.");

            // Thực hiện chuyển gà
            const tradedChicken = u.gaCon.splice(checkAgain, 1)[0];
            uTarget.gaCon.push(tradedChicken);

            // Nếu con gà này đang được trang bị, bỏ trang bị nó
            if (u.equipped && u.equipped.name === myChickenName) u.equipped = null;

            saveData();
            msg.channel.send(`🎊 **GIAO DỊCH THÀNH CÔNG!**\n<@${target.id}> đã nhận được **${tradedChicken.name}** từ <@${msg.author.id}>!`);
        } else {
            msg.channel.send(`🚫 <@${target.id}> đã từ chối giao dịch.`);
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') tradeInquiry.reply("⏰ Giao dịch hết thời gian chờ.");
        tradeInquiry.reactions.removeAll().catch(() => {});
    });
}
// --- LỆNH: TÚI TRỨNG ---
if (msg.content === ":tuitrungga") {
    const embedTui = `
🥚 **KHO TRỨNG CỦA ${msg.author.username}**
━━━━━━━━━━━━━━━━━━━━
⚪ **Trứng Thường:** ${u.trung.thuong} quả
🥈 **Trứng Bạc:** ${u.trung.bac} quả
🥇 **Trứng Vàng:** ${u.trung.vang} quả
━━━━━━━━━━━━━━━━━━━━
*Dùng \`:aptrung <loại> <số lượng>\` để bắt đầu ấp!*`;
    return msg.reply(embedTui);
}
// --- LỆNH: THỜI GIAN ẤP ---
if (msg.content === ":thoigianap") {
    if (!u.dangAp || u.dangAp.length === 0) return msg.reply("🚫 Máy ấp đang trống!");

    let listAp = u.dangAp.map((e, i) => {
        const timeLeft = e.finishAt - Date.now();
        const typeEmoji = e.type === "thuong" ? "⚪" : (e.type === "bac" ? "🥈" : "🥇");
        return `${i + 1}. ${typeEmoji} **${e.amount}** trứng **${e.type}**: \`${formatTime(timeLeft)}\``;
    }).join("\n");

    const embedAp = `
🐣 **MÁY ẤP TRỨNG ĐANG CHẠY**
━━━━━━━━━━━━━━━━━━━━
${listAp}
━━━━━━━━━━━━━━━━━━━━
*Gà sẽ tự động nở khi hết thời gian!*`;
    return msg.reply(`🐣 **TIẾN ĐỘ ẤP TRỨNG**\n━━━━━━━━━━━━━━━━━━━━\n${listAp}\n━━━━━━━━━━━━━━━━━━━━`);
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
    let sl = args[1] === "all" ? Math.floor(u.thoc / 50) : parseInt(args[1]);

    if (isNaN(sl) || sl <= 0) return msg.reply("❌ Cú pháp: `:chogaan <số lượng/all>` (50 thóc = 1 lần thu hoạch)");
    if (u.thoc < sl * 50) return msg.reply(`❌ Bạn không đủ thóc! Cần **${sl * 50} thóc** để cho ăn ${sl} lần.`);

    u.thoc -= sl * 50;
    let nhan = { thuong: 0, bac: 0, vang: 0 };
    
    // Bonus từ nâng cấp (lvGa): Mỗi cấp tăng thêm 0.5% tỉ lệ trứng xịn
    const upgradeBonus = (u.lvGa || 0) * 0.005; 

    for (let i = 0; i < sl; i++) {
        let r = Math.random();
        
        // Tỉ lệ Vàng: 1% gốc + bonus
        if (r < 0.01 + upgradeBonus) {
            nhan.vang++;
        } 
        // Tỉ lệ Bạc: 6% gốc + bonus (tổng cộng dồn là 0.01 + 0.06 = 0.07)
        else if (r < 0.07 + (upgradeBonus * 2)) { 
            nhan.bac++;
        } 
        // Còn lại là Thường: ~93%
        else {
            nhan.thuong++;
        }
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
    
    return msg.reply(`🆔 **HỒ SƠ: ${msg.author.username}**\n🏅 **Danh hiệu:** ${title}\n🛡️ **Đại diện:** ${equippedChicken}\n🌾 Thóc: ${u.thoc} | 🪙 Coins: ${u.coins}\n🏗️ Lv Trứng: ${u.lvGa} | Lv Thóc: ${u.lvNo} | Lv Ấp: ${u.lvAp}\n🏡 Chuồng: ${u.gaCon.length} con | 🥚 Trứng: T:${u.trung.thuong} B:${u.trung.bac} V:${u.trung.vang}`);
}
// --- LỆNH: BẢNG XẾP HẠNG TOP 10 (GÀ HIẾM + XU) ---
if (msg.content === ":bxh") {
    // 1. Lọc và sắp xếp dữ liệu
    const sorted = Object.entries(data)
        .filter(([, x]) => x.started)
        .sort(([, a], [, b]) => {
            // Đếm số gà hiếm (Legendary và Epic) của mỗi người
            const countHiemA = a.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;
            const countHiemB = b.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;

            if (countHiemB !== countHiemA) {
                return countHiemB - countHiemA; // Ưu tiên số gà hiếm
            }
            return b.coins - a.coins; // Nếu bằng gà hiếm thì xét đến Xu
        })
        .slice(0, 10); // Lấy đúng 10 người đầu tiên

    if (sorted.length === 0) return msg.reply("📭 Chưa có ai bắt đầu hành trình nuôi gà cả!");

    // 2. Xây dựng nội dung hiển thị
    let res = "🏆 **TOP 10 HUYỀN THOẠI CHĂN GÀ** 🏆\n━━━━━━━━━━━━━━━━━━━━\n";
    
    const leaderboardContent = sorted.map(([id, x], i) => {
        const hiemCount = x.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
        
        return `${rankIcon} <@${id}>\n└ ✨ Gà hiếm: **${hiemCount}** | 🪙 Xu: **${x.coins.toLocaleString()}**`;
    }).join('\n\n');

    res += leaderboardContent;
    res += "\n━━━━━━━━━━━━━━━━━━━━\n*🔥 BXH ưu tiên số gà Legendary/Epic!*";

    // 3. Gửi tin nhắn và cập nhật Role
    msg.reply(res);
    if (msg.guild) updateTopRoles(msg.guild);
}
// --- CÁC LỆNH KHÁC ---
// --- LỆNH: XEM DANH SÁCH NÂNG CẤP (GIÁ LŨY TIẾN) ---
if (msg.content === ":nangcap") {
    // Công thức: (lv + 1)^2 * 2000
    const calcCost = (lv) => Math.pow((lv || 0) + 1, 2) * 2000;

    const costGa = calcCost(u.lvGa);
    const costThoc = calcCost(u.lvNo);
    const costAp = calcCost(u.lvAp);

    const nangCapEmbed = `
🚀 **TRUNG TÂM CÔNG NGHỆ NÔNG TRẠI**
━━━━━━━━━━━━━━━━━━━━
1️⃣ **Tỉ lệ Trứng (:upga)** - [Lv.${u.lvGa || 0}/10]
└ Tăng tỉ lệ rơi trứng Bạc/Vàng. 
└ *Yêu cầu Lv.4 để mở khóa lệnh :tronglua*
💰 Phí nâng cấp: **${costGa.toLocaleString()} 🪙**

2️⃣ **Kho Thóc (:upthoc)** - [Lv.${u.lvNo || 0}/10]
└ Tăng giới hạn trữ thóc tối đa.
💰 Phí nâng cấp: **${costThoc.toLocaleString()} 🪙**

3️⃣ **Máy Ấp Trứng (:upaptrung)** - [Lv.${u.lvAp || 0}/10]
└ Tăng may mắn nở ra gà Epic/Legendary.
💰 Phí nâng cấp: **${costAp.toLocaleString()} 🪙**
━━━━━━━━━━━━━━━━━━━━
⚠️ *Càng lên cấp cao, chi phí sẽ tăng theo cấp số nhân!*
👉 *Gõ lệnh tương ứng (Ví dụ: \`:upga\`) để nâng cấp.*`;
    
    return msg.reply(nangCapEmbed);
}
// --- LỆNH: SHOP ---
if (msg.content === ":shop") {
    const shopEmbed = `
🏪 **CỬA HÀNG VẬT PHẨM CHICKEN EMPIRE**
━━━━━━━━━━━━━━━━━━━━
📦 **CÁC GÓI TRỨNG GIỐNG:**
1️⃣ **Gói Trứng Thường** (10 quả): **150 🪙**
2️⃣ **Gói Trứng Bạc** (5 quả): **400 🪙**
3️⃣ **Gói Trứng Vàng** (2 quả): **1,000 🪙**

🌾 **VẬT PHẨM HỖ TRỢ:**
4️⃣ **Bao Thóc Đại** (1,000🌾): **500 🪙**
5️⃣ **Bùa May Mắn** (Tăng tỉ lệ nở gà Rare): **2,500 🪙** (Coming Soon)

━━━━━━━━━━━━━━━━━━━━
👉 *Dùng \`:buy <số thứ tự> <số lượng>\` để mua hàng!*
*Ví dụ: \`:buy 1 2\` để mua 2 Gói Trứng Thường (20 quả).*`;
    return msg.reply(shopEmbed);
}
if (msg.content.startsWith(":aptrung")) {
    const args = msg.content.split(" ");
    const t = args[1]; // loại trứng
    const aStr = args[2]; // số lượng
    const a = parseInt(aStr);

    // THỜI GIAN MỚI: 15p (900k ms), 1h (3.6m ms), 2h (7.2m ms)
    const tm = { 
        thuong: 900000,   // 15 * 60 * 1000
        bac: 3600000,    // 60 * 60 * 1000
        vang: 7200000     // 120 * 60 * 1000
    };

    if (!tm[t] || isNaN(a) || u.trung[t] < a) {
        return msg.reply("❌ Lỗi cú pháp hoặc bạn không đủ trứng! \nHD: `:aptrung <thuong/bac/vang> <số lượng>`");
    }

    u.trung[t] -= a;
    u.dangAp.push({ type: t, amount: a, finishAt: now + tm[t] });
    saveData();

    return msg.reply(`🥚 Đang ấp **${a}** trứng **${t}**. Sẽ nở sau: **${formatTime(tm[t])}**`);
}

if (msg.content.startsWith(":sellga")) {
    const args = msg.content.split(" ");
    const r = args[1];
    if (!r) return msg.reply("❌ Cú pháp: `:sellga <common/rare/epic/legendary>`");

    const canSell = u.gaCon.filter(g => g.rarity.toLowerCase().includes(r.toLowerCase()) && !g.locked);
    const lockedCount = u.gaCon.filter(g => g.rarity.toLowerCase().includes(r.toLowerCase()) && g.locked).length;

    if (canSell.length === 0) {
        if (lockedCount > 0) return msg.reply(`❌ Không bán được! Có **${lockedCount}** con đang **KHÓA**.`);
        return msg.reply(`❌ Bạn không có gà hệ **${r}** để bán.`);
    }

    let totalMoney = 0;
    canSell.forEach(g => {
        totalMoney += getChickenPrice(g.rarity);
    });

    u.coins += totalMoney;
    u.gaCon = u.gaCon.filter(g => !canSell.includes(g));

    saveData();
    return msg.reply(`💰 Đã bán **${canSell.length}** gà hệ ${r}. Thu về tổng cộng **${totalMoney.toLocaleString()} Coins**!\n(Đã giữ lại ${lockedCount} con đang khóa)`);
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
    if (u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à!");

    const pageSize = 10; 
    let page = 0;
    const totalPages = Math.ceil(u.gaCon.length / pageSize);

    const generateChuongEmbed = (p) => {
        const start = p * pageSize;
        const end = start + pageSize;
        const chickens = u.gaCon.slice(start, end);

        // --- ĐÂY LÀ ĐOẠN BẠN CẦN THAY THẾ ---
        let list = chickens.map((g, i) => {
            let priceRange = "";
            const r = g.rarity.toLowerCase();
            if (r.includes("legendary")) priceRange = "200-300";
            else if (r.includes("epic")) priceRange = "100-200";
            else if (r.includes("rare")) priceRange = "50-100";
            else priceRange = "10-50";

            return `${start + i + 1}. **${g.name}** [${g.rarity}]\n└ 💰 Ước tính: **${priceRange} 🪙** | Bonus: x${g.bonus} ${g.locked ? "🔒" : ""}`;
        }).join("\n");
        // ------------------------------------

        return `🏡 **CHUỒNG GÀ CỦA ${msg.author.username}** (Trang ${p + 1}/${totalPages})\n━━━━━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━━━━━\n*Dùng ⬅️ ➡️ để chuyển trang. Gõ \`:equip <tên>\` để chọn gà chiến!*`;
    };

    // ... (Phần code reaction phía dưới giữ nguyên)
}

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
collector.on('end', () => {
chuongMsg.reactions.removeAll().catch(() => {});
});
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
// --- LỆNH: KIỂM TRA RUỘNG LÚA ---
if (msg.content === ":ruong") {
    const requiredLv = 4;
    if ((u.lvGa || 0) < requiredLv) {
        return msg.reply(`❌ **Ruộng chưa khai hoang!** Bạn cần nâng cấp **:upga** lên **Lv.4** để mở khóa đất canh tác.`);
    }

    const now = Date.now();
    const cdTrong = 30 * 60 * 1000; // 30 phút
    const lastTrong = u.lastTrong || 0;
    const timePassed = now - lastTrong;

    // Giới hạn thóc mỗi vụ dựa trên Lv Kho Thóc (lvNo)
    // Công thức: 500 + (Lv * 200). Lv 0 = 500, Lv 10 = 2500.
    const maxThoc = 500 + ((u.lvNo || 0) * 200);

    let status = "";
    let progressStr = "";

    if (timePassed >= cdTrong) {
        status = "🌾 **Lúa đã chín vàng!** Hãy gõ `:tronglua` để thu hoạch ngay.";
        progressStr = "██████████ 100%";
    } else {
        const percent = Math.floor((timePassed / cdTrong) * 100);
        const barCount = Math.floor(percent / 10);
        progressStr = "█".repeat(barCount) + "░".repeat(10 - barCount) + ` ${percent}%`;
        
        const remaining = cdTrong - timePassed;
        status = `🌱 **Lúa đang lớn...**\nCòn **${formatTime(remaining)}** nữa là có thể thu hoạch.`;
    }

    const ruongEmbed = `
🚜 **QUẢN LÝ ĐIỀN TRANG**
━━━━━━━━━━━━━━━━━━━━
📊 Trạng thái: ${status}
⏲️ Tiến độ: \`${progressStr}\`

📦 **Giới hạn ruộng (Lv.${u.lvNo || 0}):** 
└ Tối đa thu hoạch: **${maxThoc.toLocaleString()} Thóc/vụ**
━━━━━━━━━━━━━━━━━━━━
💡 *Nâng cấp \`:upthoc\` để tăng diện tích ruộng và sản lượng!*`;

    return msg.reply(ruongEmbed);
}
// --- LỆNH: TRỒNG LÚA ---
// --- LỆNH: TRỒNG LÚA (CẬP NHẬT THEO GIỚI HẠN RUỘNG) ---
if (msg.content === ":tronglua") {
    const requiredLv = 4;
    if ((u.lvGa || 0) < requiredLv) return msg.reply("❌ Cần :upga Lv.4 để trồng lúa!");

    const now = Date.now();
    const cdTrong = 30 * 60 * 1000;
    if (now - (u.lastTrong || 0) < cdTrong) {
        return msg.reply(`⏳ Lúa chưa chín! Gõ \`:ruong\` để xem tiến độ.`);
    }

    // Sản lượng dựa trên giới hạn ruộng
    const maxThocPerVụ = 500 + ((u.lvNo || 0) * 200);
    const minThocPerVụ = Math.floor(maxThocPerVụ * 0.5); // Tối thiểu 50% sản lượng tối đa
    
    const thuHoach = Math.floor(Math.random() * (maxThocPerVụ - minThocPerVụ + 1)) + minThocPerVụ;

    u.thoc += thuHoach;
    u.lastTrong = now;
    saveData();

    return msg.reply(`🌾 **Trúng mùa!** Bạn đã thu hoạch được **${thuHoach.toLocaleString()} thóc**.\n(Giới hạn ruộng hiện tại: ${maxThocPerVụ})`);
}
// --- HỆ THỐNG MENU HELP SIÊU NÂNG CẤP ---
if (msg.content === ":help") {
    // Tạo Menu chọn danh mục
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_menu')
                .setPlaceholder('📂 Chọn danh mục bạn muốn tìm hiểu...')
                .addOptions([
                    { 
                        label: 'Nông Trại Cơ Bản', 
                        description: 'Khởi đầu, nhận quà hàng ngày và thông tin cá nhân.', 
                        value: 'basic', 
                        emoji: '🚜' 
                    },
                    { 
                        label: 'Nuôi Dưỡng & Tỉ Lệ', 
                        description: 'Cách cho ăn và bí kíp tìm trứng hiếm.', 
                        value: 'feed', 
                        emoji: '🌾' 
                    },
                    { 
                        label: 'Ấp Trứng & Quản Lý', 
                        description: 'Thời gian ấp và túi trứng của bạn.', 
                        value: 'hatch', 
                        emoji: '🐣' 
                    },
                    { 
                        label: 'Chuồng Gà & Nâng Cấp', 
                        description: 'Xem danh sách gà, bán gà và nâng cấp công trình.', 
                        value: 'farm', 
                        emoji: '🏡' 
                    },
                    { 
                        label: 'Minigame Trộm Gà', 
                        description: 'Đột nhập trại hàng xóm để bẻ khóa lấy gà.', 
                        value: 'steal', 
                        emoji: '🥷' 
                    },
                ]),
        );

    // Embed chào mừng ban đầu
    const helpEmbed = new EmbedBuilder()
        .setTitle("📖 TRUNG TÂM HƯỚNG DẪN CHICKEN EMPIRE")
        .setDescription("Chào mừng chủ trang trại! Hãy chọn một danh mục trong thực đơn bên dưới để xem chi tiết các câu lệnh tương ứng.")
        .addFields(
            { name: '✨ Mẹo nhỏ', value: 'Hãy chăm chỉ `:daily` mỗi 2 tiếng để không bị hết thóc nhé!' }
        )
        .setThumbnail(client.user.displayAvatarURL())
        .setColor("#FFD700")
        .setFooter({ text: "Hệ thống hỗ trợ tự động • 2026", iconURL: msg.author.displayAvatarURL() });

    const response = await msg.reply({ embeds: [helpEmbed], components: [row] });

    // Bộ thu thập tương tác (Collector)
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 // Menu tồn tại trong 60 giây
    });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) {
            return i.reply({ content: "❌ Menu này không phải dành cho bạn!", ephemeral: true });
        }
        
        let title = "";
        let desc = "";
        let color = "#00FF00";

        // Xử lý nội dung hiển thị dựa trên lựa chọn
        switch (i.values[0]) {
            case 'basic':
                title = "🚜 Nông Trại Cơ Bản";
                desc = "• `:start`: Khởi tạo nông trại lần đầu.\n" +
                       "• `:daily`: Nhận 500 thóc (Hồi sau **2 tiếng**).\n" +
                       "• `:thongtin`: Xem ví tiền, cấp độ và gà đại diện.\n" +
                       "• `:bxh`: Xem bảng xếp hạng đại gia.";
                break;
            case 'feed':
                title = "🌾 Nuôi Dưỡng & Tỉ Lệ";
                desc = "• `:chogaan <số/all>`: Dùng 50 thóc/lần.\n" +
                       "• **Tỷ lệ nhận trứng:**\n" +
                       "  - ⚪ Trứng Thường: 93%\n" +
                       "  - 🔘 Trứng Bạc: 6%\n" +
                       "  - 🟡 Trứng Vàng: 1%";
                break;
            case 'hatch':
                title = "🐣 Ấp Trứng & Quản Lý";
                desc = "• `:tuitrungga`: Xem số lượng trứng bạn đang có.\n" +
                       "• `:aptrung <loại> <số>`: Bắt đầu ấp trứng.\n" +
                       "• `:thoigianap`: Kiểm tra thời gian còn lại (Ghi rõ giờ/phút/giây).";
                break;
            case 'farm':
                title = "🏡 Chuồng Gà & Nâng Cấp";
                desc = "• `:chuonga`: Danh sách gà đang sở hữu (Hỗ trợ phân trang).\n" +
                       "• `:sellga <hệ>`: Bán bớt gà để lấy Xu.\n" +
                       "• `:nangcap`: Nâng cấp kho, chuồng và máy ấp.";
                break;
            case 'steal':
                title = "🥷 Minigame Trộm Gà";
                desc = "• `:tromga @user`: Thử vận may đột nhập trại người khác.\n" +
                       "• **Thắng:** Lấy được 1 gà ngẫu nhiên.\n" +
                       "• **Thua:** Bị phạt 200 Xu và bị chó đuổi.";
                break;
        }

        const updateEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setTimestamp();

        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => {
        // Vô hiệu hóa menu sau khi hết thời gian
        row.components[0].setDisabled(true);
        response.edit({ components: [row] }).catch(() => {});
    });
}

client.login(process.env.TOKEN);
