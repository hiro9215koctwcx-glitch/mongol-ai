/**
 * Messenger 自動返信の文面（案）
 * ※ネイティブ確認前の仮文。確定版として扱わない。
 */

const REPLIES = {
  // 自由入力時の挨拶＋メニュー案内（案）
  greeting:
    'Сайн байна уу! Түшиг-д тавтай морил.\n\nТа ямар үйлчилгээний талаар мэдэхийг хүсэж байна вэ? Доорх сонголтоос сонгоно уу.',

  // SERVICE_WEB（案）
  SERVICE_WEB:
    'Вэб сайт хийх үйлчилгээний талаар:\n\nЖижиг бизнест тохирсон энгийн, ойлгомжтой вэб хуудас хийж өгнө.\n\n📋 Шууд асуух → https://mongol-ai-one.vercel.app/asuulga/\n🌐 Манай вэб сайт → https://mongol-ai-one.vercel.app/',

  // SERVICE_APP（案）
  SERVICE_APP:
    'Апп хөгжүүлэлтийн талаар:\n\nУтасны апп, захиалгын систем гэх мэт таны ажилд хэрэгтэй багажийг хамт бодож, хийж өгнө. Дэлгэрэнгүй ярилцъя.\n\n📋 Шууд асуух → https://mongol-ai-one.vercel.app/asuulga/\n🌐 Манай вэб сайт → https://mongol-ai-one.vercel.app/',

  // SERVICE_CREATIVE（案）
  SERVICE_CREATIVE:
    'Дизайн, зураг, видеогийн талаар:\n\nЛого, зураг, богино видео гэх мэт бүтээлч ажлыг хийж өгнө. Юу хэрэгтэйгээ бичээрэй.\n\n📋 Шууд асуух → https://mongol-ai-one.vercel.app/asuulga/\n🌐 Манай вэб сайт → https://mongol-ai-one.vercel.app/',

  // SERVICE_OTHER（案）
  SERVICE_OTHER:
    'Баярлалаа. Таны асуултыг хариуцсан хүн шалгаж, удахгүй холбогдох болно.\n\n📋 Шууд асуух → https://mongol-ai-one.vercel.app/asuulga/\n🌐 Манай вэб сайт → https://mongol-ai-one.vercel.app/',
};

/** 自由入力時に出す quick reply ボタン（案） */
const QUICK_REPLIES = [
  { title: '🌐 Вэб сайт', payload: 'SERVICE_WEB' },
  { title: '📱 Апп', payload: 'SERVICE_APP' },
  { title: '🎨 Дизайн', payload: 'SERVICE_CREATIVE' },
  { title: '💬 Бусад асуулт', payload: 'SERVICE_OTHER' },
];

module.exports = { REPLIES, QUICK_REPLIES };
