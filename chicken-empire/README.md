# 🐔 Chicken Empire Bot v2.0

Discord farming bot – đã được refactor từ 1 file 1900 dòng thành cấu trúc module rõ ràng.

## Cấu trúc thư mục

```
chicken-empire/
├── index.js                        ← Entry point (Discord client + startup)
├── package.json
├── .env.example
├── config/
│   └── constants.js                ← Hằng số, GA_LIST, BOSS_CHANNELS
└── src/
    ├── database.js                 ← MongoDB connect, getUser, saveData
    ├── handlers/
    │   ├── messageHandler.js       ← Router lệnh + auto-hatch
    │   ├── interactionHandler.js   ← Button interactions (boss, shop)
    │   └── memberHandler.js        ← Auto role khi thành viên mới vào
    ├── utils/
    │   └── helpers.js              ← formatTime, cleanText, similarity, updateTopRoles
    └── commands/
        ├── start.js                ← :start
        ├── admin.js                ← :give
        ├── upgrade.js              ← :upga :upthoc :upaptrung
        ├── trade.js                ← :trade
        ├── shop.js                 ← :trieuhoishopthanthoai
        ├── use.js                  ← :use
        ├── inventory.js            ← :khodo
        ├── daga.js                 ← :daga (PvP)
        ├── steal.js                ← :tromga
        ├── profile.js              ← :thongtin
        ├── leaderboard.js          ← :bxh
        ├── farm.js                 ← :nangcap :shop :buy :ruong :tronglua :thuhoach
        ├── hatch.js                ← :aptrung :thoigianap :skipaptrung
        ├── feed.js                 ← :chogaan
        ├── sell.js                 ← :sellga :selltrung :daily :lockga :unlockga
        ├── coop.js                 ← :chuonga
        ├── boss.js                 ← :spawnboss + worldBoss state
        ├── equip.js                ← :equip
        └── help.js                 ← :help
```

## Cài đặt

```bash
npm install
cp .env.example .env
# Điền TOKEN và MONGO_URI vào .env
npm start
```

## Các lỗi đã sửa

| # | Lỗi gốc | Cách sửa |
|---|---------|----------|
| 1 | `require('dotenv').config()` đặt **sau** `require('http')` – dotenv chưa load khi dùng `process.env` | Chuyển lên dòng đầu tiên trong `index.js` |
| 2 | `:thongtin` dùng `u.equipped` (undefined) thay vì `u.equippedGa` | Sửa thành `u.equippedGa` trong `profile.js` |
| 3 | `client.on('interactionCreate')` khai báo **bên trong** `messageCreate` → handler nhân đôi mỗi tin nhắn | Tách thành `interactionHandler.js` độc lập |
| 4 | `boss_status` handler bị **khai báo 2 lần** (dòng 1561 và 1626) – block thứ hai nằm ngoài `interactionCreate` | Giữ 1 bản duy nhất trong `interactionHandler.js` |
| 5 | `:give` gọi `saveData(msg.author.id)` thay vì `saveData(targetUser.id)` → không lưu cho người nhận | Sửa thành `saveData(targetUser.id)` |
| 6 | `:daga` gọi `saveData(msg.author.id)` cho cả người thua lẫn người thắng | Sửa thành `saveData(winnerId)` + `saveData(loserId)` |
| 7 | `http.createServer` listen trước khi `dotenv.config()` chạy xong | Đảm bảo thứ tự khởi tạo đúng |
