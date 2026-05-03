const { MongoClient } = require('mongodb');
const fs = require('fs');

const DATA_FILE = './data.json';

let db, usersCol;
// In-memory cache – mirrors MongoDB so commands run fast
const data = {};

async function connectDB() {
    const clientDB = new MongoClient(process.env.MONGO_URI);
    try {
        await clientDB.connect();
        db = clientDB.db('FarmBot');
        usersCol = db.collection('Players');
        console.log('✅ Đã kết nối MongoDB!');

        // Load toàn bộ user vào RAM
        const allUsers = await usersCol.find({}).toArray();
        allUsers.forEach(u => { data[u._id] = u; });

        // Di cư từ data.json lên cloud (chỉ chạy 1 lần)
        if (fs.existsSync(DATA_FILE)) {
            const fileData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            for (const [id, value] of Object.entries(fileData)) {
                if (!data[id]) {
                    await usersCol.updateOne({ _id: id }, { $set: value }, { upsert: true });
                    data[id] = value;
                }
            }
            console.log('🚀 Di cư dữ liệu từ JSON lên MongoDB thành công!');
        }
    } catch (e) {
        console.error('❌ Lỗi kết nối DB:', e);
    }
}

/**
 * Lưu user lên MongoDB (upsert).
 * @param {string} userId
 */
async function saveData(userId) {
    if (!userId || !usersCol) return;
    await usersCol.updateOne(
        { _id: userId },
        { $set: data[userId] },
        { upsert: true },
    );
}

/**
 * Lấy (hoặc tạo mới) dữ liệu user từ cache.
 * @param {string} id
 */
function getUser(id) {
    if (!data[id]) {
        data[id] = {
            started:       false,
            thoc:          1000,
            coins:         500,
            lvGa:          0,
            lvNo:          0,
            lvAp:          0,
            eatToday:      0,
            lastEatReset:  0,
            trung:         { thuong: 10, bac: 0, vang: 0 },
            gaCon:         [],
            dangAp:        [],
            equippedGa:    null,
            lastDaily:     0,
            lastSteal:     0,
            lastTrong:     0,
            isTrongLua: false,
            inventory:     { ve_restart: 0, trung_god: 0, hop_bi_an: 0 },
            thocDaThu: 0,
            maxVuMua: 0,
        };
    }
    return data[id];
}

module.exports = { connectDB, saveData, getUser, data };
