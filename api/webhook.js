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
  // トークン本体はログに出さない（長さと有無だけ）
  console.log('[send] token check', {
    hasToken: Boolean(token),
    tokenLength: token ? token.length : 0,
    recipientId,
  });

  if (!token) {
    console.error('[send] FB_PAGE_ACCESS_TOKEN is not set — abort');
    return;
  }

  const payload = {
    recipient: { id: recipientId },
    messaging_type: 'RESPONSE',
    message,
  };

  console.log('[send] before Send API', {
    recipientId,
    messageKeys: Object.keys(message),
    hasQuickReplies: Boolean(message.quick_replies),
    quickReplyCount: message.quick_replies ? message.quick_replies.length : 0,
  });

  const url = `${GRAPH_API}?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  console.log('[send] after Send API', {
    status: res.status,
    ok: res.ok,
    body: responseText,
  });
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
  console.log('[event] raw messaging event', JSON.stringify(messagingEvent));

  const senderId = messagingEvent.sender && messagingEvent.sender.id;
  if (!senderId) {
    console.log('[event] skip: no sender.id');
    return;
  }

  // echo（自分の送信）や既読などは無視
  if (messagingEvent.message && messagingEvent.message.is_echo) {
    console.log('[event] skip: is_echo');
    return;
  }

  const payload = extractPayload(messagingEvent);
  console.log('[event] extracted', {
    senderId,
    payload,
    hasMessage: Boolean(messagingEvent.message),
    hasPostback: Boolean(messagingEvent.postback),
    text: messagingEvent.message && messagingEvent.message.text,
  });

  if (payload && PAYLOAD_REPLIES[payload]) {
    console.log('[event] reply by payload:', payload);
    await sendMessage(senderId, PAYLOAD_REPLIES[payload]);
    return;
  }

  // payload なし（自由入力）→ 挨拶＋4つの選択肢
  if (messagingEvent.message && messagingEvent.message.text) {
    console.log('[event] reply with greeting + quick replies');
    await sendMessage(senderId, {
      text: REPLIES.greeting,
      quick_replies: buildQuickReplies(QUICK_REPLIES),
    });
    return;
  }

  console.log('[event] skip: no handled payload/text (read/delivery など)');
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
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (parseErr) {
          console.error('[post] body JSON parse failed', parseErr);
        }
      }

      console.log('[post] received body', JSON.stringify(body));
      console.log('[post] structure check', {
        object: body && body.object,
        entryCount: body && Array.isArray(body.entry) ? body.entry.length : 0,
        messagingCounts:
          body && Array.isArray(body.entry)
            ? body.entry.map((e) => (e.messaging ? e.messaging.length : 0))
            : [],
      });

      if (body && body.object === 'page' && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          const messaging = entry.messaging || [];
          console.log('[post] entry id=', entry.id, 'messaging length=', messaging.length);
          for (const event of messaging) {
            await handleMessagingEvent(event);
          }
        }
      } else {
        console.log('[post] unexpected body shape (object/entry が想定外)');
      }
    } catch (err) {
      console.error('[post] webhook POST error:', err);
    }
    // Facebook には必ず 200 を返す（処理失敗でも再送ループを避ける）
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
};
