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
const BOSS_CHANNELS = ["1499490019541516328", "1499437145637781765", "1499437209017647235"];
const BOSS_IMAGE = "https://gamek.vn/anime-ga-chien-dang-tro-thanh-hien-tuong-nho-cot-truyen-bao-thu-cuc-gat-178260325160608042.chn"; // Hoặc link ảnh Boss bạn muốn
const DATA_FILE = './data.json';
let currentSpecialShop = null;

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
client.on('error', (err) => {
   console.error('Lỗi WebSocket nè Hòa ơi:', err.message);
});
// --- SỰ KIỆN: TỰ CẤP ROLE KHI CÓ THÀNH VIÊN MỚI VÀO SERVER ---
client.on("guildMemberAdd", async (member) => {
    const roleID = "1499451733888335913"; // ID Role Duy Hòa cung cấp

    // 1. Tìm role trong máy chủ mà người chơi vừa tham gia
    const role = member.guild.roles.cache.get(roleID);

    if (!role) {
        return console.log(`❌ Không tìm thấy Role ID ${roleID} tại máy chủ: ${member.guild.name}`);
    }

    // 2. Tiến hành cấp role ngay lập tức
    try {
        await member.roles.add(role);
        console.log(`✅ Đã tự động cấp role ${role.name} cho thành viên mới: ${member.user.tag}`);
        
        // (Tùy chọn) Gửi lời chào mừng kèm thông báo đã cấp role
        const welcomeChannel = member.guild.systemChannel; // Hoặc tìm channel cụ thể theo ID
        if (welcomeChannel) {
            welcomeChannel.send(`Chào mừng <@${member.user.id}> gia nhập máy chủ! Bạn đã được cấp role **${role.name}** tự động. 🌾`);
        }
    } catch (e) {
        console.log(`❌ Lỗi cấp role tự động cho ${member.user.tag}: ` + e.message);
        console.log("👉 Nhắc Nhở: Hãy kiểm tra xem role của Bot đã nằm TRÊN role này chưa nhé!");
    }
});
// Thay thế hàm saveData cũ thành hàm lưu lên mây
async function saveData(userId) {
    if (!userId) return; 
    await usersCol.updateOne(
        { _id: userId },
        { $set: data[userId] },
        { upsert: true }
    );
}
function cleanText(str) {
    return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Bỏ dấu
        .replace(/\s+/g, ""); // Bỏ hết khoảng cách
}

// Hàm tính độ tương đồng (Dice's Coefficient - đơn giản và hiệu quả hơn cho tên ngắn)
function similarity(s1, s2) {
    let longer = s1.length < s2.length ? s2 : s1;
    let shorter = s1.length < s2.length ? s1 : s2;
    if (longer.length === 0) return 1.0;
    
    // Nếu chuỗi này nằm trong chuỗi kia (ví dụ gõ "chien" trong "chien than")
    if (longer.includes(shorter)) return 0.85; 

    // Thuật toán so khớp cơ bản
    let count = 0;
    for (let char of shorter) {
        if (longer.includes(char)) count++;
    }
    return count / longer.length;
}
function getUser(id) {
    if (!data[id]) {
        data[id] = {
            started: false, 
            thoc: 1000, 
            coins: 500, 
            lvGa: 0, 
            lvNo: 0, 
            lvAp: 0,
            eatToday: 0, 
            lastEatReset: 0, 
            trung: { thuong: 10, bac: 0, vang: 0 },
            gaCon: [], 
            dangAp: [], 
            equippedGa: null, 
            lastDaily: 0, 
            lastSteal: 0, 
            lastTrong: 0,
            // THÊM DÒNG NÀY VÀO ĐÂY:
            inventory: { ve_restart: 0, trung_god: 0, hop_bi_an: 0 } 
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

    if (new Date(u.lastEatReset).getTime() !== today.getTime()) {
        u.eatToday = 0; 
        u.lastEatReset = today; 
    }

    // --- LOGIC TỰ ĐỘNG NỞ TRỨNG (PHÂN CẤP TỈ LỆ & DECOR VIP) ---
if (u.dangAp && u.dangAp.length > 0) {
    let no = [];
    u.dangAp = u.dangAp.filter(e => {
        if (now >= e.finishAt) {
            for (let i = 0; i < e.amount; i++) {
                let r = Math.random() * 100;
                let selectedRarity = "Common ⚪";

                // 1. Phân cấp tỉ lệ theo loại trứng
                if (e.type === "vang") {
                    if (r < 0.01) selectedRarity = "Legendary 🟡"; // 0.01% - Siêu hiếm
                    else if (r < 1.01) selectedRarity = "Epic 🟣"; // 1%
                    else if (r < 16) selectedRarity = "Rare 🔵";   // 15%
                } else if (e.type === "bac") {
                    if (r < 0.001) selectedRarity = "Legendary 🟡"; // 0.001% - Cực khó
                    else if (r < 0.1) selectedRarity = "Epic 🟣";   // 0.1%
                    else if (r < 8) selectedRarity = "Rare 🔵";     // ~8%
                } else {
                    // Trứng thường chủ yếu là Common, Rare cực ít
                    if (r < 1) selectedRarity = "Rare 🔵"; 
                }

                const pureRarity = selectedRarity.split(' ')[0];
                let pool = GA_LIST.filter(g => g.rarity.includes(pureRarity));
                if (pool.length === 0) pool = GA_LIST.filter(g => g.rarity.includes("Common"));
                let g = pool[Math.floor(Math.random() * pool.length)];

                const stats = {
                    "Common ⚪": { hp: [50, 100], price: [10, 30], color: "#95a5a6" },
                    "Rare 🔵":   { hp: [200, 400], price: [200, 500], color: "#3498db" },
                    "Epic 🟣":   { hp: [1000, 2000], price: [5000, 15000], color: "#9b59b6" },
                    "Legendary 🟡": { hp: [8000, 15000], price: [100000, 300000], color: "#f1c40f" } 
                };

                const s = stats[selectedRarity];
                const newGa = { 
                    ...g, 
                    id: Date.now() + Math.random(), 
                    locked: false,
                    rarity: selectedRarity,
                    hp: Math.floor(Math.random() * (s.hp[1] - s.hp[0] + 1)) + s.hp[0],
                    price: Math.floor(Math.random() * (s.price[1] - s.price[0] + 1)) + s.price[0]
                };
                u.gaCon.push(newGa);
                no.push(newGa);
            }
            return false;
        } return true;
    });

    if (no.length > 0) {
        saveData(msg.author.id);

        const hasLegendary = no.some(g => g.rarity.includes("Legendary"));
        const hasEpic = no.some(g => g.rarity.includes("Epic"));

        const embed = new EmbedBuilder()
            .setTimestamp();

        // 2. Thiết kế Decor theo độ hiếm
        if (hasLegendary) {
            embed.setTitle("✨ NGUYÊN TỬ LỰC: HUYỀN THOẠI GIÁNG TRẦN! ✨")
                 .setColor("#f1c40f")
                 .setThumbnail("https://i.imgur.com/8E9p6fS.gif") // GIF rực rỡ cho Leg
                 .setDescription(`🎊 Chúc mừng bạn đã phá vỡ mọi giới hạn!\n\n` + 
                    no.map(g => `**${g.name}** \`${g.rarity}\`\n└ ❤️ HP: \`${g.hp}\` | 💰 Giá: \`${g.price.toLocaleString()}\``).join("\n\n"));
            
            return msg.reply({ content: `🌟 **THÔNG BÁO CHẤN ĐỘNG!** <@${msg.author.id}>`, embeds: [embed] });
        } 
        
        if (hasEpic) {
            embed.setTitle("🟣 SIÊU CẤP XUẤT HIỆN!")
                 .setColor("#9b59b6")
                 .setDescription(no.map(g => `**${g.name}** \`${g.rarity}\`\n└ ❤️ HP: \`${g.hp}\` | 💰 Giá: \`${g.price.toLocaleString()}\``).join("\n\n"));
            return msg.reply({ embeds: [embed] });
        }

        // Mặc định cho Common/Rare
        embed.setTitle("🐣 KẾT QUẢ ẤP TRỨNG")
             .setColor("#2ecc71")
             .setDescription(no.map(g => `**${g.name}** \`${g.rarity}\`\n└ ❤️ HP: \`${g.hp}\``).join("\n\n"));
        
        return msg.reply({ embeds: [embed] });
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
// --- LỆNH: GIAO DỊCH GÀ (TRADE) - BẢN FIX TRIỆT ĐỂ LỖI MENU ---
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
            return `\`\`\`yaml\n` +
                   `💰 Xu:     ${d.coins.toLocaleString()}\n` +
                   `🌾 Thóc:   ${d.thoc.toLocaleString()}\n` +
                   `🛖 Chuồng: ${d.items.length > 0 ? d.items.map(g => g.name).join(", ") : "Trống"}\n` +
                   `--------------------------\n` +
                   `${d.confirmed ? "✅ TRẠNG THÁI: ĐÃ KÝ" : "⏳ TRẠNG THÁI: CHỜ..."}\n` +
                   `\`\`\` `;
        };
        
        return new EmbedBuilder()
            .setTitle("🤝 TRUNG TÂM GIAO DỊCH CHIẾN KÊ 🤝")
            .setDescription("> *Cẩn thận trong từng giao kèo, chuồng gà của bạn đang nằm trên bàn đàm phán!*")
            .setColor("#E67E22")
            .addFields(
                { name: `🔏 CHỦ CHUỒNG: ${msg.author.username}`, value: createField(msg.author.id), inline: true },
                { name: `🔏 CHỦ CHUỒNG: ${target.username}`, value: createField(target.id), inline: true }
            )
            // ĐỔI THÀNH ẢNH ĐẠI DIỆN CỦA BOT
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setTimestamp()
            .setFooter({ text: "Hệ thống bảo mật chuồng gà 🐔" });
    };

    const mainRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('trade_ga').setLabel('🛖 VÀO CHUỒNG').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('trade_xu').setLabel('🪙 GỬI XU').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_thoc').setLabel('🌾 GỬI THÓC').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('trade_confirm').setLabel('KÝ TÊN (CHỐT)').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('trade_cancel').setLabel('HỦY KÈO').setStyle(ButtonStyle.Danger)
    );

    const tradeMsg = await msg.reply({ embeds: [generateEmbed()], components: [mainRow] });
    const collector = tradeMsg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id && i.user.id !== target.id) {
            return i.reply({ content: "Đừng xem trộm chuồng gà nhà người khác chứ!", ephemeral: true });
        }

        const myTrade = tradeData[i.user.id];
        const myDb = data[i.user.id];

        if (myTrade.confirmed && i.customId !== 'trade_cancel') {
            return i.reply({ content: "Hợp đồng đã ký tạm thời, không thể sửa đồ!", ephemeral: true });
        }

        // --- 1. XỬ LÝ CHUỒNG GÀ (FIX LỖI TRONG ẢNH image_4a5f3f.png) ---
        if (i.customId === 'trade_ga') {
            if (!myDb.gaCon || myDb.gaCon.length === 0) {
                return i.reply({ content: "⚠️ Chuồng gà của bạn đang trống trơn!", ephemeral: true });
            }

            const availableGa = myDb.gaCon.filter(g => !g.locked && !myTrade.items.some(it => it.id === g.id));
            
            if (availableGa.length === 0) {
                return i.reply({ content: "⚠️ Không còn gà nào sẵn sàng để giao dịch!", ephemeral: true });
            }

            const selectGa = new StringSelectMenuBuilder()
                .setCustomId('sel_ga_trade')
                .setPlaceholder('🏮 Chọn một chiến kê từ chuồng...')
                .addOptions(availableGa.slice(0, 25).map(g => ({
                    label: `🐥 ${g.name}`,
                    description: `Hạng: ${g.rarity || 'Thường'} | HP: ${g.hp}`,
                    value: g.id.toString()
                })));

            const subResGa = await i.reply({ 
                content: "### 🛖 CHUỒNG GÀ HIỆN CÓ", 
                components: [new ActionRowBuilder().addComponents(selectGa)], 
                ephemeral: true,
                fetchReply: true 
            });

            // Sub-Collector riêng cho Menu để tránh lỗi "Tương tác thất bại"
            const subCollectorGa = subResGa.createMessageComponentCollector({ time: 60000 });
            subCollectorGa.on('collect', async subI => {
                if (subI.customId === 'sel_ga_trade') {
                    const chicken = myDb.gaCon.find(g => g.id.toString() === subI.values[0]);
                    if (chicken) {
                        myTrade.items.push(chicken);
                        tradeData[msg.author.id].confirmed = false;
                        tradeData[target.id].confirmed = false;

                        await subI.update({ content: `✅ Đã đưa **${chicken.name}** ra bàn giao dịch!`, components: [] });
                        return tradeMsg.edit({ embeds: [generateEmbed()] });
                    }
                }
            });
            return;
        }

        // --- 2. CHỈNH XU/THÓC (GIỮ NGUYÊN SUB-COLLECTOR) ---
        if (i.customId === 'trade_xu' || i.customId === 'trade_thoc') {
            const type = i.customId === 'trade_xu' ? 'coins' : 'thoc';
            const label = type === 'coins' ? 'Xu 🪙' : 'Thóc 🌾';
            
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`adj_${type}_100`).setLabel('🔼 +100').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`adj_${type}_10`).setLabel('🔼 +10').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`adj_${type}_1`).setLabel('🔼 +1').setStyle(ButtonStyle.Success)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`adj_${type}_-100`).setLabel('🔽 -100').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`adj_${type}_-10`).setLabel('🔽 -10').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`adj_${type}_-1`).setLabel('🔽 -1').setStyle(ButtonStyle.Danger)
            );

            const subRes = await i.reply({ 
                content: `🛠️ **BẢNG CHỈNH TÀI SẢN**\n> Loại: **${label}**\n> Đang góp: **${myTrade[type].toLocaleString()}**`, 
                components: [row1, row2], 
                ephemeral: true, 
                fetchReply: true 
            });

            const subCollector = subRes.createMessageComponentCollector({ time: 60000 });
            subCollector.on('collect', async subI => {
                const [, subType, amount] = subI.customId.split('_');
                const val = parseInt(amount);

                if (myTrade[subType] + val < 0) return subI.update({ content: "⚠️ Không thể giảm xuống mức âm!" });
                if (myTrade[subType] + val > myDb[subType]) return subI.update({ content: `⚠️ Bạn chỉ có ${myDb[subType].toLocaleString()} trong ví!` });

                myTrade[subType] += val;
                tradeData[msg.author.id].confirmed = false;
                tradeData[target.id].confirmed = false;

                await subI.update({ content: `✅ Đã sửa lại: **${myTrade[subType].toLocaleString()}** ${label}` });
                return tradeMsg.edit({ embeds: [generateEmbed()] });
            });
            return;
        }

        // --- 3. KÝ TÊN & HỦY ---
        if (i.customId === 'trade_confirm') {
            myTrade.confirmed = true;
            if (tradeData[msg.author.id].confirmed && tradeData[target.id].confirmed) {
                const u1Tr = tradeData[msg.author.id];
                const u2Tr = tradeData[target.id];

                u1.coins = (u1.coins - u1Tr.coins) + u2Tr.coins;
                u2.coins = (u2.coins - u2Tr.coins) + u1Tr.coins;
                u1.thoc = (u1.thoc - u1Tr.thoc) + u2Tr.thoc;
                u2.thoc = (u2.thoc - u2Tr.thoc) + u1Tr.thoc;

                u1Tr.items.forEach(it => { u1.gaCon = u1.gaCon.filter(g => g.id !== it.id); u2.gaCon.push(it); });
                u2Tr.items.forEach(it => { u2.gaCon = u2.gaCon.filter(g => g.id !== it.id); u1.gaCon.push(it); });

                await Promise.all([saveData(msg.author.id), saveData(target.id)]);
                collector.stop();
                return i.update({ content: "🎊 **GIAO DỊCH HOÀN TẤT!** Những chú gà đã về chuồng mới.", embeds: [generateEmbed()], components: [] });
            }
            await i.update({ embeds: [generateEmbed()] });
        }

        if (i.customId === 'trade_cancel') {
            collector.stop();
            return i.update({ content: `✖️ Giao dịch đã bị hủy bỏ bởi **${i.user.username}**.`, embeds: [], components: [] });
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') tradeMsg.edit({ content: "⏳ Hết thời hạn giao kèo (5 phút).", components: [] }).catch(() => {});
    });
}
// --- LỆNH: TRIỆU HỒI SHOP THẦN THOẠI ---
if (msg.content === ":trieuhoishopthanthoai") {
    const adminID = "873867371419422742"; 
    if (msg.author.id !== adminID) return msg.reply("❌ Bạn không có quyền triệu hồi thần linh!");

    const items = [
        { id: "ve_restart", name: "Vé Restart 🎟️", price: 50000, desc: "Bỏ qua thời gian ấp trứng ngay lập tức.", color: "#3498DB" },
        { id: "trung_god", name: "Trứng God 🥚", price: 200000, desc: "Nở ra 100% gà Legendary.", color: "#F1C40F" },
        { id: "hop_bi_an", name: "Hộp Bí Ẩn 🎁", price: 30000, desc: "Mở ra ngẫu nhiên Xu hoặc Thóc.", color: "#9B59B6" }
    ];

    currentSpecialShop = items[Math.floor(Math.random() * items.length)];

    const shopEmbed = new EmbedBuilder()
        .setTitle("✨ SHOP THẦN THOẠI ĐANG MỞ CỬA ✨")
        .setDescription(`> *Vị thần thương nhân vừa ghé qua trang trại của bạn!*`)
        .addFields(
            { name: "📦 Vật phẩm", value: `**${currentSpecialShop.name}**`, inline: true },
            { name: "💰 Giá bán", value: `\`${currentSpecialShop.price.toLocaleString()} Xu\``, inline: true },
            { name: "📝 Hiệu quả", value: `*${currentSpecialShop.desc}*` },
            { name: "⏰ Thời gian", value: `Kết thúc lúc <t:${Math.floor((Date.now() + 15 * 60 * 1000) / 1000)}:R>` }
        )
        .setColor(currentSpecialShop.color)
        .setThumbnail("https://i.imgur.com/8E9p6fS.gif")
        .setFooter({ text: "Nhấn nút bên dưới để mua ngay!", iconURL: msg.author.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('buy_special_item')
            .setLabel(`Mua ${currentSpecialShop.name}`)
            .setEmoji('🛒')
            .setStyle(ButtonStyle.Success)
    );

    BOSS_CHANNELS.forEach(async (channelId) => {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel) await channel.send({ embeds: [shopEmbed], components: [row] });
        } catch (e) {
            console.log(`❌ Lỗi gửi shop: ${e.message}`);
        }
    });

    msg.reply(`🚀 Shop đã xuất hiện trong **15 phút**!`);
    setTimeout(() => { currentSpecialShop = null; }, 15 * 60 * 1000);
}

// --- LỆNH: SỬ DỤNG VẬT PHẨM (:use) ---
if (msg.content.startsWith(":use")) {
    const u = getUser(msg.author.id); // Lấy dữ liệu user
    const args = msg.content.split(" ");
    const itemKey = args[1]?.toLowerCase();

    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };
    if (!itemKey || !u.inventory[itemKey] || u.inventory[itemKey] <= 0) {
        return msg.reply("❌ Bạn không có vật phẩm này!");
    }

    if (itemKey === "ve_restart") {
        if (!u.dangAp || u.dangAp.length === 0) return msg.reply("❌ Máy ấp đang trống!");
        u.inventory.ve_restart -= 1;
        u.dangAp.forEach(trung => { trung.finishAt = Date.now(); });
        await saveData(msg.author.id);
        return msg.reply("🎟️ **VÉ RESTART KÍCH HOẠT!** Trứng đã sẵn sàng nở.");
    }

    if (itemKey === "trung_god") {
        u.inventory.trung_god -= 1;
        const godPool = GA_LIST.filter(g => g.rarity.includes("Legendary"));
        const selectedGa = godPool[Math.floor(Math.random() * godPool.length)];
        const newGa = { ...selectedGa, id: Date.now(), locked: false };
        u.gaCon.push(newGa);
        await saveData(msg.author.id);
        return msg.reply(`✨ Trứng God đã nở ra **${newGa.name}**!`);
    }

    if (itemKey === "hop_bi_an") {
        u.inventory.hop_bi_an -= 1;
        const isThoc = Math.random() < 0.5;
        if (isThoc) {
            const nhan = Math.floor(Math.random() * 81) + 20;
            u.thoc += nhan;
            msg.reply(`🌾 Bạn nhận được **${nhan} Thóc**!`);
        } else {
            const nhan = Math.floor(Math.random() * 25001) + 5000;
            u.coins += nhan;
            msg.reply(`💰 Bạn nhận được **${nhan.toLocaleString()} Xu**!`);
        }
        await saveData(msg.author.id);
    }
}

// --- LỆNH: KHO ĐỒ (:khodo) ---
if (msg.content === ":khodo") {
    const u = getUser(msg.author.id); // ĐÃ THÊM DÒNG NÀY ĐỂ HẾT LỖI
    if (!u.inventory) u.inventory = { ve_restart: 0, trung_god: 0, hop_bi_an: 0 };

    const invEmbed = new EmbedBuilder()
        .setTitle(`🎒 KHO ĐỒ CỦA ${msg.author.username.toUpperCase()}`)
        .setColor("#3498DB")
        .addFields(
            { name: "🎟️ Vé", value: `${u.inventory.ve_restart || 0}`, inline: true },
            { name: "🥚 Trứng God", value: `${u.inventory.trung_god || 0}`, inline: true },
            { name: "🎁 Hộp Bí Ẩn", value: `${u.inventory.hop_bi_an || 0}`, inline: true },
            { name: "💰 Số dư Xu", value: `**${u.coins.toLocaleString()} Xu**`, inline: false }
        )
        .setFooter({ text: "Dùng: :use <tên_vật_phẩm>" });

    return msg.reply({ embeds: [invEmbed] });
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
    if (maxSimilarity >= 0.65) {
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
// --- TRỘM GÀ BẺ KHÓA (CẬP NHẬT TÍNH CẢ GÀ KHÓA) ---
// --- TRỘM GÀ BẺ KHÓA (CÓ BIẾN CHỜ 2 TIẾNG) ---
// --- TRỘM GÀ BẺ KHÓA (CẬP NHẬT HIỂN THỊ KẾT QUẢ KHI THUA) ---
if (msg.content.startsWith(":tromga")) {
    const target = msg.mentions.users.first();
    if (!target || target.id === msg.author.id) return msg.reply("❌ Hãy tag người bạn muốn trộm!");

    const enemy = getUser(target.id);
    const now = Date.now();
    const cooldownTime = 2 * 60 * 60 * 1000; 

    if (u.lastSteal && now - u.lastSteal < cooldownTime) {
        const remaining = cooldownTime - (now - u.lastSteal);
        return msg.reply(`⏳ Bạn đang bị truy nã! Hãy trốn trong nhà thêm **${formatTime(remaining)}** nữa.`);
    }

    if (enemy.gaCon.length <= 1) return msg.reply("❌ Đối phương chỉ còn 1 con gà duy nhất!");
    const stealableGa = enemy.gaCon.filter(g => !g.locked);
    if (stealableGa.length === 0) return msg.reply("❌ Đối phương đã khóa tất cả gà!");

    u.lastSteal = now; 
    const secret = Math.floor(10000 + Math.random() * 90000).toString();
    let attempts = [];

    const generateEmbed = (isFinished = false, statusText = "") => {
        let description = "🕵️ **HỆ THỐNG BẺ KHÓA AN NINH**\n" +
                          "🟢: Đúng | 🟡: Sai chỗ | 🔴: Sai số\n\n" +
                          "**Lịch sử bẻ khóa:**\n";

        if (attempts.length === 0) {
            description += "_Chưa có lượt đoán nào..._";
        } else {
            description += attempts.map((a, i) => `Lượt ${i + 1}: \`${a.guess}\` ➔ ${a.result}`).join("\n");
        }

        const embed = new EmbedBuilder()
            .setTitle(isFinished ? "🏁 KẾT THÚC VỤ TRỘM" : "🔐 ĐANG BẺ KHÓA...")
            .setDescription(description + `\n\n${statusText}`)
            .setColor(isFinished ? (statusText.includes("THÀNH CÔNG") ? "#2ECC71" : "#E74C3C") : "#F1C40F")
            .setFooter({ text: isFinished ? "Trò chơi kết thúc" : `Còn ${5 - attempts.length} lượt đoán | Nhập 5 số!` });

        return { embeds: [embed] };
    };

    const mainMsg = await msg.reply(generateEmbed());

    const coll = msg.channel.createMessageCollector({ 
        filter: m => m.author.id === msg.author.id && /^\d{5}$/.test(m.content), 
        time: 60000, 
        max: 5 
    });

    coll.on('collect', async m => {
        const guess = m.content;
        let secretArr = secret.split('');
        let guessArr = guess.split('');
        let resultArr = Array(5).fill("🔴");

        try { await m.delete(); } catch (e) {}

        for (let i = 0; i < 5; i++) {
            if (guessArr[i] === secretArr[i]) {
                resultArr[i] = "🟢";
                secretArr[i] = null;
                guessArr[i] = null;
            }
        }
        for (let i = 0; i < 5; i++) {
            if (guessArr[i] !== null) {
                let foundIndex = secretArr.indexOf(guessArr[i]);
                if (foundIndex !== -1) {
                    resultArr[i] = "🟡";
                    secretArr[foundIndex] = null;
                }
            }
        }

        const result = resultArr.join("");
        attempts.push({ guess, result });

        if (guess === secret) {
            const randomIndex = Math.floor(Math.random() * stealableGa.length);
            const s = stealableGa[randomIndex];
            enemy.gaCon = enemy.gaCon.filter(g => g.id !== s.id);
            u.gaCon.push(s);

            await saveData(msg.author.id);
            await saveData(target.id);
            coll.stop();
            return await mainMsg.edit(generateEmbed(true, `🎊 **THÀNH CÔNG!**\nMã đúng: \`${secret}\` 🟢🟢🟢🟢🟢\nBạn đã trộm được **${s.name}**!`));
        } 
        
        if (attempts.length >= 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            coll.stop();
            // HIỂN THỊ SỐ ĐÚNG KÈM HIỆU ỨNG ĐỂ GÂY CAY CÚ
            return await mainMsg.edit(generateEmbed(true, `🚨 **THẤT BẠI!**\nMã đúng là: \`${secret}\` 🟢🟢🟢🟢🟢\nTiếc quá, suýt chút nữa là trộm được gà rồi! Bạn bị phạt 200 Coins.`));
        }

        await mainMsg.edit(generateEmbed());
    });

    // Xử lý khi hết thời gian 60s mà không nhập đủ lượt
    coll.on('end', async (collected, reason) => {
        if (reason === 'time' && attempts.length < 5) {
            u.coins = Math.max(0, (u.coins || 0) - 200);
            await saveData(msg.author.id);
            await mainMsg.edit(generateEmbed(true, `⏰ **HẾT THỜI GIAN!**\nMã đúng lẽ ra là: \`${secret}\` 🟢🟢🟢🟢🟢\nBạn đứng hình quá lâu nên đã bị cảnh sát tóm!`));
        }
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
// --- TRONG LỆNH :sellga (NÂNG CẤP NHẬN DIỆN HỆ) ---
if (msg.content.startsWith(":sellga")) {
    const u = data[msg.author.id];
    const args = msg.content.split(" ");
    const rawInput = args.slice(1).join(" ");
    if (!rawInput) return msg.reply("❌ Nhập tên hoặc hệ gà muốn bán!");

    const inputClean = cleanText(rawInput);

    // 1. Tìm gà dựa trên tên HOẶC hệ (Độ tương đồng > 80%)
    const allMatches = u.gaCon.filter(g => {
        const rarityClean = cleanText(g.rarity); // Ví dụ: "legendary⚪" -> "legendary"
        const nameClean = cleanText(g.name);

        // Kiểm tra độ tương đồng với HỆ (Rarity)
        const isRarityMatch = similarity(rarityClean, inputClean) >= 0.8;
        
        // Kiểm tra độ tương đồng với TÊN (Name)
        const isNameMatch = similarity(nameClean, inputClean) >= 0.8;

        return isRarityMatch || isNameMatch;
    });

    if (allMatches.length === 0) {
        return msg.reply(`❌ Không tìm thấy gà nào thuộc hệ hoặc tên giống với "**${rawInput}**".`);
    }

    // 2. Lọc gà bị khóa (Giữ lại gà quan trọng)
    const canSell = allMatches.filter(g => !g.locked);
    const lockedCount = allMatches.filter(g => g.locked).length;

    if (canSell.length === 0) {
        return msg.reply(`🛡️ Những con gà bạn muốn bán đều đang bị **KHÓA**.`);
    }

    // 3. Tính tiền và cập nhật dữ liệu
    let totalMoney = canSell.reduce((sum, g) => sum + (g.price || 10), 0);
    const canSellIds = canSell.map(g => g.id);

    u.gaCon = u.gaCon.filter(g => !canSellIds.includes(g.id));
    u.coins += totalMoney;
    await saveData(msg.author.id); // Lưu lên MongoDB

    // 4. Thông báo kết quả
    let response = `💰 Đã bán **${canSell.length}** con gà (Tên/Hệ khớp với "**${rawInput}**").\n✅ Thu về: **${totalMoney.toLocaleString()} Xu**.`;
    if (lockedCount > 0) response += `\n⚠️ Lưu ý: Đã giữ lại **${lockedCount}** con đang được đặt khóa.`;

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
// --- LỆNH: KHÓA/MỞ KHÓA GÀ (HỆ HOẶC TÊN 80%) ---

if (msg.content.startsWith(":lockga") || msg.content.startsWith(":unlockga")) {
    const u = getUser(msg.author.id);
    const now = Date.now();// THÊM DÒNG NÀY
    const isLock = msg.content.startsWith(":lockga");
    const args = msg.content.split(" ");
    const rawInput = args.slice(1).join(" "); // Lấy toàn bộ phần phía sau lệnh
    
    if (!rawInput) {
        return msg.reply(`❌ Cú pháp: \`:${isLock ? "lockga" : "unlockga"} <hệ hoặc tên gà>\``);
    }

    const inputClean = cleanText(rawInput); // Sử dụng hàm cleanText đã viết ở lệnh sell
    const validRarities = ["common", "rare", "epic", "legendary"];

    let count = 0;
    u.gaCon.forEach(g => {
        const rarityClean = cleanText(g.rarity);
        const nameClean = cleanText(g.name);

        let isMatch = false;

        // 1. Kiểm tra nếu khớp hệ chính xác
        if (validRarities.includes(inputClean) && rarityClean === inputClean) {
            isMatch = true;
        } 
        // 2. Kiểm tra độ giống nhau của tên (> 80%)
        else if (similarity(nameClean, inputClean) >= 0.8) { // Sử dụng hàm similarity đã viết
            isMatch = true;
        }

        if (isMatch) {
            g.locked = isLock;
            count++;
        }
    });

    if (count === 0) {
        return msg.reply(`❌ Không tìm thấy gà nào giống với "**${rawInput}**" để thực hiện.`);
    }

    saveData(msg.author.id);
    
    const actionMsg = isLock ? "🔒 Đã khóa" : "🔓 Đã mở khóa";
    return msg.reply(`${actionMsg} thành công **${count}** con gà khớp với "**${rawInput}**".\n⚠️ Trạng thái này sẽ ảnh hưởng đến việc bán gà bằng lệnh \`:sellga\`.`);
}
// --- LỆNH: SKIP 45 PHÚT ẤP TRỨNG (:skipaptrung) ---
// --- LỆNH: SKIP ẤP TRỨNG HOÀN CHỈNH ---
if (msg.content === ":skipaptrung") {
    const cdSkip = 2 * 60 * 60 * 1000; // Cooldown 2 tiếng
    const skipAmount = 45 * 60 * 1000; // Giảm 45 phút
    const skipCost = 2000; // Giá mới 2,000 Xu
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
        return msg.reply(`❌ Bạn cần **${skipCost.toLocaleString()} Xu** để mua bình tăng tốc!`);
    }

    // 4. Thực hiện giảm thời gian
    u.coins -= skipCost;
    u.lastSkip = now;

    u.dangAp.forEach(trung => {
        trung.finishAt -= skipAmount;
    });

    await saveData(msg.author.id);

    // 5. Kiểm tra trứng nở ngay lập tức
    const hatchedEggs = u.dangAp.filter(trung => now >= trung.finishAt);

    // 6. Tạo bảng hiển thị thời gian còn lại (Embed chính)
    const timeRemainingList = u.dangAp.map((trung, i) => {
        const timeLeft = trung.finishAt - now;
        const status = timeLeft <= 0 ? "✅ **SẴN SÀNG NỞ!**" : `⏳ Còn: \`${formatTime(timeLeft)}\``;
        return `**${i + 1}. Trứng ${trung.type.toUpperCase()}:** ${status}`;
    }).join("\n");

    const mainEmbed = new EmbedBuilder()
        .setTitle("⏩ TĂNG TỐC ẤP TRỨNG")
        .setDescription(`💰 Chi phí: **${skipCost.toLocaleString()} Xu**\n⏱️ Đã giảm **45 phút** cho tất cả trứng.\n\n**Tình trạng máy ấp:**\n${timeRemainingList}`)
        .setColor("#3498DB")
        .setTimestamp();

    await msg.reply({ embeds: [mainEmbed] });

    // 7. Nếu có trứng nở ngay -> Gửi thêm Embed Decor rực rỡ
    if (hatchedEggs.length > 0) {
        const hatchEmbed = new EmbedBuilder()
            .setTitle("🐣 TIN VUI: TRỨNG ĐÃ NỞ!")
            .setDescription(
                `✨ **Phép màu đã xuất hiện!** ✨\n\n` +
                `Sức mạnh từ bình tăng tốc đã giúp **${hatchedEggs.length}** quả trứng nứt vỏ ngay lập tức!\n\n` +
                `👉 Hãy nhắn tin bất kỳ hoặc gõ \`:chuonga\` để đón thành viên mới!`
            )
            .setColor("#FFD700") // Màu vàng kim rực rỡ
            .setThumbnail("https://i.imgur.com/8E9p6fS.gif") // Link ảnh minh họa
            .addFields({ name: "📦 Trạng thái", value: "Sẵn sàng nhận gà", inline: true });

        return msg.channel.send({ embeds: [hatchEmbed] });
    }
}
// --- LỆNH: XEM CHUỒNG GÀ (PHÂN TRANG & HIỂN THỊ CHỈ SỐ) ---
if (msg.content === ":chuonga") {
    const u = data[msg.author.id];
    if (!u || u.gaCon.length === 0) return msg.reply("🏚️ Chuồng trống hoắc à! Đi ấp trứng ngay đi.");

    let currentFilter = "ALL"; // Mặc định hiển thị tất cả
    let page = 0;
    const pageSize = 5;

    const generateChuongMessage = (p, filter) => {
        // 1. Lọc gà theo hệ
        let filteredGa = u.gaCon;
        if (filter !== "ALL") {
            filteredGa = u.gaCon.filter(g => g.rarity.toUpperCase().includes(filter));
        }

        const totalPages = Math.ceil(filteredGa.length / pageSize) || 1;
        const start = p * pageSize;
        const chickens = filteredGa.slice(start, start + pageSize);

        let list = chickens.map((g, i) => {
            const lockIcon = g.locked ? "🔒" : "🔓";
            const isEquipped = u.equippedGa && u.equippedGa.id === g.id ? " ✅ `[ĐANG DÙNG]`" : "";
            const hp = g.hp || 50;
            const atk = g.atk || Math.floor(hp / 10);
            
            return `**${start + i + 1}. ${g.name}** ${lockIcon}${isEquipped}\n` +
                   `└ ✨ Hệ: \`${g.rarity}\` | ❤️ HP: \`${hp}\` | 💪 ATK: \`${atk}\` | 💰 Giá: \`${(g.price || 10).toLocaleString()}\``;
        }).join("\n\n");

        if (filteredGa.length === 0) list = `Hiện không có gà hệ **${filter}** nào trong chuồng.`;

        const embed = new EmbedBuilder()
            .setTitle(`🏡 CHUỒNG GÀ CỦA ${msg.author.username} (${filter})`)
            .setDescription(list)
            .setColor(filter === "LEGENDARY" ? "#F1C40F" : "#3498DB")
            .setFooter({ text: `Trang ${p + 1}/${totalPages} | Lọc: ${filter} (${filteredGa.length} con)` });

        // Hàng 1: Nút phân loại
        const rowFilter = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('filter_ALL').setLabel('Tất cả').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_COMMON').setLabel('Common').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('filter_RARE').setLabel('Rare').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('filter_EPIC').setLabel('Epic').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('filter_LEGENDARY').setLabel('Legend').setStyle(ButtonStyle.Danger)
        );

        // Hàng 2: Nút chuyển trang
        const rowPage = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('prev_page').setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(p === 0),
            new ButtonBuilder().setCustomId('next_page').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(p >= totalPages - 1)
        );

        return { embeds: [embed], components: [rowFilter, rowPage] };
    };

    const chuongMsg = await msg.reply(generateChuongMessage(page, currentFilter));

    const collector = chuongMsg.createMessageComponentCollector({ filter: i => i.user.id === msg.author.id, time: 120000 });

    collector.on('collect', async i => {
        if (i.customId.startsWith('filter_')) {
            currentFilter = i.customId.replace('filter_', '');
            page = 0; // Reset về trang đầu khi đổi bộ lọc
        } else if (i.customId === 'next_page') {
            page++;
        } else if (i.customId === 'prev_page') {
            page--;
        }
        await i.update(generateChuongMessage(page, currentFilter));
    });
}

// --- 2. HỆ THỐNG ĐẤU TRƯỜNG SINH TỬ (BẢN FINAL CHỈNH CHU) ---
if (msg.content.startsWith(":spawnboss")) {
    // 1. KIỂM TRA QUYỀN HẠN ĐẠI SƯ KÊ
    if (msg.author.id !== "873867371419422742") {
        return msg.reply("❌ **Chỉ có Đại Sư Kê mới có quyền mở đấu trường!**");
    }

    if (worldBoss) return msg.reply("⚠️ **Đấu trường đang có biến! Hãy chờ trận đấu kết thúc.**");

    // 2. KHỞI TẠO THÔNG SỐ BOSS
    const args = msg.content.split(" ");
    let hpInput = parseInt(args[1]) || Math.floor(Math.random() * (35000 - 20000 + 1)) + 20000;

    worldBoss = {
        name: "🔥 ĐẠI THẦN GÀ PHẪN NỘ 🔥",
        hp: hpInput,
        maxHp: hpInput,
        contributors: {},
        endTime: Date.now() + 300000, 
        isActive: true,
        messages: [] 
    };

    const getProgressBar = (current, max) => {
        const size = 15;
        const progress = Math.max(0, Math.min(size, Math.round((current / max) * size)));
        return "🛑".repeat(progress) + "🌑".repeat(size - progress);
    };

    // 3. GIAO DIỆN CHIẾN TRƯỜNG
    const createBossEmbed = () => {
        return new EmbedBuilder()
            .setTitle(`🏟️ ĐẤU TRƯỜNG SINH TỬ: ${worldBoss.name} 🏟️`)
            .setAuthor({ name: "Hệ Thống Chiến Trường Toàn Cầu", iconURL: client.user.displayAvatarURL() })
            .setDescription(
                `> *Vết nứt không gian đã mở, thực thể huyền thoại xuất hiện! Các chủ trại hãy mau tung gà chiến bảo vệ xóm làng!* \n\n` +
                `⚔️ **Thực thể:** \`${worldBoss.name}\`\n` +
                `🩸 **Sinh lực:** \`${Math.max(0, worldBoss.hp).toLocaleString()} / ${worldBoss.maxHp.toLocaleString()}\` HP\n` +
                `**[${getProgressBar(worldBoss.hp, worldBoss.maxHp)}]**\n\n` +
                `🛡️ **Trạng thái:** ${worldBoss.hp > 0 ? "💢 Đang phẫn nộ!" : "💀 Đã bị hạ gục"}`
            )
            .addFields({ name: '⏳ Thời gian còn lại', value: `<t:${Math.floor(worldBoss.endTime / 1000)}:R>`, inline: true })
            .setColor("#FF4500")
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setImage("https://i.imgur.com/vH8lBq9.gif")
            .setFooter({ text: "Nhấn 'Tung Đòn' để tham chiến | Thưởng x2.5 sát thương", iconURL: msg.author.displayAvatarURL() })
            .setTimestamp();
    };

    const bossRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('boss_attack').setLabel('⚔️ TUNG ĐÒN').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('boss_status').setLabel('📊 XẾP HẠNG').setStyle(ButtonStyle.Secondary)
    );

    // 4. HÀM GỬI BOSS ĐẾN 3 KÊNH CHỈ ĐỊNH (FIX RATE LIMIT)
    const sendGlobalBoss = async () => {
        for (const channelId of BOSS_CHANNELS) {
            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    const m = await channel.send({ 
                        content: "🔔 **LOA LOA LOA! ĐẠI CHIẾN GÀ RỪNG ĐÃ KHAI MỞ!**", 
                        embeds: [createBossEmbed()], 
                        components: [bossRow] 
                    });
                    worldBoss.messages.push(m);
                }
                await new Promise(r => setTimeout(r, 500)); // Nghỉ ngắn giữa các kênh
            } catch (err) { 
                console.log(`Lỗi gửi boss tại kênh ${channelId}: ${err.message}`); 
            }
        }
    };

    sendGlobalBoss();

    // 5. XỬ LÝ KHI HẾT GIỜ
    setTimeout(async () => {
        if (worldBoss && worldBoss.isActive) {
            worldBoss.isActive = false;
            const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 3);
            let summary = "💀 **BOSS ĐÃ CHẠY THOÁT!** Sương mù dày đặc che khuất dấu vết.\n\n**🏆 VINH DANH TOP 3:**\n";
            
            if (sorted.length > 0) {
                sorted.forEach(([id, dmg], i) => {
                    summary += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} <@${id}>: \`${dmg.toLocaleString()}\` sát thương\n`;
                });
            } else { summary += "_Chiến trường lạnh lẽo, không bóng người tham chiến._"; }

            const failEmbed = new EmbedBuilder()
                .setTitle("🌑 ĐẤU TRƯỜNG KHÉP LẠI")
                .setDescription(summary)
                .setColor("#2F3136")
                .setThumbnail(client.user.displayAvatarURL());

            for (const m of worldBoss.messages) { 
                try { await m.edit({ embeds: [failEmbed], components: [] }); } catch (e) {} 
            }
            worldBoss = null;
        }
    }, 300000);
}

// --- XỬ LÝ TƯƠNG TÁC ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() || !worldBoss || !worldBoss.isActive) return;

    if (interaction.customId === 'boss_attack') {
        const u = data[interaction.user.id]; // Nếu dùng DB thì đổi thành await getUser(id)
        if (!u || !u.equippedGa) {
            return interaction.reply({ content: "❌ Bạn chưa trang bị gà!", ephemeral: true });
        }

        await interaction.deferUpdate(); 

        const damage = u.equippedGa.atk || 120;
        const crit = Math.random() < 0.15 ? 2 : 1; 
        const finalDamage = damage * crit;

        worldBoss.hp -= finalDamage;
        worldBoss.contributors[interaction.user.id] = (worldBoss.contributors[interaction.user.id] || 0) + finalDamage;

        await interaction.followUp({ 
            content: `${crit > 1 ? '🔥 **BẠO KÍCH!**' : '⚔️'} Gà **${u.equippedGa.name}** gây **${finalDamage.toLocaleString()}** sát thương!`, 
            ephemeral: true 
        });

        // Cập nhật máu mỗi 5 lượt hoặc khi Boss chết
        const totalHits = Object.values(worldBoss.contributors).length;
        if (worldBoss.hp <= 0) {
            handleBossDefeated(); // Hàm xử lý khi boss chết
        } else if (totalHits % 5 === 0) {
            updateGlobalBossDisplay(); 
        }
    }

    if (interaction.customId === 'boss_status') {
        const top = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 5)
            .map(([id, dmg], i) => `**#${i+1}** <@${id}>: \`${dmg.toLocaleString()}\` ⚔️`).join("\n") || "_Chưa có ai ra đòn._";

        const statusEmbed = new EmbedBuilder()
            .setTitle("📊 THỐNG KÊ CHIẾN TRƯỜNG")
            .setDescription(`❤️ Máu Boss còn lại: \`${Math.max(0, worldBoss.hp).toLocaleString()}\`\n\n**TOP SÁT THƯƠNG:**\n${top}`)
            .setColor("#3498db");
        return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }
});

// Hàm cập nhật hiển thị máu Boss
async function updateGlobalBossDisplay() {
    if (!worldBoss || worldBoss.messages.length === 0) return;

    const updatedEmbed = new EmbedBuilder()
        .setTitle(`🏟️ ĐẤU TRƯỜNG SINH TỬ: ${worldBoss.name} 🏟️`)
        .setDescription(
            `> *Vết nứt không gian đã mở!* \n\n` +
            `⚔️ **Thực thể:** \`${worldBoss.name}\`\n` +
            `🩸 **Sinh lực:** \`${Math.max(0, worldBoss.hp).toLocaleString()} / ${worldBoss.maxHp.toLocaleString()}\` HP\n` +
            `**[${"🛑".repeat(Math.max(0, Math.min(15, Math.round((worldBoss.hp / worldBoss.maxHp) * 15))))}${"🌑".repeat(15 - Math.max(0, Math.min(15, Math.round((worldBoss.hp / worldBoss.maxHp) * 15))))}]**`
        )
        .setImage("https://i.imgur.com/vH8lBq9.gif")
        .setColor("#FF4500");

    await Promise.allSettled(worldBoss.messages.map(m => m.edit({ embeds: [updatedEmbed] }).catch(() => null)));
}

// Hàm xử lý khi Boss bị tiêu diệt
async function handleBossDefeated() {
    if (!worldBoss.isActive) return;
    worldBoss.isActive = false;

    const sorted = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a);
    const top3 = sorted.slice(0, 3);
    
    let rewardList = "🎊 **ĐẠI THẦN GÀ ĐÃ GỤC NGÃ! CHIẾN THẮNG HUY HOÀNG!** 🎊\n\n**👑 TAM ĐẠI CHIẾN BINH:**\n";
    top3.forEach(([id, dmg], i) => {
        rewardList += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} <@${id}>: \`${dmg.toLocaleString()}\` dame\n`;
    });

    rewardList += "\n**💰 PHẦN THƯỞNG (x2.5 Dame):**\n";
    for (const [id, dmg] of sorted) {
        const reward = Math.floor(dmg * 2.5);
        if (data[id]) {
            data[id].coins = (data[id].coins || 0) + reward;
            saveData(id);
        }
        rewardList += `• <@${id}>: +${reward.toLocaleString()} Xu\n`;
    }

    const winEmbed = new EmbedBuilder()
        .setTitle("🏆 CHIẾN THẮNG RỰC RỠ")
        .setDescription(rewardList)
        .setColor("#F1C40F")
        .setThumbnail("https://i.imgur.com/vH8lBq9.gif");

    for (const m of worldBoss.messages) { 
        try { await m.edit({ embeds: [winEmbed], components: [] }); } catch (e) {} 
    }
    worldBoss = null;
}

    if (interaction.customId === 'boss_status') {
        if (!worldBoss) return interaction.reply({ content: "🏟️ Đấu trường đang trống.", ephemeral: true });
        const top = Object.entries(worldBoss.contributors).sort(([,a],[,b]) => b - a).slice(0, 5)
            .map(([id, dmg], i) => `**#${i+1}** <@${id}>: \`${dmg.toLocaleString()}\` ⚔️`).join("\n") || "_Chưa có ai ra đòn._";

        const statusEmbed = new EmbedBuilder()
            .setTitle("📊 THỐNG KÊ CHIẾN TRƯỜNG")
            .setDescription(`❤️ Máu Boss: \`${worldBoss.hp.toLocaleString()}\`\n\n${top}`)
            .setColor("#3498db");
        return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }
// --- LỆNH: BÁN TRỨNG (CẬP NHẬT BÁN ALL) ---
if (msg.content.startsWith(":selltrung")) {
    const u = data[msg.author.id]; 
    if (!u) return msg.reply("❌ Bạn chưa có trang trại! Hãy gõ `:start`.");

    const args = msg.content.split(" ");
    const loai = args[1]; // thuong, bac, vang
    const inputSl = args[2]; // số lượng hoặc "all"

    // 1. Kiểm tra loại trứng hợp lệ
    const gia = { thuong: 10, bac: 50, vang: 200 }; 
    if (!loai || !gia[loai]) {
        return msg.reply("❌ Cú pháp: `:selltrung <thuong/bac/vang> <số lượng hoặc all>`");
    }

    // 2. Xử lý số lượng (nếu nhập "all" thì lấy hết số trứng đang có)
    let sl;
    if (inputSl && inputSl.toLowerCase() === "all") {
        sl = u.trung[loai] || 0;
    } else {
        sl = parseInt(inputSl);
    }

    // 3. Kiểm tra điều kiện bán
    if (isNaN(sl) || sl <= 0) {
        return msg.reply(`❌ Bạn cần nhập số lượng cụ thể hoặc \`all\` để bán trứng ${loai}!`);
    }
    if ((u.trung[loai] || 0) < sl) {
        return msg.reply(`❌ Bạn không đủ trứng **${loai}** để bán (Hiện có: ${u.trung[loai] || 0})!`);
    }

    // 4. Tính tiền và cập nhật dữ liệu
    const tienThu = sl * gia[loai];
    u.trung[loai] -= sl;
    u.coins = (u.coins || 0) + tienThu;
    
    saveData(msg.author.id);

    return msg.reply(`💰 Bạn đã bán **${sl.toLocaleString()} trứng ${loai}** và thu về **${tienThu.toLocaleString()} Coins**!`);
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
// --- LỆNH: THU HOẠCH (TỐI ƯU SẢN LƯỢNG THEO RUỘNG) ---
if (msg.content === ":thuhoach") {
    const u = getUser(msg.author.id); // THÊM DÒNG NÀY
    if (!u.isTrongLua) return msg.reply("❌ Ruộng đang trống, hãy gõ `:tronglua` trước!");
    const now = Date.now();
    const timePassed = now - (u.lastTrong || 0);
    const timeToRipen = 30 * 60 * 1000;

    if (timePassed < timeToRipen) {
        const remaining = Math.ceil((timeToRipen - timePassed) / (60 * 1000));
        return msg.reply(`⏳ Lúa chưa chín! Còn khoảng **${remaining} phút** nữa.`);
    }

    // Giới hạn ruộng quy định sản lượng tối đa
    const maxThocPerVụ = 500 + ((u.lvNo || 0) * 200);
    
    // Sản lượng thu hoạch ngẫu nhiên từ 70% đến 100% giới hạn ruộng
    // Đảm bảo con số này luôn lớn hơn số thóc giống đã bỏ ra
    const minThuHoach = Math.max(Math.floor(maxThocPerVụ * 0.7), (u.thocGiongDaDung || 0) * 2); 
    
    const thuHoach = Math.floor(Math.random() * (maxThocPerVụ - minThuHoach + 1)) + minThuHoach;
    const loiNhuan = thuHoach - (u.thocGiongDaDung || 0);

    u.thoc += thuHoach;
    u.isTrongLua = false;
    u.thocGiongDaDung = 0;
    
    saveData(msg.author.id);

    return msg.reply(`🌾 **Thu hoạch thành công!**\n📦 Nhận được: **${thuHoach.toLocaleString()} thóc**\n📈 Lợi nhuận vụ này: **+${loiNhuan.toLocaleString()} thóc**.`);
}
// --- LỆNH: TRỒNG LÚA (DỰA TRÊN GIỚI HẠN RUỘNG) ---
// --- LỆNH: TRỒNG LÚA (DỰA TRÊN GIỚI HẠN RUỘNG) ---
if (msg.content === ":tronglua") {
    const u = getUser(msg.author.id); // <--- THÊM DÒNG NÀY ĐỂ HẾT LỖI
    const requiredLv = 4;
    if ((u.lvGa || 0) < requiredLv) return msg.reply("❌ Cần :upga Lv.4 để bắt đầu canh tác!");

    if (u.isTrongLua) {
        return msg.reply("🌾 Ruộng đang có lúa rồi! Hãy đợi chín và gõ `:thuhoach`.");
    }

    const maxRuong = 500 + ((u.lvNo || 0) * 200);
    const minGiong = Math.floor(maxRuong * 0.1);
    const maxGiong = Math.floor(maxRuong * 0.2);
    const thocGiong = Math.floor(Math.random() * (maxGiong - minGiong + 1)) + minGiong;

    if (u.thoc < thocGiong) {
        return msg.reply(`❌ Bạn không đủ thóc giống! Vụ này cần **${thocGiong} thóc**.`);
    }

    u.thoc -= thocGiong;
    u.lastTrong = Date.now();
    u.isTrongLua = true;
    u.thocGiongDaDung = thocGiong; 
    
    saveData(msg.author.id);
    return msg.reply(`🌱 Bạn đã gieo **${thocGiong} thóc giống**. ⏳ Chờ 30 phút để lúa chín!`);
}
// --- HỆ THỐNG MENU HELP (PHIÊN BẢN ĐẾ CHẾ GÀ) ---
if (msg.content === ":help") {
    const u = getUser(msg.author.id);
    const botAvatar = client.user?.displayAvatarURL({ dynamic: true, size: 512 }) || msg.guild.iconURL(); // Lấy hình đại diện của bot

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_menu')
        .setPlaceholder('📂 Khám phá bí kíp luyện gà tại đây...')
        .addOptions([
            { label: 'Hướng Dẫn Tân Thủ', value: 'basic', emoji: '🔰', description: 'Cách bắt đầu và nhận hỗ trợ mỗi ngày.' },
            { label: 'Nuôi Dưỡng & Sản Xuất', value: 'feed', emoji: '🌾', description: 'Trồng lúa, gặt thóc và chăm sóc gà.' },
            { label: 'Ấp Trứng & Quản Lý', value: 'hatch', emoji: '🥚', description: 'Kỹ thuật ấp trứng và quản lý chuồng.' },
            { label: 'Vật Phẩm Đặc Biệt', value: 'items', emoji: '🎒', description: 'Cách dùng Vé Restart, Trứng God, Hộp Bí Ẩn.' },
            { label: 'Nâng Cấp Công Trình', value: 'upgrade', emoji: '🏗️', description: 'Mở rộng quy mô trang trại của bạn.' },
            { label: 'Giao Thương & Sự Kiện', value: 'social', emoji: '🔥', description: 'Shop, World Boss và hoạt động ngầm.' },
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const helpEmbed = new EmbedBuilder()
        .setTitle("📒 CUỐN CẨM NANG CHICKEN EMPIRE")
        .setColor("#FFD700")
        .setAuthor({ name: "Hệ Thống Hỗ Trợ Trang Trại", iconURL: botAvatar })
        .setThumbnail(botAvatar)
        .setDescription("✨ **Chào mừng chủ trang trại!**\nĐế chế gà của bạn mạnh hay yếu đều nằm trong cuốn cẩm nang này.\n\n> *Hãy chọn một danh mục bên dưới để xem chi tiết các lệnh.*")
        .setFooter({ text: `Yêu cầu bởi: ${msg.author.username}`, iconURL: msg.author.displayAvatarURL() })
        .setTimestamp();

    const response = await msg.reply({ embeds: [helpEmbed], components: [row] });
    
    const collector = response.createMessageComponentCollector({ 
        componentType: ComponentType.StringSelect, 
        time: 120000 
    });

    collector.on('collect', async i => {
        if (i.user.id !== msg.author.id) return i.reply({ content: "❌ Bạn không thể điều khiển menu này!", ephemeral: true });

        let title = "", desc = "", color = "#3498DB", image = "";
        
        switch (i.values[0]) {
            case 'basic':
                title = "🚜 DANH MỤC: TÂN THỦ";
                desc = ">>> 🔰 `:start`: Khởi tạo trang trại.\n💰 `:daily`: Nhận 500 thóc (mỗi 2 tiếng).\n📊 `:thongtin`: Xem hồ sơ và ví tiền.";
                color = "#5865F2";
                break;
            case 'feed':
                title = "🌾 NUÔI DƯỠNG & SẢN XUẤT";
                desc = ">>> 🥗 `:chogaan`: Dùng thóc nuôi gà lớn.\n🌱 `:tronglua`: Gieo hạt giống xuống ruộng.\n🚜 `:ruong`: Kiểm tra tình trạng lúa chín.\n🌾 `:thuhoach`: Thu hoạch thóc sạch.";
                color = "#2ECC71";
                break;
            case 'hatch':
                title = "🥚 ẤP TRỨNG & QUẢN LÝ";
                desc = ">>> 🐣 `:aptrung`: Đưa trứng vào máy.\n🏡 `:chuonga`: Xem danh sách chiến kê.\n💰 `:selltrung`: Bán bớt trứng lấy xu.";
                color = "#F1C40F";
                break;
            case 'items':
                title = "🎒 VẬT PHẨM ĐẶC BIỆT";
                desc = ">>> 🎒 `:khodo`: Kiểm tra túi đồ của bạn.\n🎟️ `:use ve_restart`: Nở toàn bộ trứng ngay lập tức.\n🥚 `:use trung_god`: Nhận ngay một siêu gà Legendary.\n🎁 `:use hop_bi_an`: Mở quà nhận Thóc hoặc Xu.";
                color = "#9B59B6";
                break;
            case 'upgrade':
                title = "🏗️ DANH MỤC: NÂNG CẤP";
                desc = ">>> 🏗️ `:nangcap`: Mở menu nâng cấp tổng.\n🏚️ `:upga`: Nâng sức chứa chuồng gà.\n🏭 `:upaptrung`: Nâng cấp tốc độ máy ấp.\n📦 `:upthoc`: Mở rộng kho chứa thóc.";
                color = "#E67E22";
                break;
            case 'social':
                title = "🔥 GIAO THƯƠNG & SỰ KIỆN";
                desc = ">>> 🛒 `:shop`: Mua vật phẩm từ hệ thống.\n🤝 `:trade @user`: Trao đổi với hàng xóm.\n⚔️ `:attack`: Hợp sức diệt World Boss.\n🥷 `:tromga @user`: Lén lút lấy thóc (cẩn thận!).";
                color = "#E74C3C";
                break;
        }

        const updateEmbed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setAuthor({ name: "Hướng Dẫn Chi Tiết", iconURL: botAvatar })
            .setThumbnail(botAvatar);

        await i.update({ embeds: [updateEmbed] });
    });

    collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
    });
}
});
// ... (Giữ nguyên phần đầu cho đến hết hàm editDistance cũ của ông)

function getSimilarity(s1, s2) {
    let longer = s1.toLowerCase();
    let shorter = s2.toLowerCase();
    if (s1.length < s2.length) {
        longer = s2.toLowerCase();
        shorter = s1.toLowerCase();
    }
    let longerLength = longer.length;
    if (longerLength === 0) return 1.0;
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    let costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    let newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

client.login(process.env.TOKEN);
