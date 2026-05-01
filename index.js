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

// ================= DATABASE & MONGO CONNECTION =================
const { MongoClient } = require('mongodb');
const uri = process.env.MONGO_URI; // Link Hòa đã dán vào Render
const clientDB = new MongoClient(uri);

let db, usersCol;
let data = {}; // Giữ biến data để các hàm cũ không bị lỗi ngay lập tức

async function connectDB() {
    try {
        await clientDB.connect();
        db = clientDB.db("FarmBot");
        usersCol = db.collection("Players");
        console.log("✅ Đã kết nối MongoDB!");

        // Tải dữ liệu từ mây về biến local để bot chạy mượt
        const allUsers = await usersCol.find({}).toArray();
        allUsers.forEach(u => {
            data[u._id] = u;
        });

        // TỰ ĐỘNG DI CƯ: Nếu có file data.json thì đẩy lên mây
        if (fs.existsSync(DATA_FILE)) {
            const fileData = JSON.parse(fs.readFileSync(DATA_FILE));
            for (const [id, value] of Object.entries(fileData)) {
                if (!data[id]) { // Nếu trên mây chưa có thì mới đẩy lên
                    await usersCol.updateOne(
                        { _id: id },
                        { $set: value },
                        { upsert: true }
                    );
                    data[id] = value;
                }
            }
            console.log("🚀 Đã di cư dữ liệu từ JSON lên MongoDB thành công!");
        }
    } catch (e) {
        console.error("❌ Lỗi DB:", e);
    }
}
connectDB();

// Thay thế hàm saveData cũ thành hàm lưu lên mây
async function saveData(userId) {
    if (!userId) return; 
    await usersCol.updateOne(
        { _id: userId },
        { $set: data[userId] },
        { upsert: true }
    );
}

function getUser(id) {
    if (!data[id]) {
        data[id] = {
            started: false, thoc: 1000, coins: 500, lvGa: 0, lvNo: 0, lvAp: 0,
            eatToday: 0, lastEatReset: 0, trung: { thuong: 10, bac: 5, vang: 2 },
            gaCon: [], dangAp: [], equippedGa: null, lastDaily: 0, lastSteal: 0, lastTrong: 0
        };
    }
    return data[id];
}
// ================= CƠ SỞ DỮ LIỆU GÀ =================
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
//==================HÀM ĐÁNH BOSS===========
let worldBoss = null;
// ================= HÀM TIỆN ÍCH =================
function formatTime(ms) {
    if (ms <= 0) return "Xong!";
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${h > 0 ? h + 'h ' : ''}${m}p ${s}s`;
}

async function updateTopRoles(guild) {
    const TOP_ROLES = { 1: "Trùm Cuối Kê Gia", 2: "Đại Gia Chăn Gà", 3: "Phú Hộ Trại Gà" };
    const sorted = Object.entries(data).filter(([id, u]) => u.started).sort(([, a], [, b]) => b.coins - a.coins).slice(0, 3);
    for (let i = 0; i < 3; i++) {
        const entry = sorted[i]; if (!entry) continue;
        const role = guild.roles.cache.find(r => r.name === TOP_ROLES[i + 1]);
        if (!role) continue;
        try {
            const member = await guild.members.fetch(entry[0]);
            if (member) await member.roles.add(role);
        } catch (e) {}
    }
}

// ================= BOT COMMANDS =================
client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.content.startsWith(":")) return;
    
    const u = getUser(msg.author.id);
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);

    if (u.lastEatReset !== today) { 
        u.eatToday = 0; 
        u.lastEatReset = today; 
    }

    // --- LOGIC TỰ ĐỘNG NỞ TRỨNG ---
    if (u.dangAp && u.dangAp.length > 0) {
        let no = [];
        u.dangAp = u.dangAp.filter(e => {
            if (now >= e.finishAt) {
                for (let i = 0; i < e.amount; i++) {
                    let r = Math.random() * 100;
                    let selectedRarity = "Common ⚪";

                    if (e.type === "vang") {
                        if (r < 0.01) selectedRarity = "Legendary 🟡";
                        else if (r < 1.01) selectedRarity = "Epic 🟣";
                        else if (r < 16) selectedRarity = "Rare 🔵";
                    } else if (e.type === "bac") {
                        if (r < 0.001) selectedRarity = "Legendary 🟡";
                        else if (r < 0.1) selectedRarity = "Epic 🟣";
                        else if (r < 8) selectedRarity = "Rare 🔵";
                    } else {
                        if (r < 1) selectedRarity = "Rare 🔵";
                    }

                    const pureRarity = selectedRarity.split(' ')[0];
                    let pool = GA_LIST.filter(g => g.rarity.includes(pureRarity));
                    if (pool.length === 0) pool = GA_LIST.filter(g => g.rarity.includes("Common"));
                    let g = pool[Math.floor(Math.random() * pool.length)];

                    const stats = {
                        "Common ⚪": { hp: [50, 100], price: [10, 30] },
                        "Rare 🔵":   { hp: [200, 400], price: [200, 500] },
                        "Epic 🟣":   { hp: [1000, 2000], price: [5000, 15000] },
                        "Legendary 🟡": { hp: [8000, 15000], price: [100000, 300000] } 
                    };

                    const s = stats[selectedRarity];
                    u.gaCon.push({ 
                        ...g, 
                        id: Date.now() + Math.random(), 
                        locked: false,
                        rarity: selectedRarity,
                        hp: Math.floor(Math.random() * (s.hp[1] - s.hp[0] + 1)) + s.hp[0],
                        price: Math.floor(Math.random() * (s.price[1] - s.price[0] + 1)) + s.price[0]
                    });
                    no.push(selectedRarity);
                }
                return false;
            } return true;
        });

        if (no.length > 0) {
            saveData(msg.author.id);
            let congrats = `🐣 **KẾT QUẢ ẤP TRỨNG:**\n${no.map(n => `> ✨ Bạn đã nhận được 1 gà **${n}**`).join("\n")}`;
            if (no.some(n => n.includes("Legendary"))) {
                congrats = `🌟 **HUYỀN THOẠI XUẤT HIỆN!** 🌟\nChúc mừng <@${msg.author.id}> đã sở hữu được gà **Legendary 🟡** cực hiếm!!!`;
            }
            msg.reply(congrats);
        }
    }

    // --- LỆNH: :start ---
    if (msg.content === ":start") {
        if (u.started) return msg.reply("🌾 Bạn đã có trang trại rồi!");
        u.started = true;
        u.coins = 500;
        u.thoc = 1000;
        u.gaCon.push({ ...GA_LIST[0], id: Date.now(), locked: false, hp: 50, price: 10 });
        saveData(msg.author.id);
        return msg.reply("🎉 **CHÚC MỪNG!** Bạn đã nhận được mảnh đất đầu tiên và **1 con gà mặc định**.\n👉 Gõ `:thongtin` để xem trang trại hoặc `:chogaan` để bắt đầu kiếm trứng nhé!");
    }
// --- ADMIN GIVE (Bản Nâng Cấp: Xu, Thóc, Trứng, Gà) ---
if (msg.content.startsWith(":give")) {
    if (msg.author.id !== "873867371419422742") return msg.reply("❌ Quyền lực này không thuộc về bạn!");

    const args = msg.content.split(" ");
    const targetUser = msg.mentions.users.first();
    const typeOrName = args[2]?.toLowerCase();
    const r = data[targetUser?.id];

    if (!targetUser || !r) return msg.reply("❌ Cú pháp không hợp lệ hoặc người dùng chưa khởi tạo trang trại!");

    // --- TRƯỜNG HỢP 1: TẶNG VẬT PHẨM CƠ BẢN (Xu, Thóc, Trứng) ---
    // Cú pháp: :give @user <loại> <số lượng>
    if (["xu", "thoc", "thuong", "bac", "vang"].includes(typeOrName)) {
        const amt = parseInt(args[3]);
        if (isNaN(amt) || amt <= 0) return msg.reply("❌ Vui lòng nhập số lượng hợp lệ!");

        if (typeOrName === "xu") {
            r.coins = (r.coins || 0) + amt;
        } else if (typeOrName === "thoc") {
            r.thoc = (r.thoc || 0) + amt;
        } else {
            r.trung[typeOrName] = (r.trung[typeOrName] || 0) + amt;
        }

        saveData(msg.author.id);
        return msg.reply(`🎁 Đã tặng **${amt.toLocaleString()} ${typeOrName}** cho <@${targetUser.id}>!`);
    }

    // --- TRƯỜNG HỢP 2: TẶNG GÀ THIẾT KẾ RIÊNG ---
    // Cú pháp: :give @user <tên_gà> <độ_hiếm> <máu> <atk> <giá> <số_lượng>
    const rarity = args[3];
    const hp = parseInt(args[4]);
    const atk = parseInt(args[5]);
    const price = parseInt(args[6]);
    const amt = parseInt(args[7]) || 1;

    if (!typeOrName || !rarity || isNaN(hp) || isNaN(atk) || isNaN(price)) {
        return msg.reply("❌ **Sai cú pháp!**\n1️⃣ Tặng vật phẩm: `:give @user xu/thoc/thuong/bac/vang <số_lượng>`\n2️⃣ Tặng gà: `:give @user <tên_gà> <độ_hiếm> <máu> <atk> <giá> <số_lượng>`");
    }

    const cleanName = typeOrName.replace(/_/g, " ");
    for (let i = 0; i < amt; i++) {
        const customGa = {
            id: Date.now() + i,
            name: cleanName,
            rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
            hp: hp,
            atk: atk,
            price: price,
            locked: false
        };
        r.gaCon.push(customGa);
    }

    saveData(msg.author.id);
    return msg.reply(`🎁 **QUÀ ĐẶC BIỆT!**\nĐã tặng **${amt}** con **${cleanName}** cho <@${targetUser.id}> thành công!`);
}
// --- LỆNH: NÂNG CẤP ĐỒNG BỘ GIÁ LŨY TIẾN ---
if (msg.content === ":upga" || msg.content === ":upthoc" || msg.content === ":upaptrung") {
    let typeName = "";
    let key = "";
    
    if (msg.content === ":upga") { typeName = "Tỉ lệ trứng hiếm"; key = "lvGa"; }
    else if (msg.content === ":upthoc") { typeName = "Kho thóc"; key = "lvNo"; }
    else { typeName = "Máy ấp trứng"; key = "lvAp"; }

    let currentLv = u[key] || 0;
    if (currentLv >= 10) return msg.reply(`✨ **${typeName}** đã đạt cấp tối đa (Lv.10)!`);

    let cost = Math.pow(currentLv + 1, 2) * 2000; 

    if (u.coins < cost) {
        return msg.reply(`❌ Bạn thiếu **${(cost - u.coins).toLocaleString()} Coins** để nâng cấp ${typeName}.\n💰 Giá nâng cấp Lv.${currentLv + 1} là: **${cost.toLocaleString()} Coins**.`);
    }

    u.coins -= cost;
    u[key] = currentLv + 1;
    saveData(msg.author.id);
    
    return msg.reply(`🚀 Nâng cấp thành công! **${typeName}** đã lên **Lv.${u[key]}**.\n💸 Bạn đã chi: **${cost.toLocaleString()} Coins**.`);
}
// --- LỆNH: GIAO DỊCH GÀ (TRADE) ---
if (msg.content.startsWith(":trade")) {
    const target = msg.mentions.users.first();
    if (!target || target.id === msg.author.id || target.bot) return msg.reply("❌ Tag người chơi bạn muốn giao dịch!");

    const u1 = data[msg.author.id];
    const u2 = data[target.id];
    if (!u2 || !u2.started) return msg.reply("❌ Đối phương chưa bắt đầu chơi!");

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
    const collector = tradeMsg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id && i.user.id !== target.id) return i.reply({ content: "Nút này không dành cho bạn!", ephemeral: true });

        const myTrade = tradeData[i.user.id];
        const myDb = data[i.user.id];

        if (myTrade.confirmed && i.customId !== 'trade_cancel') return i.reply({ content: "Đã chốt không thể sửa!", ephemeral: true });

        if (i.customId === 'trade_ga') {
            const availableGa = myDb.gaCon.filter(g => !g.locked);
            if (availableGa.length === 0) return i.reply({ content: "Chuồng bạn không có gà hợp lệ!", ephemeral: true });

            const select = new StringSelectMenuBuilder().setCustomId('sel_ga').setPlaceholder('Chọn gà...')
                .addOptions(availableGa.slice(0, 25).map(g => ({ label: `${g.name} (${g.rarity})`, value: g.id.toString() })));
            return i.reply({ content: "Chọn gà muốn thêm:", components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
        }

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

        if (i.isStringSelectMenu()) {
            const chicken = myDb.gaCon.find(g => g.id.toString() === i.values[0]);
            if (!myTrade.items.some(it => it.id === chicken.id)) {
                myTrade.items.push(chicken);
                await i.update({ content: `✅ Đã thêm \`${chicken.name}\`!`, components: [] });
                return tradeMsg.edit({ embeds: [generateEmbed()] });
            }
            return i.update({ content: "Gà này đã có trên bàn trade!", components: [] });
        }

        if (i.customId === 'trade_confirm') {
            myTrade.confirmed = true;
            if (tradeData[msg.author.id].confirmed && tradeData[target.id].confirmed) {
                const u1Tr = tradeData[msg.author.id]; const u2Tr = tradeData[target.id];
                u1.coins -= u1Tr.coins; u1.coins += u2Tr.coins;
                u2.coins -= u2Tr.coins; u2.coins += u1Tr.coins;
                u1.thoc -= u1Tr.thoc; u1.thoc += u2Tr.thoc;
                u2.thoc -= u2Tr.thoc; u2.thoc += u1Tr.thoc;
                u1Tr.items.forEach(it => { u1.gaCon = u1.gaCon.filter(g => g.id !== it.id); u2.gaCon.push(it); });
                u2Tr.items.forEach(it => { u2.gaCon = u2.gaCon.filter(g => g.id !== it.id); u1.gaCon.push(it); });

                saveData(msg.author.id); collector.stop();
                return i.update({ content: "🎊 **GIAO DỊCH THÀNH CÔNG!**", embeds: [generateEmbed()], components: [] });
            }
        } else if (i.customId === 'trade_cancel') {
            collector.stop();
            return i.update({ content: `🚫 Giao dịch bị hủy bởi <@${i.user.id}>`, embeds: [], components: [] });
        }
        await i.update({ embeds: [generateEmbed()] });
    });
}
// --- TÍNH NĂNG ĐÁ GÀ (PVP) - BẢN TINH CHỈNH ---
if (msg.content.startsWith(":daga")) {
    const p1 = msg.author;
    const p2 = msg.mentions.users.first();

    if (!p2 || p2.id === p1.id || p2.bot) return msg.reply("❌ Bạn cần tag một người chơi khác để thách đấu!");
    
    const u1 = getUser(p1.id);
    const u2 = getUser(p2.id);

    if (!u2.started) return msg.reply("❌ Đối thủ của bạn chưa bắt đầu hành trình nuôi gà!");
    if (!u1.equippedGa || !u2.equippedGa) return msg.reply("❌ Cả hai đều phải trang bị gà chiến (`:thongtin`) trước khi đá!");
    if (u1.coins < 200 || u2.coins < 200) return msg.reply("❌ Cả hai cần tối thiểu 200 Xu để tham gia!");

    const challengeEmbed = new EmbedBuilder()
        .setTitle("⚔️ LỜI THÁCH ĐẤU RỰC LỬA")
        .setThumbnail("https://i.imgur.com/8QO5W5F.png")
        .setDescription(`<@${p1.id}> đem chiến kê **${u1.equippedGa.name}** thách đấu với **${u2.equippedGa.name}** của <@${p2.id}>!\n\n` +
                        `💰 **Mức cược:** Người thua mất **200 Xu** viện phí.\n` +
                        `🎁 **Phần thưởng:** **200 Thóc** & **100 Xu** cho người thắng.`)
        .setColor("#FF4500")
        .setFooter({ text: "Bạn có 30 giây để xác nhận!" });

    const rowAccept = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('accept_daga').setLabel('Chấp Nhận').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('decline_daga').setLabel('Từ Chối').setStyle(ButtonStyle.Danger)
    );

    const reply = await msg.reply({ embeds: [challengeEmbed], components: [rowAccept] });

    const collectorAccept = reply.createMessageComponentCollector({ 
        filter: i => i.user.id === p2.id, 
        time: 30000, 
        max: 1 
    });

    collectorAccept.on('collect', async i => {
        if (i.customId === 'decline_daga') {
            return i.update({ content: "🚫 Thách đấu đã bị từ chối.", embeds: [], components: [] });
        }

        let turn = p1.id;
        let scores = { [p1.id]: 0, [p2.id]: 0 };
        const maxScore = 3;

        const updateGame = async (interaction, log) => {
            const gameEmbed = new EmbedBuilder()
                .setTitle("🏟️ TRƯỜNG GÀ ĐANG RỰC LỬA")
                .setDescription(`${log}\n\n**Tỉ số trận đấu:**\n🔴 <@${p1.id}>: ${"⭐".repeat(scores[p1.id])}${"⚫".repeat(maxScore-scores[p1.id])}\n🔵 <@${p2.id}>: ${"⭐".repeat(scores[p2.id])}${"⚫".repeat(maxScore-scores[p2.id])}`)
                .addFields({ name: "Lượt tấn công", value: `⚡ <@${turn}>` })
                .setColor(turn === p1.id ? "#FF0000" : "#0000FF")
                .setFooter({ text: "Nhấn nút 'ĐÁ!' để ra đòn" });

            const rowKick = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('kick_action').setLabel('ĐÁ!').setStyle(ButtonStyle.Primary)
            );

            await interaction.update({ embeds: [gameEmbed], components: [rowKick] });
        };

        await updateGame(i, `🥊 **Trận đấu bắt đầu!** <@${p1.id}> ra đòn trước.`);

        const gameCollector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000 // Trận đấu tối đa 2 phút
        });

        gameCollector.on('collect', async gi => {
            if (gi.user.id !== turn) return gi.reply({ content: "⏳ Chưa đến lượt bạn!", ephemeral: true });

            const hits = [
                "💥 **Cú đá hiểm hóc!** Một đòn trời giáng vào đầu đối thủ!",
                "⚡ **Phản xạ nhanh!** Gà của bạn tung cú đá móc cực đỉnh!",
                "🔥 **Tuyệt kỹ!** Đối phương không kịp né tránh đòn tấn công."
            ];
            const misses = [
                "🌬️ **Hụt rồi!** Con gà của bạn vừa đá vào không khí.",
                "💨 **Quá chậm!** Đối thủ đã nhanh chân né được đòn này.",
                "🥴 **Lạng quạng!** Gà của bạn đá trượt và suýt ngã."
            ];

            const isHit = Math.random() < 0.5;
            let log = isHit ? hits[Math.floor(Math.random() * hits.length)] : misses[Math.floor(Math.random() * misses.length)];

            if (isHit) scores[turn]++;

            if (scores[turn] >= maxScore) {
                gameCollector.stop();
                const winnerId = turn;
                const loserId = turn === p1.id ? p2.id : p1.id;
                
                const winU = getUser(winnerId);
                const loseU = getUser(loserId);

                winU.thoc += 200; winU.coins += 100; loseU.coins -= 200;
                saveData(msg.author.id);

                const winEmbed = new EmbedBuilder()
                    .setTitle("🏆 CHIẾN THẮNG VANG DỘI")
                    .setDescription(`Chúc mừng <@${winnerId}> đã thắng cuộc!\n\n🎁 **Thưởng:** +200 Thóc, +100 Xu\n🚑 **Hình phạt:** <@${loserId}> mất 200 Xu viện phí.`)
                    .setThumbnail("https://i.imgur.com/39DbeHk.png")
                    .setColor("#FFD700");

                return gi.update({ embeds: [winEmbed], components: [] });
            }

            turn = turn === p1.id ? p2.id : p1.id;
            await updateGame(gi, log);
        });

        gameCollector.on('end', (collected, reason) => {
            if (reason === 'time') reply.edit({ content: "⏰ Trận đấu bị hủy do quá lâu không ai ra đòn!", components: [] });
        });
    });
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
        saveData(msg.author.id);

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
// --- LỆNH CHO GÀ ĂN ---
    if (msg.content.startsWith(":chogaan")) {
        const args = msg.content.split(" ");
        let sl = args[1] === "all" ? Math.floor(u.thoc / 50) : parseInt(args[1]);
        if (isNaN(sl) || sl <= 0) return msg.reply("❌ Cú pháp: `:chogaan <số lượng/all>`");
        if (u.thoc < sl * 50) return msg.reply("❌ Thiếu thóc!");
        u.thoc -= sl * 50;
        let nhan = { thuong: 0, bac: 0, vang: 0 };
        for (let i = 0; i < sl; i++) {
            let r = Math.random();
            if (r < 0.01) nhan.vang++; else if (r < 0.07) nhan.bac++; else nhan.thuong++;
        }
        u.trung.thuong += nhan.thuong; u.trung.bac += nhan.bac; u.trung.vang += nhan.vang;
        saveData(msg.author.id);
        msg.reply(`🌾 Đã dùng ${sl * 50} thóc. Thu về: 🥚 ${nhan.thuong} Thường, 🥈 ${nhan.bac} Bạc, 🥇 ${nhan.vang} Vàng.`);
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
const s = enemy.gaCon.pop(); u.gaCon.push(s); saveData(msg.author.id); coll.stop();
return m.reply(`🎊 **THÀNH CÔNG!** Trộm được **${s.name}**`);
} else if (coll.collected.size >= 5) {
u.coins = Math.max(0, u.coins - 200); saveData(msg.author.id);
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

    saveData(msg.author.id);
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

    saveData(msg.author.id);
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
    saveData(msg.author.id);

    // 6. Thông báo kết quả
    let response = `💰 Đã bán thành công **${canSell.length}** gà hệ **${targetRarity}**.\n✅ Thu về: **${totalMoney.toLocaleString()} Xu**.`;
    if (lockedCount > 0) {
        response += `\n⚠️ Lưu ý: Đã giữ lại **${lockedCount}** con gà đang khóa.`;
    }

    return msg.reply(response);
}
if (msg.content === ":daily") {
    const u = data[msg.author.id];
    const now = Date.now();
    const cooldown = 7200000; // 2 giờ tính bằng milliseconds

    if (now - u.lastDaily < cooldown) {
        const timeLeft = cooldown - (now - u.lastDaily); // Thời gian còn lại tính bằng ms
        
        // Chuyển đổi ms sang phút và giây
        const minutes = Math.floor(timeLeft / 60000);
        const seconds = Math.floor((timeLeft % 60000) / 1000);
        
        return msg.reply(`⏳ Bạn đã điểm danh rồi! Hãy quay lại sau **${minutes} phút ${seconds} giây** nữa.`);
    }

    // Nếu đã hết thời gian chờ
    u.thoc = (u.thoc || 0) + 500; 
    u.lastDaily = now; 
    saveData(msg.author.id); // Lưu lại dữ liệu toàn cục
    
    return msg.reply("🌾 **Chúc mừng!** Bạn đã nhận được **500 Thóc** cho ngày hôm nay.");
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

    saveData(msg.author.id);
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

    saveData(msg.author.id);

    // Kiểm tra xem sau khi trừ có đợt nào nở luôn không
    const willHatch = u.dangAp.some(trung => now >= trung.finishAt);

    return msg.reply(`⏩ **TĂNG TỐC THÀNH CÔNG!**\n💰 Chi phí: **${skipCost} Xu**\n⏱️ Đã giảm **45 phút** thời gian chờ cho các trứng đang ấp.\n${willHatch ? "🐣 Một số trứng đã đủ thời gian, hãy nhắn tin tiếp theo để nhận gà!" : "⏳ Trứng vẫn cần thêm thời gian để nở."}`);
}
// --- LỆNH: XEM CHUỒNG GÀ (PHÂN TRANG & HIỂN THỊ CHỈ SỐ) ---
if (msg.content === ":chuonga") {
    const u = data[msg.author.id];
    if (!u || u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à! Đi ấp trứng ngay đi.");

    const pageSize = 5; 
    let page = 0;
    const totalPages = Math.ceil(u.gaCon.length / pageSize);

    const generateChuongMessage = (p) => {
        const start = p * pageSize;
        const chickens = u.gaCon.slice(start, start + pageSize);
        
        const list = chickens.map((g, i) => {
            const lockIcon = g.locked ? "🔒" : "🔓";
            const isEquipped = u.equippedGa && u.equippedGa.id === g.id ? " ✅ `[ĐANG DÙNG]`" : "";
            const hp = g.hp || 50;
            const atk = g.atk || Math.floor(hp / 10);
            
            return `**${start + i + 1}. ${g.name}** ${lockIcon}${isEquipped}\n` +
                   `└ ✨ Hệ: \`${g.rarity}\` | ❤️ HP: \`${hp}\` | 💪 ATK: \`${atk}\` | 💰 Giá: \`${(g.price || 10).toLocaleString()}\``;
        }).join("\n\n");

        const embed = new EmbedBuilder()
            .setTitle(`🏡 CHUỒNG GÀ CỦA ${msg.author.username}`)
            .setDescription(list)
            .setColor("#F1C40F")
            .setFooter({ text: `Trang ${p + 1}/${totalPages} | Tổng cộng: ${u.gaCon.length} con` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('next_page').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(p === totalPages - 1)
        );

        return { embeds: [embed], components: totalPages > 1 ? [row] : [] };
    };

    const chuongMsg = await msg.reply(generateChuongMessage(page));
    if (totalPages <= 1) return;

    const collector = chuongMsg.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 60000 });
    collector.on('collect', async i => {
        if (i.customId === 'next_page') page++;
        else if (i.customId === 'prev_page') page--;
        await i.update(generateChuongMessage(page));
    });
}
// --- HỆ THỐNG WORLD BOSS (LỆNH CHUẨN) ---
if (msg.content.startsWith(":spawnboss")) {
    // Kiểm tra quyền Admin bằng ID trực tiếp
    if (!["873867371419422742"].includes(msg.author.id)) {
        return msg.reply("❌ Bạn không có quyền năng triệu hồi thực thể này!");
    }

    // Ngăn chặn tạo chồng Boss nếu con cũ chưa chết
    if (worldBoss) {
        return msg.reply("⚠️ Một con Boss đang tồn tại! Hãy tiêu diệt nó trước khi triệu hồi con mới.");
    }

    // Xử lý lấy số máu từ lệnh (Ví dụ: :spawnboss 50000)
    const args = msg.content.split(" ");
    let hpInput = parseInt(args[1]);

    // Nếu không nhập máu hoặc nhập sai, mặc định ngẫu nhiên 7k - 19k
    if (isNaN(hpInput) || hpInput <= 0) {
        hpInput = Math.floor(Math.random() * (19000 - 7000 + 1)) + 7000;
    }

    // Khởi tạo đối tượng Boss
    worldBoss = {
        name: "Gà Khổng Lồ Phẫn Nộ",
        hp: hpInput,
        maxHp: hpInput,
        contributors: {} // Lưu sát thương của từng người chơi
    };

    // Gửi thông báo đến TOÀN BỘ máy chủ mà Bot đang tham gia (Global Notification)
    client.guilds.cache.forEach(guild => {
        const channel = guild.channels.cache.find(ch => 
            ch.type === 0 && // Kênh văn bản
            ch.permissionsFor(guild.members.me).has("SendMessages")
        );

        if (channel) {
            channel.send(`📢 **THÔNG BÁO TOÀN CẦU** 📢\n🔥 **BOSS THẾ GIỚI ĐÃ XUẤT HIỆN!** 🔥\n👾 **Thực thể:** ${worldBoss.name}\n❤️ **Lượng máu:** ${worldBoss.hp.toLocaleString()}\n⚔️ Hãy dùng lệnh \`:attack\` để cùng các trang trại khác tiêu diệt nó!`);
        }
    });
    return;
}

// 2. LỆNH TẤN CÔNG BOSS
if (msg.content === ":attack") {
    // Kiểm tra xem có Boss đang xuất hiện không
    if (!worldBoss) {
        return msg.reply("📭 Hiện không có Boss nào xuất hiện. Hãy đợi Admin triệu hồi!");
    }

    const u = data[msg.author.id];
    // Kiểm tra người chơi đã gõ :start và có gà trang bị chưa
    if (!u || !u.equippedGa) {
        return msg.reply("❌ Bạn cần trang bị một con gà chiến (`:equip`) mới có thể tham chiến!");
    }

    // Tính toán sát thương (Mặc định 10 nếu gà không có thuộc tính atk)
    const damage = u.equippedGa.atk || 10;
    
    // Trừ máu Boss và ghi nhận đóng góp
    worldBoss.hp -= damage;
    worldBoss.contributors[msg.author.id] = (worldBoss.contributors[msg.author.id] || 0) + damage;

    // KIỂM TRA NẾU BOSS BỊ TIÊU DIỆT
    if (worldBoss.hp <= 0) {
        let winnerMsg = `🎊 **BOSS ${worldBoss.name.toUpperCase()} ĐÃ BỊ TIÊU DIỆT TOÀN CẦU!** 🎊\n\n**🏆 BẢNG VÀNG SÁT THƯƠNG:**\n`;
        
        // Duyệt danh sách những người đã đánh Boss để chia thưởng
        for (const [id, dmg] of Object.entries(worldBoss.contributors)) {
            const reward = dmg * 2; // Tỉ lệ thưởng: 1 dame = 2 xu
            
            if (data[id]) {
                data[id].coins = (data[id].coins || 0) + reward;
            }
            winnerMsg += `<@${id}>: **${dmg.toLocaleString()}** dame ➔ Nhận **${reward.toLocaleString()}** Coins\n`;
        }

        // Gửi thông báo chiến thắng đến tất cả các server
        client.guilds.cache.forEach(guild => {
            const channel = guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has("SendMessages"));
            if (channel) channel.send(winnerMsg);
        });

        // Reset trạng thái Boss và lưu dữ liệu người dùng
        worldBoss = null;
        saveData(msg.author.id); // Đảm bảo hàm saveData() của bạn hoạt động để lưu xu vào file JSON
        return;
    }

    // Phản hồi sát thương tại kênh người chơi vừa gõ lệnh
    return msg.reply(`⚔️ Gà của bạn tung đòn gây **${damage}** sát thương!\n🩸 Máu Boss còn: **${worldBoss.hp.toLocaleString()}/${worldBoss.maxHp.toLocaleString()}**`);
}
// --- LỆNH: BÁN TRỨNG ---
if (msg.content.startsWith(":selltrung")) {
    const u = data[msg.author.id]; 
    if (!u) return msg.reply("❌ Bạn chưa có trang trại! Hãy gõ `:start`.");

    const args = msg.content.split(" ");
    const loai = args[1]; 
    const sl = parseInt(args[2]);

    if (!loai || isNaN(sl) || sl <= 0) return msg.reply("❌ Cú pháp: `:selltrung <thuong/bac/vang> <số lượng>`");
    if (!u.trung[loai] || u.trung[loai] < sl) return msg.reply(`❌ Bạn không đủ trứng ${loai} để bán!`);

    const gia = { thuong: 10, bac: 50, vang: 200 }; 
    const tienThu = sl * gia[loai];

    u.trung[loai] -= sl;
    u.coins = (u.coins || 0) + tienThu;
    saveData(msg.author.id);
    return msg.reply(`💰 Bạn đã bán **${sl} trứng ${loai}** và thu về **${tienThu.toLocaleString()} Coins**!`);
}
// --- LỆNH: KIỂM TRA RUỘNG LÚA (Đã sửa lỗi khai báo u) ---
if (msg.content === ":ruong") {
    const u = data[msg.author.id]; // Khai báo u
    if (!u) return;

    const requiredLv = 4;
    if ((u.lvGa || 0) < requiredLv) {
        return msg.reply(`❌ **Ruộng chưa khai hoang!** Bạn cần nâng cấp **:upga** lên **Lv.4** để mở khóa đất canh tác.`);
    }

    const now = Date.now();
    const cdTrong = 30 * 60 * 1000; 
    const lastTrong = u.lastTrong || 0;
    const timePassed = now - lastTrong;
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

    const ruongEmbed = new EmbedBuilder() // Dùng EmbedBuilder thay vì text thuần để đẹp hơn
        .setTitle("🚜 QUẢN LÝ ĐIỀN TRANG")
        .setColor("#F1C40F")
        .setDescription(`📊 Trạng thái: ${status}\n⏲️ Tiến độ: \`${progressStr}\`\n\n📦 **Giới hạn ruộng (Lv.${u.lvNo || 0}):**\n└ Tối đa thu hoạch: **${maxThoc.toLocaleString()} Thóc/vụ**\n\n💡 *Nâng cấp \`:upthoc\` để tăng sản lượng!*`);

    return msg.reply({ embeds: [ruongEmbed] });
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
    saveData(msg.author.id);

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
    saveData(msg.author.id);

    return msg.reply(`🌾 **Trúng mùa!** Bạn đã thu hoạch được **${thuHoach.toLocaleString()} thóc**.\n(Giới hạn ruộng hiện tại: ${maxThocPerVụ})`);
}
// --- HỆ THỐNG MENU HELP (CẬP NHẬT) ---
if (msg.content === ":help") {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Chọn danh mục bạn muốn xem...')
        .addOptions([
            { label: 'Hướng Dẫn Tân Thủ', value: 'basic', emoji: '🔰' },
            { label: 'Nuôi Dưỡng & Sản Xuất', value: 'feed', emoji: '🌾' },
            { label: 'Ấp Trứng & Quản Lý', value: 'hatch', emoji: '🥚' },
            { label: 'Nâng Cấp Công Trình', value: 'upgrade', emoji: '🏗️' },
            { label: 'Giao Thương & Chợ Gà', value: 'market_trade', emoji: '🤝' },
            { label: 'Sự Kiện World Boss', value: 'world_boss', emoji: '🔥' }, // Tùy chọn mới
            { label: 'Hoạt Động Ngầm', value: 'steal', emoji: '🕵️' },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const helpEmbed = new EmbedBuilder()
        .setTitle("📒 CUỐN CẨM NANG CHICKEN EMPIRE")
        .setColor("#FFD700")
        .setDescription("✨ **Chào mừng chủ trang trại!**\nDưới đây là toàn bộ bí kíp để bạn xây dựng đế chế gà của mình.");

    const response = await msg.reply({ embeds: [helpEmbed], components: [row] });
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) return i.reply({ content: "❌ Bạn không thể điều khiển menu này!", ephemeral: true });

        let title = "", desc = "", color = "#3498DB";
        switch (i.values[0]) {
            case 'basic':
                title = "🚜 DANH MỤC: TÂN THỦ";
                desc = ">>> 🔰 `:start`: Khởi tạo trang trại.\n💰 `:daily`: Nhận 500 thóc.\n📊 `:thongtin`: Xem ví tiền.";
                break;
            case 'feed':
                title = "🌾 NUÔI DƯỠNG & SẢN XUẤT";
                desc = ">>> 🥗 `:chogaan`: Cho gà ăn.\n🌱 `:ruong`: Xem ruộng lúa.\n🌾 `:thuhoach`: Gặt lúa.";
                color = "#FFA500";
                break;
            case 'hatch':
                title = "🥚 ẤP TRỨNG & QUẢN LÝ";
                desc = ">>> 🐣 `:aptrung`: Ấp trứng ngẫu nhiên.\n🏡 `:chuonga`: Xem danh sách gà.\n💰 `:selltrung`: Bán trứng kiếm tiền.";
                color = "#F1C40F";
                break;
            case 'upgrade':
                title = "🏗️ DANH MỤC: NÂNG CẤP";
                desc = ">>> 🏚️ `:upga`: Nâng cấp chuồng.\n🏭 `:upaptrung`: Nâng cấp máy ấp.\n📦 `:upthoc`: Nâng cấp kho thóc.";
                color = "#95A5A6";
                break;
            case 'trade':
                title = "🤝 GIAO THƯƠNG & CHỢ GÀ";
                desc = ">>> 📦 `:trade`: Giao dịch trực tiếp với người chơi.";
                color = "#2ECC71";
                break;
            case 'world_boss': // Cập nhật nội dung Boss Thế Giới
                title = "🔥 SỰ KIỆN: WORLD BOSS";
                desc = ">>> ⚔️ `:attack`: Tấn công Boss khi nó xuất hiện.\n🏆 Boss chết sẽ chia thưởng theo sát thương gây ra.\n📢 Hãy chú ý thông báo từ Admin!";
                color = "#E74C3C";
                break;
            case 'steal':
                title = "🕵️ HOẠT ĐỘNG NGẦM";
                desc = ">>> 🥷 `:steal`: Đi ăn trộm thóc hàng xóm.\n⚠️ Cẩn thận kẻo bị phạt tiền!";
                color = "#34495E";
                break;
            default:
                title = "Chức năng đang cập nhật";
                desc = "Vui lòng đợi phiên bản sau!";
        }

        const updateEmbed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color);
        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
    });
}
}); 
function getSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().replace(/_/g, " ").replace(/\s+/g, "");
    const s2 = str2.toLowerCase().replace(/_/g, " ").replace(/\s+/g, "");
    if (s1 === s2) return 1.0;
    const bigrams1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    const bigrams2 = new Set();
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));
    let intersect = 0;
    for (let b of bigrams1) { if (bigrams2.has(b)) intersect++; }
    return (2.0 * intersect) / (bigrams1.size + bigrams2.size);
}

client.login(process.env.TOKEN);
