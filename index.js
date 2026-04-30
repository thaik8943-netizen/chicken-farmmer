const http = require('http');
http.createServer((req, res) => {
  res.write("Gà đang online!");
  res.end();
}).listen(8080);
require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType,
} = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ================= CƠ SỞ DỮ LIỆU GÀ =================
const PREFIX = ["Thần", "Thánh", "Cổ", "Vương", "Đế", "Huyền", "Linh", "Ma", "Quỷ", "Phật", "Tiên", "Thú", "Chiến", "Sát", "Hộ", "Pháp", "Long", "Phượng", "Kỳ", "Lân", "Hỏa", "Băng", "Lôi", "Phong", "Thổ"];
const MID = ["Ánh_Sáng", "Bóng_Tối", "Hỏa_Ngục", "Băng_Giá", "Sấm_Sét", "Cuồng_Phong", "Kim_Cương", "Vàng_Ròng", "Đá_Quý", "Vô_Cực", "Hư_Không", "Tử_Vong", "Sự_Sống", "Hỗn_Mang", "Thanh_Khiết", "Tàn_Bạo", "Dũng_Mãnh", "Nhanh_Nhẹn", "Trường_Sinh", "Bất_Diệt"];
const SUFFIX = ["Kê", "Gà", "Điểu", "Quái", "Thần", "Tướng", "Sĩ", "Binh", "Chủ", "Hậu", "Hoàng", "Vương", "Lão", "Phu", "Sư", "Tổ", "Tộc", "Long", "Lân", "Quy"];

function getChickenPrice(rarity) {
    const r = rarity.toLowerCase();
    if (r.includes("legendary")) return Math.floor(Math.random() * (300 - 200 + 1)) + 200;
    if (r.includes("epic")) return Math.floor(Math.random() * (200 - 100 + 1)) + 100;
    if (r.includes("rare")) return Math.floor(Math.random() * (100 - 50 + 1)) + 50;
    return Math.floor(Math.random() * (50 - 10 + 1)) + 10;
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
    try { data = JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { data = {}; } 
}
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

function getUser(id) {
    if (!data[id]) {
        data[id] = {
            started: false, thoc: 1000, coins: 500, lvGa: 0, lvNo: 0, lvAp: 0,
            eatToday: 0, lastEatReset: 0, trung: { thuong: 10, bac: 5, vang: 2 },
            gaCon: [], dangAp: [], equipped: null, lastDaily: 0, lastSteal: 0, lastTrong: 0
        };
    }
    return data[id];
}

// ĐÃ THÊM NỘI DUNG CHO HÀM NÀY
function formatTime(ms) {
    if (ms <= 0) return "Xong!";
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${h > 0 ? h + 'h ' : ''}${m}p ${s}s`;
}

// ĐÃ THÊM NỘI DUNG CHO HÀM NÀY
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

async function updateTopRoles(guild) { /* Code logic cập nhật role nếu cần */ }

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
// --- LỆNH: NÂNG CẤP ĐỒNG BỘ GIÁ LŨY TIẾN ---
if (msg.content === ":upga" || msg.content === ":upthoc" || msg.content === ":upaptrung") {
    let typeName = "";
    let key = "";
    
    if (msg.content === ":upga") { 
        typeName = "Tỉ lệ trứng hiếm"; 
        key = "lvGa"; 
    }
    else if (msg.content === ":upthoc") { 
        typeName = "Kho thóc"; 
        key = "lvNo"; 
    }
    else { 
        typeName = "Máy ấp trứng"; 
        key = "lvAp"; 
    }

    let currentLv = u[key] || 0;
    if (currentLv >= 10) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.10)!`);

    // CÔNG THỨC ĐỒNG BỘ: (Level hiện tại + 1)^2 * 2000
    let cost = Math.pow(currentLv + 1, 2) * 2000; 

    if (u.coins < cost) {
        return msg.reply(`❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.\n💰 Giá nâng cấp Lv.${currentLv + 1} là: **${cost.toLocaleString()} Coins**.`);
    }

    u.coins -= cost;
    u[key] = currentLv + 1;
    saveData();
    
    return msg.reply(`🚀 Nâng cấp thành công! **${typeName}** đã lên **Lv.${u[key]}**.\n💸 Bạn đã chi: **${cost.toLocaleString()} Coins**.`);
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
// --- TÍNH NĂNG ĐÁ GÀ (PVP) ---
if (msg.content.startsWith(":daga")) {
    const p1 = msg.author;
    const p2 = msg.mentions.users.first();

    // 1. Kiểm tra điều kiện
    if (!p2 || p2.id === p1.id || p2.bot) return msg.reply("❌ Bạn cần tag một người chơi khác để thách đấu!");
    
    const u1 = getUser(p1.id);
    const u2 = getUser(p2.id);

    if (!u2.started) return msg.reply("❌ Đối thủ của bạn chưa bắt đầu hành trình nuôi gà!");
    if (!u1.equipped || !u2.equipped) return msg.reply("❌ Cả hai đều phải trang bị gà chiến (`:equip`) trước khi đá!");
    if (u1.coins < 200 || u2.coins < 200) return msg.reply("❌ Cả hai cần tối thiểu 200 Xu để tham gia (phòng trường hợp gà bị thương cần chữa trị)!");

    // 2. Lời mời thách đấu
    const challengeEmbed = new EmbedBuilder()
        .setTitle("⚔️ THÁCH ĐẤU ĐÁ GÀ")
        .setDescription(`<@${p1.id}> đem con gà **${u1.equipped.name}** thách đấu với **${u2.equipped.name}** của <@${p2.id}>!\n\n**Mức cược:** Người thua mất 200 xu viện phí.\n**Phần thưởng:** 200 Thóc & 100 Xu.`)
        .setColor("#FF4500");

    const rowAccept = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_daga').setLabel('Chấp Nhận').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_daga').setLabel('Từ Chối').setStyle(ButtonStyle.Danger)
    );

    const reply = await msg.reply({ embeds: [challengeEmbed], components: [rowAccept] });

    // 3. Đợi đối thủ đồng ý
    const collectorAccept = reply.createMessageComponentCollector({ 
        filter: i => i.user.id === p2.id, 
        time: 30000, 
        max: 1 
    });

    collectorAccept.on('collect', async i => {
        if (i.customId === 'decline_daga') {
            return i.update({ content: "🚫 Thách đấu đã bị từ chối.", embeds: [], components: [] });
        }

        // Bắt đầu trận đấu
        let turn = p1.id; // P1 đi trước
        let scores = { [p1.id]: 0, [p2.id]: 0 };
        const maxScore = 3;

        const updateGame = async (interaction, log) => {
            const gameEmbed = new EmbedBuilder()
                .setTitle("🏟️ TRƯỜNG GÀ ĐANG RỰC LỬA")
                .setDescription(`${log}\n\n**Tỉ số:**\n🔴 <@${p1.id}>: ${"⭐".repeat(scores[p1.id])}\n🔵 <@${p2.id}>: ${"⭐".repeat(scores[p2.id])}`)
                .addFields({ name: "Lượt của", value: `<@${turn}>` })
                .setColor(turn === p1.id ? "#FF0000" : "#0000FF");

            const rowKick = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kick_action').setLabel('ĐÁ!').setStyle(ButtonStyle.Primary)
            );

            await interaction.update({ embeds: [gameEmbed], components: [rowKick] });
        };

        // Gửi giao diện trận đấu đầu tiên
        await updateGame(i, `🥊 Trận đấu bắt đầu! <@${p1.id}> ra đòn trước.`);

        const gameCollector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        gameCollector.on('collect', async gi => {
            if (gi.user.id !== turn) {
                return gi.reply({ content: "⏳ Chưa đến lượt bạn!", ephemeral: true });
            }

            const isHit = Math.random() < 0.5; // 50% tỉ lệ đá trúng
            let log = "";

            if (isHit) {
                scores[turn]++;
                log = `💥 **Cú đá hiểm hóc!** Gà của <@${turn}> đã đá trúng đối thủ!`;
            } else {
                log = `🌬️ **Hụt rồi!** Con gà của <@${turn}> vừa đá vào không khí.`;
            }

            // Kiểm tra thắng cuộc
            if (scores[turn] >= maxScore) {
                const winnerId = turn;
                const loserId = turn === p1.id ? p2.id : p1.id;
                
                const winU = getUser(winnerId);
                const loseU = getUser(loserId);

                winU.thoc += 200;
                winU.coins += 100;
                loseU.coins -= 200;
                saveData();

                gameCollector.stop();
                const winEmbed = new EmbedBuilder()
                    .setTitle("🏆 CHIẾN THẮNG THUYẾT PHỤC")
                    .setDescription(`Chúc mừng <@${winnerId}> đã thắng cuộc!\n\n🎁 **Phần thưởng:** +200 Thóc, +100 Xu\n🚑 **Đối thủ:** <@${loserId}> mất 200 Xu viện phí.`)
                    .setColor("#FFD700");

                return gi.update({ embeds: [winEmbed], components: [] });
            }

            // Đổi lượt
            turn = turn === p1.id ? p2.id : p1.id;
            await updateGame(gi, log);
        });
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
    // Hàm tính giá nhanh để hiển thị
    const calcCost = (lv) => Math.pow((lv || 0) + 1, 2) * 2000;

    const nangCapEmbed = `
🚀 **TRUNG TÂM CÔNG NGHỆ NÔNG TRẠI**
━━━━━━━━━━━━━━━━━━━━
1️⃣ **Tỉ lệ Trứng (:upga)** - [Lv.${u.lvGa || 0}/10]
└ Tăng tỉ lệ rơi trứng Bạc/Vàng khi cho ăn.
💰 Phí lên Lv.${(u.lvGa || 0) + 1}: **${calcCost(u.lvGa).toLocaleString()} 🪙**

2️⃣ **Kho Thóc (:upthoc)** - [Lv.${u.lvNo || 0}/10]
└ Tăng giới hạn thu hoạch lúa & trữ lượng.
💰 Phí lên Lv.${(u.lvNo || 0) + 1}: **${calcCost(u.lvNo).toLocaleString()} 🪙**

3️⃣ **Máy Ấp Trứng (:upaptrung)** - [Lv.${u.lvAp || 0}/10]
└ Tăng may mắn nở ra gà Epic/Legendary.
💰 Phí lên Lv.${(u.lvAp || 0) + 1}: **${calcCost(u.lvAp).toLocaleString()} 🪙**
━━━━━━━━━━━━━━━━━━━━
⚠️ *Lưu ý: Giá nâng cấp tăng theo bình phương cấp độ!*`;
    
    return msg.reply(nangCapEmbed);
}
// --- LỆNH: SHOP ---
if (msg.content === ":shop") {
    const shopEmbed = `
🏪 **CỬA HÀNG VẬT PHẨM CHICKEN EMPIRE**
━━━━━━━━━━━━━━━━━━━━
🥚 **TRỨNG GIỐNG:**
1️⃣ **Gói Trứng Thường** (1 quả): **100 🪙**
└ *Tỉ lệ nở gà Common cực cao.*

🌾 **LƯƠNG THỰC (GIÁ ĐẮT):**
2️⃣ **Bao Thóc Nhỏ** (100🌾): **5,000 🪙**
3️⃣ **Bao Thóc Lớn** (500🌾): **22,000 🪙**
4️⃣ **Kho Thóc Dự Trữ** (1,000🌾): **40,000 🪙**

━━━━━━━━━━━━━━━━━━━━
👉 *Dùng \`:buy <số thứ tự> <số lượng>\` để mua hàng!*
*Ví dụ: \`:buy 1 10\` để mua 10 quả trứng thường.*`;
    return msg.reply(shopEmbed);
}
// --- LỆNH: MUA ĐỒ (BUY) ---
if (msg.content.startsWith(":buy")) {
    const args = msg.content.split(" ");
    const itemNum = parseInt(args[1]); // Số thứ tự món đồ
    const quantity = parseInt(args[2]) || 1; // Số lượng muốn mua (mặc định là 1)

    if (isNaN(itemNum) || quantity <= 0) {
        return msg.reply("❌ Cú pháp: `:buy <số thứ tự> <số lượng>`\nVí dụ: `:buy 1 5` để mua 5 quả trứng.");
    }

    let totalCost = 0;
    let itemName = "";

    // Định nghĩa giá cả và món đồ
    if (itemNum === 1) { // Trứng thường
        itemName = "Trứng Thường";
        totalCost = 100 * quantity;
    } else if (itemNum === 2) { // 100 Thóc
        itemName = "100 Thóc";
        totalCost = 5000 * quantity;
    } else if (itemNum === 3) { // 500 Thóc
        itemName = "500 Thóc";
        totalCost = 22000 * quantity;
    } else if (itemNum === 4) { // 1000 Thóc
        itemName = "1000 Thóc";
        totalCost = 40000 * quantity;
    } else {
        return msg.reply("❌ Không tìm thấy món đồ này trong Shop! Hãy xem lại `:shop`.");
    }

    // Kiểm tra tiền của người dùng
    if (u.coins < totalCost) {
        return msg.reply(`❌ Bạn cần **${totalCost.toLocaleString()} Coins** nhưng hiện chỉ có **${u.coins.toLocaleString()} Coins**.`);
    }

    // Thực hiện giao dịch
    u.coins -= totalCost;
    
    if (itemNum === 1) {
        u.trung.thuong += quantity;
    } else if (itemNum === 2) {
        u.thoc += 100 * quantity;
    } else if (itemNum === 3) {
        u.thoc += 500 * quantity;
    } else if (itemNum === 4) {
        u.thoc += 1000 * quantity;
    }

    saveData();
    return msg.reply(`✅ Giao dịch thành công!\n🛒 Bạn đã mua: **${quantity}x ${itemName}**\n💰 Tổng chi: **${totalCost.toLocaleString()} Coins**.`);
}
//---ẤP TRỨNG----------
if (msg.content.startsWith(":aptrung")) {
    const args = msg.content.split(" ");
    const t = args[1]; // loại trứng: thuong, bac, vang
    const a = parseInt(args[2]); // số lượng

    // 1. Kiểm tra cấu trúc lệnh
    const tm = { 
        thuong: 900000,   // 15 phút
        bac: 3600000,    // 1 giờ
        vang: 7200000     // 2 giờ
    };

    if (!tm[t] || isNaN(a) || a <= 0) {
        return msg.reply("❌ Cú pháp: `:aptrung <thuong/bac/vang> <số lượng>`");
    }

    // 2. Kiểm tra xem máy ấp có đang bận không (Bắt buộc chờ hết mới được ấp tiếp)
    if (u.dangAp && u.dangAp.length > 0) {
        const waiting = u.dangAp[0].finishAt - now;
        return msg.reply(`🚫 **Máy ấp đang bận!** Bạn phải chờ lượt trứng cũ nở hết mới có thể bỏ đợt mới vào.\n⏳ Còn lại: **${formatTime(waiting)}**`);
    }

    // 3. Giới hạn tối đa 20 quả mỗi lần ấp
    if (a > 20) {
        return msg.reply("❌ Mỗi lần bạn chỉ có thể bỏ tối đa **20 quả trứng** vào máy ấp!");
    }

    // 4. Kiểm tra số dư trứng trong kho
    if (u.trung[t] < a) {
        return msg.reply(`❌ Bạn không đủ trứng **${t}** (Hiện có: ${u.trung[t]} quả).`);
    }

    // 5. Bắt đầu ấp
    u.trung[t] -= a;
    u.dangAp.push({ 
        type: t, 
        amount: a, 
        finishAt: now + tm[t] 
    });

    saveData();
    return msg.reply(`🥚 Đã bỏ **${a}** quả trứng **${t}** vào máy.\n⏱️ Thời gian chờ: **${formatTime(tm[t])}**.\n⚠️ *Lưu ý: Bạn không thể ấp thêm cho đến khi đợt này nở xong!*`);
}
//----BÁN GÀ-----------
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
// --- LỆNH: SKIP 45 PHÚT ẤP TRỨNG (:skipaptrung) ---
if (msg.content === ":skipaptrung") {
    const cdSkip = 2 * 60 * 60 * 1000; // Cooldown 2 tiếng
    const skipAmount = 45 * 60 * 1000; // Thời gian skip: 45 phút
    const skipCost = 500;
    const now = Date.now();

    // 1. Kiểm tra Cooldown lệnh
    if (u.lastSkip && now - u.lastSkip < cdSkip) {
        const remaining = cdSkip - (now - u.lastSkip);
        return msg.reply(`⏳ Lệnh tăng tốc đang hồi! Vui lòng chờ **${formatTime(remaining)}**.`);
    }

    // 2. Kiểm tra xem có đang ấp trứng nào không
    if (!u.dangAp || u.dangAp.length === 0) {
        return msg.reply("❌ Máy ấp đang trống, không có trứng để tăng tốc!");
    }

    // 3. Kiểm tra tiền
    if (u.coins < skipCost) {
        return msg.reply(`❌ Bạn cần **${skipCost} Xu** để mua bình tăng tốc 45 phút!`);
    }

    // 4. Thực hiện giảm thời gian
    u.coins -= skipCost;
    u.lastSkip = now;

    // Trừ 45 phút cho tất cả các đợt đang có trong máy ấp (nếu bạn cho phép ấp nhiều đợt)
    // Hoặc chỉ đợt đầu tiên tùy theo cấu trúc code của bạn. 
    // Ở đây mình trừ cho toàn bộ danh sách đang ấp hiện tại:
    u.dangAp.forEach(trung => {
        trung.finishAt -= skipAmount;
    });

    saveData();

    // Kiểm tra xem sau khi trừ có đợt nào nở luôn không
    const willHatch = u.dangAp.some(trung => now >= trung.finishAt);

    return msg.reply(`⏩ **TĂNG TỐC THÀNH CÔNG!**\n💰 Chi phí: **${skipCost} Xu**\n⏱️ Đã giảm **45 phút** thời gian chờ cho các trứng đang ấp.\n${willHatch ? "🐣 Một số trứng đã đủ thời gian, hãy nhắn tin tiếp theo để nhận gà!" : "⏳ Trứng vẫn cần thêm thời gian để nở."}`);
}
// --- LỆNH: XEM CHUỒNG GÀ PHÂN TRANG ---
// --- LỆNH: XEM CHUỒNG GÀ (CẬP NHẬT HIỂN THỊ GIÁ TIỀN) ---
if (msg.content === ":chuonga") {
    if (u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à!");
    
    const pageSize = 10;
    let page = 0;
    const totalPages = Math.ceil(u.gaCon.length / pageSize);

    const generateChuongEmbed = (p) => {
        const start = p * pageSize;
        const chickens = u.gaCon.slice(start, start + pageSize);
        
        // Tạo danh sách gà kèm giá tiền
        let list = chickens.map((g, i) => {
            // Tính giá tiền dựa trên hàm getChickenPrice đã có ở đầu code
            // Vì giá là random nên ở đây ta sẽ hiển thị mức trung bình hoặc lấy trực tiếp từ hàm
            const price = getChickenPrice(g.rarity); 
            const lockIcon = g.locked ? "🔒" : "";
            
            return `${start + i + 1}. **${g.name}**\n   └ 🏷️ Hệ: ${g.rarity} | 💰 Giá: **${price}** Xu ${lockIcon}`;
        }).join("\n");

        return `🏡 **CHUỒNG GÀ CỦA ${msg.author.username}** (Trang ${p + 1}/${totalPages})\n━━━━━━━━━━━━━━━━━━━━\n${list}\n━━━━━━━━━━━━━━━━━━━━\n*Dùng \`:sellga <hệ>\` để bán gà lấy xu!*`;
    };

    const chuongMsg = await msg.reply(generateChuongEmbed(page));
    
    if (totalPages > 1) {
        await chuongMsg.react('⬅️'); 
        await chuongMsg.react('➡️');
        
        const filter = (reaction, user) => ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === msg.author.id;
        const collector = chuongMsg.createReactionCollector({ filter, time: 60000 });
        
        collector.on('collect', async (reaction, user) => {
            if (reaction.emoji.name === '➡️') page = (page + 1) % totalPages;
            else page = (page - 1 + totalPages) % totalPages;
            
            await chuongMsg.edit(generateChuongEmbed(page));
            try { await reaction.users.remove(user.id); } catch(e) {}
        });
    }
    return;
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
// --- HỆ THỐNG MENU HELP SIÊU NÂNG CẤP (Bản Cập Nhật PVP & Trade) ---
if (msg.content === ":help") {
    // 1. Tạo Menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Chọn danh mục bạn muốn tìm hiểu...')
        .addOptions([
            { label: 'Nông Trại Cơ Bản', description: 'Khởi đầu và thông tin cá nhân.', value: 'basic', emoji: '🚜' },
            { label: 'Nuôi Dưỡng & Tỉ Lệ', description: 'Cách cho ăn và tìm trứng hiếm.', value: 'feed', emoji: '🌾' },
            { label: 'Ấp Trứng & Quản Lý', description: 'Thời gian ấp và túi trứng.', value: 'hatch', emoji: '🐣' },
            { label: 'Chuồng Gà & Nâng Cấp', description: 'Xem danh sách và nâng cấp.', value: 'farm', emoji: '🏡' },
            { label: 'Giao Dịch & Đối Kháng', description: 'Trade gà và Đá gà (PVP).', value: 'pvp_trade', emoji: '⚔️' }, // MỤC MỚI
            { label: 'Minigame Trộm Gà', description: 'Đột nhập trại hàng xóm.', value: 'steal', emoji: '🥷' },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // 2. Embed chào mừng
    const helpEmbed = new EmbedBuilder()
        .setTitle("📖 TRUNG TÂM HƯỚNG DẪN CHICKEN EMPIRE")
        .setDescription("Chào mừng chủ trang trại! Hãy chọn một danh mục trong thực đơn bên dưới để xem chi tiết.")
        .addFields({ name: '✨ Mẹo nhỏ', value: 'Hãy chăm chỉ `:daily` mỗi 2 tiếng để không bị hết thóc nhé!' })
        .setThumbnail(client.user.displayAvatarURL())
        .setColor("#FFD700")
        .setFooter({ text: `Yêu cầu bởi ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() });

    const response = await msg.reply({ embeds: [helpEmbed], components: [row] });

    // 3. Collector
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 60000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) {
            return i.reply({ content: "❌ Menu này không phải dành cho bạn!", ephemeral: true });
        }
        
        let title = "";
        let desc = "";
        let color = "#00FF00";

        switch (i.values[0]) {
            case 'basic':
                title = "🚜 Nông Trại Cơ Bản";
                desc = "• `:start`: Khởi tạo nông trại.\n• `:daily`: Nhận 500 thóc (Hồi 2h).\n• `:thongtin`: Xem ví tiền & cấp độ.\n• `:bxh`: Bảng xếp hạng.";
                break;
            case 'feed':
                title = "🌾 Nuôi Dưỡng & Tỉ Lệ";
                desc = "• `:chogaan <số>`: Dùng 50 thóc/lần.\n• **Tỷ lệ trứng:**\n  - ⚪ Thường: 93%\n  - 🔘 Bạc: 6%\n  - 🟡 Vàng: 1%";
                color = "#FFA500";
                break;
            case 'hatch':
                title = "🐣 Ấp Trứng & Quản Lý";
                desc = "• `:tuitrungga`: Xem trứng đang có.\n• `:aptrung <loại> <số>`: Bắt đầu ấp.\n• `:thoigianap`: Kiểm tra thời gian nở.\n• `:skipaptrung`: Giảm 45p ấp (500xu, hồi 2h).";
                color = "#FFFF00";
                break;
            case 'farm':
                title = "🏡 Chuồng Gà & Nâng Cấp";
                desc = "• `:chuonga`: Danh sách gà sở hữu.\n• `:sellga <hệ>`: Bán gà lấy Xu.\n• `:lockga/unlockga`: Khóa gà tránh bán nhầm.\n• `:nangcap`: Nâng cấp máy ấp/chuồng.";
                color = "#ADFF2F";
                break;
            case 'pvp_trade': // LOGIC MỚI
                title = "⚔️ Giao Dịch & Đối Kháng";
                desc = "🤝 **Giao Dịch:**\n• `:trade @user <tên gà>`: Tặng gà cho người khác.\n\n🥊 **Đá Gà (PVP):**\n• `:equip <tên gà>`: Chọn gà ra trận.\n• `:daga @user`: Thách đấu đá gà thay phiên.\n• **Thắng:** +200 Thóc, +100 Xu.\n• **Thua:** -200 Xu (viện phí).";
                color = "#E91E63";
                break;
            case 'steal':
                title = "🥷 Minigame Trộm Gà";
                desc = "• `:tromga @user`: Đột nhập trại người khác.\n• **Thắng:** Lấy 1 gà ngẫu nhiên.\n• **Thua:** Phạt 200 Xu.";
                color = "#FF0000";
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
        const disabledRow = new ActionRowBuilder().addComponents(
            selectMenu.setDisabled(true).setPlaceholder('Menu đã hết hạn')
        );
        response.edit({ components: [disabledRow] }).catch(() => {});
    });
    
    return;
}

client.login(process.env.TOKEN);
