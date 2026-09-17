/**
 * Facebook Messenger Webhook
 * GET  = Facebook の本人確認
 * POST = メッセージ受信 → 自動返信（1階層メニュー）
 *
 * 環境変数: FB_VERIFY_TOKEN / FB_PAGE_ACCESS_TOKEN
 */

const { REPLIES, QUICK_REPLIES } = require('./replies');

const GRAPH_API = 'https://graph.facebook.com/v21.0/me/messages';

/**
 * payload → 返信内容の対応表
 * 将来の多階層は、ここにキーを足すだけで拡張しやすい形にしてある。
 * （今回は1階層のみ。次のメニューは出さない）
 */
const PAYLOAD_REPLIES = {
  SERVICE_WEB: { text: REPLIES.SERVICE_WEB },
  SERVICE_APP: { text: REPLIES.SERVICE_APP },
  SERVICE_CREATIVE: { text: REPLIES.SERVICE_CREATIVE },
  SERVICE_OTHER: { text: REPLIES.SERVICE_OTHER },
};

function buildQuickReplies(items) {
  return items.map((item) => ({
    content_type: 'text',
    title: item.title,
    payload: item.payload,
  }));
}

async function sendMessage(recipientId, message) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('FB_PAGE_ACCESS_TOKEN is not set');
    return;
  }

  const url = `${GRAPH_API}?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Send API error:', res.status, body);
  }
}

function extractPayload(messagingEvent) {
  if (messagingEvent.postback && messagingEvent.postback.payload) {
    return messagingEvent.postback.payload;
  }
  if (
    messagingEvent.message &&
    messagingEvent.message.quick_reply &&
    messagingEvent.message.quick_reply.payload
  ) {
    return messagingEvent.message.quick_reply.payload;
  }
  return null;
}

async function handleMessagingEvent(messagingEvent) {
  const senderId = messagingEvent.sender && messagingEvent.sender.id;
  if (!senderId) return;

  // echo（自分の送信）や既読などは無視
  if (messagingEvent.message && messagingEvent.message.is_echo) return;

  const payload = extractPayload(messagingEvent);

  if (payload && PAYLOAD_REPLIES[payload]) {
    await sendMessage(senderId, PAYLOAD_REPLIES[payload]);
    return;
  }

  // payload なし（自由入力）→ 挨拶＋4つの選択肢
  if (messagingEvent.message && messagingEvent.message.text) {
    await sendMessage(senderId, {
      text: REPLIES.greeting,
      quick_replies: buildQuickReplies(QUICK_REPLIES),
    });
  }
}

module.exports = async function handler(req, res) {
  // ① GET: Facebook の本人確認
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // ② POST: メッセージ受信と自動返信
  if (req.method === 'POST') {
    try {
      const body = req.body;
      if (body && body.object === 'page' && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          const messaging = entry.messaging || [];
          for (const event of messaging) {
            await handleMessagingEvent(event);
          }
        }
      }
    } catch (err) {
      console.error('webhook POST error:', err);
    }
    // Facebook には必ず 200 を返す（処理失敗でも再送ループを避ける）
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
};
