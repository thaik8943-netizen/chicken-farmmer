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
                let selectedRarity = "Common ⚪";
                let r = Math.random() * 100; // Quay số từ 0 - 100

                // CẤU TRÚC TỈ LỆ (Tính trên Trứng Vàng - Loại trứng tốt nhất)
                if (e.type === "vang") {
                    // Legendary: 0.01% (10.000 quả mới có 1)
                    if (r < 0.01) selectedRarity = "Legendary 🟡";
                    // Epic: 1% (Đúng 100 quả mới ra 1 con)
                    else if (r < 1.01) selectedRarity = "Epic 🟣";
                    // Rare: 15% 
                    else if (r < 16) selectedRarity = "Rare 🔵";
                    else selectedRarity = "Common ⚪";
                } 
                else if (e.type === "bac") {
                    // Trứng bạc: Cực hiếm mới ra Epic, Legendary gần như không tưởng
                    if (r < 0.001) selectedRarity = "Legendary 🟡";
                    else if (r < 0.1) selectedRarity = "Epic 🟣";
                    else if (r < 8) selectedRarity = "Rare 🔵";
                    else selectedRarity = "Common ⚪";
                }
                else {
                    // Trứng thường: 99% Common
                    if (r < 1) selectedRarity = "Rare 🔵";
                    else selectedRarity = "Common ⚪";
                }

                const pureRarity = selectedRarity.split(' ')[0];
                let pool = GA_LIST.filter(g => g.rarity.includes(pureRarity));
                if (pool.length === 0) pool = GA_LIST.filter(g => g.rarity.includes("Common"));

                let g = pool[Math.floor(Math.random() * pool.length)];

                // CHỈ SỐ CÂN BẰNG LẠI (Dựa trên độ hiếm mới)
                const stats = {
                    "Common ⚪": { hp: [50, 100], price: [10, 30] },
                    "Rare 🔵":   { hp: [200, 400], price: [200, 500] },
                    "Epic 🟣":   { hp: [1000, 2000], price: [5000, 15000] },
                    "Legendary 🟡": { hp: [8000, 15000], price: [100000, 300000] } 
                };

                const s = stats[selectedRarity];
                const finalHP = Math.floor(Math.random() * (s.hp[1] - s.hp[0] + 1)) + s.hp[0];
                const finalPrice = Math.floor(Math.random() * (s.price[1] - s.price[0] + 1)) + s.price[0];

                u.gaCon.push({ 
                    ...g, 
                    id: Date.now() + Math.random(), 
                    locked: false,
                    rarity: selectedRarity,
                    hp: finalHP,
                    price: finalPrice
                });
                no.push(selectedRarity);
            }
            return false;
        } return true;
    });

    if (no.length > 0) {
        saveData();
        let congrats = `🐣 **KẾT QUẢ ẤP TRỨNG:**\n${no.map(n => `> ✨ Bạn đã nhận được 1 gà **${n}**`).join("\n")}`;
        
        // Thông báo đặc biệt khi nổ hũ Epic hoặc Legendary
        if (no.some(n => n.includes("Legendary"))) {
            congrats = `🌟 **HUYỀN THOẠI XUẤT HIỆN!** 🌟\nChúc mừng <@${msg.author.id}> đã sở hữu được gà **Legendary 🟡** cực hiếm với tỉ lệ 0.01%!!!`;
        } else if (no.some(n => n.includes("Epic"))) {
            congrats = `🔥 **TIN HOT:** <@${msg.author.id}> vừa nở được một chú gà **Epic 🟣** xịn xò!`;
        }
        
        msg.reply(congrats);
    }
}
// --- LỆNH: BẮT ĐẦU (:start) ---
if (msg.content === ":start") {
    if (u.started && u.gaCon.length > 0) {
        return msg.reply("🌾 Bạn đã sở hữu trang trại rồi, đừng bắt đầu lại từ đầu chứ!");
    }

    // Khởi tạo người chơi mới
    u.started = true;
    u.coins = 500;
    u.thoc = 1000;
    
    // Tặng con gà đầu tiên (Lấy con gà đầu tiên trong danh sách Common)
    const firstChicken = GA_LIST[0]; 
    u.gaCon.push({ 
        ...firstChicken, 
        id: Date.now(), 
        locked: false 
    });

    saveData();
    
    return msg.reply("🎉 **CHÚC MỪNG!** Bạn đã nhận được mảnh đất đầu tiên và **1 con gà mặc định**.\n👉 Gõ `:thongtin` để xem trang trại hoặc `:chogaan` để bắt đầu kiếm trứng nhé!");
}
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
    if (!target || target.id === msg.author.id || target.bot) return msg.reply("❌ Tag người chơi bạn muốn giao dịch!");

    const u1 = data[msg.author.id];
    const u2 = data[target.id];
    if (!u2 || !u2.started) return msg.reply("❌ Đối phương chưa bắt đầu chơi!");

    // Dữ liệu cuộc giao dịch
    let tradeData = {
        [msg.author.id]: { items: [], coins: 0, thoc: 0, confirmed: false },
        [target.id]: { items: [], coins: 0, thoc: 0, confirmed: false }
    };

    const generateEmbed = () => {
        const createField = (id) => {
            const d = tradeData[id];
            return `🪙 Xu: **${d.coins.toLocaleString()}**\n🌾 Thóc: **${d.thoc.toLocaleString()}**\n` +
                   `🐔 Gà: ${d.items.length > 0 ? d.items.map(g => `\`${g.name}\``).join(", ") : "Trống"}\n` +
                   `${d.confirmed ? "✅ **ĐÃ CHỐT**" : "⏳ Đang chuẩn bị..."}`;
        };
        return new EmbedBuilder()
            .setTitle("🤝 GIAO DỊCH SONG PHƯƠNG")
            .setColor("#2ECC71")
            .addFields(
                { name: `👤 ${msg.author.username}`, value: createField(msg.author.id), inline: true },
                { name: `👤 ${target.username}`, value: createField(target.id), inline: true }
            )
            .setFooter({ text: "Sử dụng các nút bên dưới để điều chỉnh vật phẩm." });
    };

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('trade_ga').setLabel('🐔 Chọn Gà').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('trade_xu').setLabel('🪙 Xu').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_thoc').setLabel('🌾 Thóc').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_confirm').setLabel('CHỐT').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('trade_cancel').setLabel('HỦY').setStyle(ButtonStyle.Danger)
    );

    const tradeMsg = await msg.reply({ embeds: [generateEmbed()], components: [mainRow] });
    const collector = tradeMsg.createMessageComponentCollector({ time: 300000 }); // 5 phút

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id && i.user.id !== target.id) return i.reply({ content: "Nút này không dành cho bạn!", ephemeral: true });

        const myTrade = tradeData[i.user.id];
        const myDb = data[i.user.id];

        if (myTrade.confirmed && i.customId !== 'trade_cancel') return i.reply({ content: "Đã chốt không thể sửa!", ephemeral: true });

        // --- XỬ LÝ CHỌN GÀ ---
        if (i.customId === 'trade_ga') {
            const availableGa = myDb.gaCon.filter(g => !g.locked);
            if (availableGa.length === 0) return i.reply({ content: "Chuồng bạn không có gà hợp lệ!", ephemeral: true });

            const select = new StringSelectMenuBuilder().setCustomId('sel_ga').setPlaceholder('Chọn gà...')
                .addOptions(availableGa.slice(0, 25).map(g => ({ label: `${g.name} (${g.rarity})`, value: g.id.toString() })));
            return i.reply({ content: "Chọn gà muốn thêm:", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

        // --- XỬ LÝ XU & THÓC (Giao diện điều chỉnh) ---
        if (i.customId === 'trade_xu' || i.customId === 'trade_thoc') {
            const type = i.customId === 'trade_xu' ? 'coins' : 'thoc';
            const label = type === 'coins' ? 'Xu 🪙' : 'Thóc 🌾';
            
            const adjRow1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`adj_${type}_100`).setLabel('+100').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`adj_${type}_10`).setLabel('+10').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`adj_${type}_1`).setLabel('+1').setStyle(ButtonStyle.Success),
            );
            const adjRow2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`adj_${type}_-100`).setLabel('-100').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`adj_${type}_-10`).setLabel('-10').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`adj_${type}_-1`).setLabel('-1').setStyle(ButtonStyle.Danger),
            );

            return i.reply({ content: `Đang điều chỉnh **${label}**. Hiện tại: **${myTrade[type]}**`, components: [adjRow1, adjRow2], ephemeral: true });
        }

        // --- XỬ LÝ CÁC NÚT ĐIỀU CHỈNH TRONG EPHEMERAL ---
        if (i.customId.startsWith('adj_')) {
            const [, type, amount] = i.customId.split('_');
            const val = parseInt(amount);
            const currentInTrade = myTrade[type];
            const maxAvailable = myDb[type];

            if (currentInTrade + val < 0) return i.update({ content: `❌ Không thể giảm xuống dưới 0!` });
            if (currentInTrade + val > maxAvailable) return i.update({ content: `❌ Bạn chỉ có tối đa **${maxAvailable.toLocaleString()}**!` });

            myTrade[type] += val;
            await i.update({ content: `Đã điều chỉnh. Hiện tại đưa lên sàn: **${myTrade[type].toLocaleString()}**` });
            return tradeMsg.edit({ embeds: [generateEmbed()] });
        }

        // --- XỬ LÝ MENU CHỌN GÀ ---
        if (i.isStringSelectMenu()) {
            const chicken = myDb.gaCon.find(g => g.id.toString() === i.values[0]);
            if (!myTrade.items.some(it => it.id === chicken.id)) {
                myTrade.items.push(chicken);
                await i.update({ content: `✅ Đã thêm \`${chicken.name}\`!`, components: [] });
                return tradeMsg.edit({ embeds: [generateEmbed()] });
            }
            return i.update({ content: "Gà này đã có trên bàn trade!", components: [] });
        }

        // --- XỬ LÝ CHỐT / HỦY ---
        if (i.customId === 'trade_confirm') {
            myTrade.confirmed = true;
            if (tradeData[msg.author.id].confirmed && tradeData[target.id].confirmed) {
                const u1Tr = tradeData[msg.author.id]; const u2Tr = tradeData[target.id];
                // Thực hiện hoán đổi
                u1.coins -= u1Tr.coins; u1.coins += u2Tr.coins;
                u2.coins -= u2Tr.coins; u2.coins += u1Tr.coins;
                u1.thoc -= u1Tr.thoc; u1.thoc += u2Tr.thoc;
                u2.thoc -= u2Tr.thoc; u2.thoc += u1Tr.thoc;
                u1Tr.items.forEach(it => { u1.gaCon = u1.gaCon.filter(g => g.id !== it.id); u2.gaCon.push(it); });
                u2Tr.items.forEach(it => { u2.gaCon = u2.gaCon.filter(g => g.id !== it.id); u1.gaCon.push(it); });

                saveData(); collector.stop();
                return i.update({ content: "🎊 **GIAO DỊCH THÀNH CÔNG!**", embeds: [generateEmbed()], components: [] });
            }
        } else if (i.customId === 'trade_cancel') {
            collector.stop();
            return i.update({ content: `🚫 Giao dịch bị hủy bởi <@${i.user.id}>`, embeds: [], components: [] });
        }
        await i.update({ embeds: [generateEmbed()] });
    });
});
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
    const args = msg.content.split(" ").slice(1);
    const inputName = args.join(" ");

    if (!inputName) return msg.reply("❌ Cú pháp: `:equip <tên gà>`");

    const u = data[msg.author.id];
    if (!u || u.gaCon.length === 0) return msg.reply("🏚️ Bạn không có con gà nào trong chuồng!");

    let bestMatch = null;
    let maxSimilarity = 0;

    // Duyệt tìm con gà giống nhất
    u.gaCon.forEach(ga => {
        const similarity = getSimilarity(inputName, ga.name);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = ga;
        }
    });

    // Ngưỡng 80% để xác nhận trang bị
    if (maxSimilarity >= 0.8) {
        u.equippedGa = bestMatch; 
        saveData();

        return msg.reply(`✅ Đã nhận diện: 🐔 **${bestMatch.name}**\n👉 Đã trang bị thành công!`);
    } 
    // Ngưỡng gợi ý nếu gõ chưa tới 80% nhưng vẫn khá giống
    else if (maxSimilarity > 0.4) {
        return msg.reply(`❓ Có phải bạn muốn trang bị con **${bestMatch.name}** không? Hãy gõ tên chính xác hơn một chút nhé.`);
    } 
    else {
        return msg.reply("❌ Không tìm thấy con gà nào có tên tương tự trong chuồng của bạn!");
    }
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
    // 1. Danh sách ID Admin & Tester (Đã thêm ID của bạn)
    const adminIDs = ["873867371419422742"]; 

    // 2. Lọc người chơi (Bỏ qua Admin) và sắp xếp
    const sorted = Object.entries(data)
        .filter(([id, x]) => {
            // Chỉ lấy người đã khởi tạo game và không có trong danh sách adminIDs
            return x.started && !adminIDs.includes(id);
        })
        .sort(([, a], [, b]) => {
            // Đếm số gà hiếm (Legendary và Epic)
            const countHiemA = a.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;
            const countHiemB = b.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;

            if (countHiemB !== countHiemA) {
                return countHiemB - countHiemA; // Ai nhiều gà hiếm hơn đứng trên
            }
            return (b.coins || 0) - (a.coins || 0); // Bằng gà hiếm thì xét Xu
        })
        .slice(0, 10); // Lấy Top 10

    if (sorted.length === 0) return msg.reply("📭 Hiện chưa có người chơi nào đủ điều kiện lọt bảng xếp hạng!");

    // 3. Xây dựng nội dung hiển thị
    let res = "🏆 **TOP 10 HUYỀN THOẠI CHĂN GÀ** 🏆\n━━━━━━━━━━━━━━━━━━━━\n";
    
    const leaderboardContent = sorted.map(([id, x], i) => {
        const hiemCount = x.gaCon.filter(g => g.rarity.includes("Legendary") || g.rarity.includes("Epic")).length;
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
        
        return `${rankIcon} <@${id}>\n└ ✨ Gà hiếm: **${hiemCount}** | 🪙 Xu: **${(x.coins || 0).toLocaleString()}**`;
    }).join('\n\n');

    res += leaderboardContent;
    res += "\n━━━━━━━━━━━━━━━━━━━━\n*🔥 BXH đã ẩn Admin & Đội ngũ Tester!*";

    msg.reply(res);
    
    // Cập nhật Role Top cho người chơi
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
// --- LỆNH: BÁN GÀ (CẬP NHẬT: KHÔNG BÁN GÀ KHÓA) ---
if (msg.content.startsWith(":sellga")) {
    const args = msg.content.split(" ");
    const targetRarity = args[1]?.toLowerCase();
    
    const validRarities = ["common", "rare", "epic", "legendary"];
    if (!targetRarity || !validRarities.includes(targetRarity)) {
        return msg.reply("❌ Cú pháp: `:sellga <common/rare/epic/legendary>`");
    }

    // 1. Tìm tất cả gà thuộc hệ đó
    const allOfRarity = u.gaCon.filter(g => g.rarity.toLowerCase().includes(targetRarity));

    if (allOfRarity.length === 0) {
        return msg.reply(`❌ Bạn không có con gà nào thuộc hệ **${targetRarity}**.`);
    }

    // 2. Lọc ra những con KHÔNG bị khóa (để bán) và những con BỊ khóa (để giữ)
    const canSell = allOfRarity.filter(g => !g.locked);
    const lockedCount = allOfRarity.filter(g => g.locked).length;

    // 3. Nếu không có con nào bán được do tất cả đã bị khóa
    if (canSell.length === 0) {
        return msg.reply(`🛡️ Không thể bán! Tất cả **${lockedCount}** con gà hệ **${targetRarity}** của bạn hiện đang được **KHÓA**. Hãy dùng \`:unlockga ${targetRarity}\` nếu muốn bán.`);
    }

    // 4. Tính tổng tiền từ những con bán được (dùng giá cố định lưu trong gà)
    let totalMoney = canSell.reduce((sum, g) => sum + (g.price || 10), 0);

    // 5. Cập nhật dữ liệu: Giữ lại những con gà không thuộc hệ này HOẶC những con bị khóa thuộc hệ này
    u.gaCon = u.gaCon.filter(g => {
        const isTargetRarity = g.rarity.toLowerCase().includes(targetRarity);
        return !isTargetRarity || g.locked; 
    });

    u.coins += totalMoney;
    saveData();

    // 6. Thông báo kết quả
    let response = `💰 Đã bán thành công **${canSell.length}** gà hệ **${targetRarity}**.\n✅ Thu về: **${totalMoney.toLocaleString()} Xu**.`;
    if (lockedCount > 0) {
        response += `\n⚠️ Lưu ý: Đã giữ lại **${lockedCount}** con gà đang khóa.`;
    }

    return msg.reply(response);
}
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
    const u = data[msg.author.id];
    if (!u || u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à! Đi ấp trứng ngay đi.");

    const pageSize = 5; 
    let page = 0;
    const totalPages = Math.ceil(u.gaCon.length / pageSize);

    // Hàm tạo Embed và Nút bấm theo trang
    const generateChuongMessage = (p) => {
        const start = p * pageSize;
        const chickens = u.gaCon.slice(start, start + pageSize);
        
        const list = chickens.map((g, i) => {
            const lockIcon = g.locked ? "🔒" : "🔓";
            const isEquipped = u.equippedGa && u.equippedGa.id === g.id ? " ✅ `[ĐANG DÙNG]`" : "";
            
            // Các thông số bạn yêu cầu
            const hp = g.hp || 50;
            const atk = g.atk || Math.floor(hp / 10); // Nếu chưa có atk thì lấy 10% máu làm sức mạnh
            const price = g.price || 10;
            
            return `**${start + i + 1}. ${g.name}** ${lockIcon}${isEquipped}\n` +
                   `└ ✨ Hệ: \`${g.rarity}\` | ❤️ HP: \`${hp}\` | 💪 ATK: \`${atk}\` | 💰 Giá: \`${price.toLocaleString()}\``;
        }).join("\n\n");

        const embed = new EmbedBuilder()
            .setTitle(`🏡 CHUỒNG GÀ CỦA ${msg.author.username}`)
            .setDescription(list)
            .setColor("#F1C40F")
            .setThumbnail(msg.author.displayAvatarURL())
            .setFooter({ text: `Trang ${p + 1}/${totalPages} | Tổng cộng: ${u.gaCon.length} con gà` });

        // Tạo nút bấm
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('⬅️ Trang trước')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(p === 0), // Vô hiệu hóa nếu là trang đầu
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Trang sau ➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(p === totalPages - 1) // Vô hiệu hóa nếu là trang cuối
        );

        return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
    };

    const chuongMsg = await msg.reply(generateChuongMessage(page));

    // Nếu chỉ có 1 trang thì không cần lắng nghe sự kiện nút bấm
    if (totalPages <= 1) return;

    const collector = chuongMsg.createMessageComponentCollector({
        filter: i => i.user.id === msg.author.id,
        time: 60000 // Sau 60 giây nút sẽ hết hạn
    });

    collector.on('collect', async i => {
        if (i.customId === 'next_page') {
            page++;
        } else if (i.customId === 'prev_page') {
            page--;
        }

        await i.update(generateChuongMessage(page));
    });

    collector.on('end', () => {
        // Xóa nút bấm khi hết thời gian để tránh bấm lỗi
        chuongMsg.edit({ components: [] }).catch(() => {});
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
        status = "🌾 **Lúa đã chín vàng!** Hãy gõ `:thuhoach` để thu hoạch ngay.";
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
//-----THU HOẠCH LÚA-------------------------
if (msg.content === ":thuhoach") {
    const u = data[msg.author.id];
    if (!u) return;

    // 1. Kiểm tra điều kiện Level ruộng (giống lệnh :ruong)
    const requiredLv = 4;
    if ((u.lvGa || 0) < requiredLv) {
        return msg.reply(`❌ Bạn chưa có ruộng! Cần nâng cấp **:upga** lên **Lv.4** để khai hoang.`);
    }

    const now = Date.now();
    const cdTrong = 30 * 60 * 1000; // 30 phút
    const lastTrong = u.lastTrong || 0;
    const timePassed = now - lastTrong;

    // 2. Kiểm tra lúa đã chín chưa
    if (timePassed < cdTrong) {
        const remaining = cdTrong - timePassed;
        return msg.reply(`🌾 Lúa vẫn còn xanh lắm chủ thớt ơi! Chờ thêm **${formatTime(remaining)}** nữa mới gặt được.`);
    }

    // 3. Tính toán sản lượng theo công thức của bạn: 500 + (Lv * 200)
    // Random một chút để tăng tính hấp dẫn (ví dụ: từ 80% đến 100% sản lượng tối đa)
    const maxThocPotential = 500 + ((u.lvNo || 0) * 200);
    const thocNhanDuoc = Math.floor(maxThocPotential * (0.8 + Math.random() * 0.2));

    // 4. Cập nhật dữ liệu
    u.thoc = (u.thoc || 0) + thocNhanDuoc;
    u.lastTrong = now; // Reset thời gian về lúc vừa gặt (bắt đầu vụ mới ngay lập tức)
    saveData();

    // 5. Phản hồi người chơi
    const thuHoachEmbed = new EmbedBuilder()
        .setTitle("🎊 MÙA MÀNG BỘI THU!")
        .setColor("#2ECC71")
        .setDescription(
            `🌾 Bạn vừa gặt xong một vụ lúa chất lượng!\n` +
            `💰 Sản lượng thu về: **+${thocNhanDuoc.toLocaleString()} Thóc**\n` +
            `🚜 Ruộng đã được làm đất và gieo mầm vụ mới tự động.`
        )
        .setFooter({ text: `Tổng thóc hiện có: ${u.thoc.toLocaleString()} 🌾` });

    return msg.reply({ embeds: [thuHoachEmbed] });
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
// --- HỆ THỐNG MENU HELP SIÊU CẤP (Bản Update Đầy Đủ & Nâng Cấp) ---
if (msg.content === ":help") {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Chọn danh mục bạn muốn xem...')
        .addOptions([
            { label: 'Hướng Dẫn Tân Thủ', value: 'basic', emoji: '🔰' },
            { label: 'Nuôi Dưỡng & Sản Xuất', value: 'feed', emoji: '🌾' },
            { label: 'Ấp Trứng & Quản Lý', value: 'hatch', emoji: '🥚' },
            { label: 'Nâng Cấp Công Trình', value: 'upgrade', emoji: '🏗️' }, // Mục mới
            { label: 'Giao Thương & PVP', value: 'pvp_trade', emoji: '🤝' },
            { label: 'Hoạt Động Ngầm', value: 'steal', emoji: '🕵️' },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const helpEmbed = new EmbedBuilder()
        .setTitle("📒 CUỐN CẨM NANG CHICKEN EMPIRE")
        .setColor("#FFD700")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription("✨ **Chào mừng chủ trang trại!**\nDưới đây là toàn bộ bí kíp để bạn xây dựng đế chế gà của mình.\n\n*Hãy chọn danh mục bên dưới để bắt đầu.*")
        .addFields(
            { name: '🚀 Lối tắt nhanh', value: '`:start` • `:thongtin` • `:chuonga` • `:ruong`', inline: true }
        )
        .setFooter({ text: `Yêu cầu bởi ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() });

    const response = await msg.reply({ embeds: [helpEmbed], components: [row] });

    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) return i.reply({ content: "❌ Menu này không dành cho bạn!", ephemeral: true });
        
        let title = "";
        let desc = "";
        let color = "#3498DB";

        switch (i.values[0]) {
            case 'basic':
                title = "🚜 DANH MỤC: TÂN THỦ";
                desc = ">>> 🔰 `:start`: Khởi tạo trang trại.\n" +
                       "💰 `:daily`: Nhận 500 thóc (Hồi 2h).\n" +
                       "📊 `:thongtin`: Xem ví tiền & cấp độ.\n" +
                       "🏆 `:bxh`: Top 10 đại gia của vương quốc.";
                break;
            case 'feed':
                title = "🌾 NUÔI DƯỠNG & SẢN XUẤT";
                desc = ">>> 🥗 `:chogaan <số>`: Dùng 50 thóc/lần.\n" +
                       "🌱 `:ruong`: Xem tình trạng ruộng lúa.\n" +
                       "🌾 `:thuhoach`: Gặt lúa khi đã chín (100%).\n\n" +
                       "🥚 **Tỉ lệ rơi trứng:**\n" +
                       "└ ⚪ **Thường:** 93% | 🔘 **Bạc:** 6% | 🟡 **Vàng:** 1%";
                color = "#FFA500";
                break;
            case 'hatch':
                title = "🥚 DANH MỤC: ẤP TRỨNG & QUẢN LÝ";
                desc = ">>> 🎒 `:tuitrungga`: Xem kho trứng đang có.\n" +
                       "🔥 `:aptrung <loại> <số>`: Bắt đầu ấp trứng.\n" +
                       "⏳ `:thoigianap`: Kiểm tra thời gian trứng nở.\n" +
                       "⚡ `:skipaptrung`: Dùng Xu rút ngắn 45p ấp.";
                color = "#FFFF00";
                break;
            case 'upgrade': // CASE MỚI CHO :NANGCAP
                title = "🏗️ DANH MỤC: NÂNG CẤP CÔNG TRÌNH";
                desc = ">>> 🏚️ `:upga`: Nâng cấp chuồng (Thêm chỗ nuôi gà).\n" +
                       "🏭 `:upaptrung`: Nâng cấp máy (Trứng nở nhanh hơn).\n" +
                       "📦 `:upthoc`: Nâng cấp kho (Tăng sản lượng lúa/vụ).\n\n" +
                       "💡 *Gợi ý: Hãy ưu tiên `:upthoc` trước để có nguồn lực nâng cấp các mục khác!*";
                color = "#95A5A6";
                break;
            case 'pvp_trade':
                title = "🤝 GIAO THƯƠNG & CHIẾN ĐẤU";
                desc = ">>> 🤝 `:trade @user`: Giao dịch vật phẩm.\n" +
                       "🥊 `:daga @user`: Thách đấu đá gà đặt cược.\n" +
                       "⚔️ `:equip <tên>`: Trang bị vũ khí cho gà chiến.";
                color = "#E91E63";
                break;
            case 'steal':
                title = "🕵️ HOẠT ĐỘNG NGẦM";
                desc = ">>> 🧤 `:tromga @user`: Đột nhập trộm gà hàng xóm.\n" +
                       "📢 *Gà đã khóa không thể bị trộm!*";
                color = "#2C3E50";
                break;
        }

        const updateEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: "Dùng Menu bên dưới để chuyển danh mục" });

        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
    });
} 

}); // ĐÓNG SỰ KIỆN messageCreate

function getSimilarity(str1, str2) {
    // ... (Hàm giữ nguyên như cũ)
    const s1 = str1.toLowerCase().replace(/_/g, " ").replace(/\s+/g, "");
    const s2 = str2.toLowerCase().replace(/_/g, " ").replace(/\s+/g, "");
    if (s1 === s2) return 1.0;
    if (s1.length < 2 || s2.length < 2) return 0;
    const bigrams1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    const bigrams2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));
    let intersect = 0;
    for (let b of bigrams1) { if (bigrams2.has(b)) intersect++; }
    return (2.0 * intersect) / (bigrams1.size + bigrams2.size);
}

client.login(process.env.TOKEN);
