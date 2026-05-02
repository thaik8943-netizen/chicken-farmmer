// ── Admin & channels ──────────────────────────────────────────────
const ADMIN_ID = '873867371419422742';

const BOSS_CHANNELS = [
    '1499490019541516328',
    '1499437145637781765',
    '1499437209017647235',
];

const AUTO_ROLE_ID = '1499451733888335913';

// ── Shop special item state ───────────────────────────────────────
// Được quản lý trong commands/shop.js – export từ đây để các module khác đọc
let currentSpecialShop = null;

// ── Chicken name generator ────────────────────────────────────────
const PREFIX = ['Thần','Thánh','Cổ','Vương','Đế','Huyền','Linh','Ma','Quỷ','Phật','Tiên','Thú','Chiến','Sát','Hộ','Pháp','Long','Phượng','Kỳ','Lân','Hỏa','Băng','Lôi','Phong','Thổ'];
const MID    = ['Ánh_Sáng','Bóng_Tối','Hỏa_Ngục','Băng_Giá','Sấm_Sét','Cuồng_Phong','Kim_Cương','Vàng_Ròng','Đá_Quý','Vô_Cực','Hư_Không','Tử_Vong','Sự_Sống','Hỗn_Mang','Thanh_Khiết','Tàn_Bạo','Dũng_Mãnh','Nhanh_Nhẹn','Trường_Sinh','Bất_Diệt'];
const SUFFIX = ['Kê','Gà','Điểu','Quái','Thần','Tướng','Sĩ','Binh','Chủ','Hậu','Hoàng','Vương','Lão','Phu','Sư','Tổ','Tộc','Long','Lân','Quy'];

const GA_LIST = [];
let nameCounter = 0;
for (const p of PREFIX) {
    for (const m of MID) {
        for (const s of SUFFIX) {
            if (nameCounter >= 1000) break;
            const rarity =
                nameCounter >= 950 ? 'Legendary 🟡' :
                nameCounter >= 800 ? 'Epic 🟣' :
                nameCounter >= 500 ? 'Rare 🔵' : 'Common ⚪';
            const bonus = +(1.5 + nameCounter * 0.05).toFixed(2);
            GA_LIST.push({ name: `🐔_${p}_${m}_${s}_${nameCounter}`, bonus, rarity });
            nameCounter++;
        }
        if (nameCounter >= 1000) break;
    }
    if (nameCounter >= 1000) break;
}

module.exports = {
    ADMIN_ID,
    BOSS_CHANNELS,
    AUTO_ROLE_ID,
    GA_LIST,
    get currentSpecialShop() { return currentSpecialShop; },
    set currentSpecialShop(v) { currentSpecialShop = v; },
};
