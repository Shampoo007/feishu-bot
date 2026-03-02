 const express = require('express');
   const https = require('https');
   const app = express();

   app.use(express.json());

   const CFG = {
     appId: 'cli_a92fa6e6f538dbc6',
     secret: 'HzkcOM9hm1b1ZaiW2fZRfc5Q80bptEY I',
     token: 'wmmDlnoJZUZyZOCCeqxv4bewQL5sqVr z'
   };

   let tenantToken = null, expire = 0;

   app.get('/', (req, res) => res.json({status: 'ok', service: 'feishu-bridge'}));

   app.all('/feishu/webhook', async (req, res) => {
     const data = req.body || {};
     console.log('收到:', JSON.stringify(data).slice(0, 200));

     if (data.challenge) {
       return res.json({ challenge: data.challenge });
     }

     if (data.header?.event_type === 'im.message.receive_v1') {
       const msg = data.event.message || {};
       const chat = msg.chat_id;
       const sender = data.event.sender?.sender_id?.op en_id;
       let text = '';
       try { text = JSON.parse(msg.content || '{}').text || ''; } catch(e) {}

       console.log('消息:', text);

       if (chat && text) {                                                                                                                                                                // 回复确认
         await sendMsg(chat, `👋 收到: "${text}"\n我是OpenClaw，连接成功！`);
       }
     }

     res.json({ code: 0, msg: 'success' });
   });

   async function sendMsg(chat, text) {
     try {
       if (!tenantToken || Date.now() >= expire - 300000) {
         await getToken();
       }
       const data = JSON.stringify({
         receive_id: chat,
         content: JSON.stringify({ text }),
         msg_type: 'text'
       });
       await new Promise((resolve, reject) => {
         const req = https.request({
           hostname: 'open.feishu.cn',
           path: `/open-apis/im/v1/messages?receive_id_type=${chat.startsWith('oc_')?'chat_id':'open_id'}`,
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${tenantToken}`,
             'Content-Type': 'application/json',
             'Content-Length': data.length
           }
         }, res => res.on('end', resolve).on('error', reject));
         req.on('error', reject);
         req.write(data);
         req.end();
       });
       console.log('发送成功');
     } catch(e) { console.error('发送失败:', e.message); }
   }

   async function getToken() {
     return new Promise((resolve, reject) => {
       const data = JSON.stringify({ app_id: CFG.appId, app_secret: CFG.secret });
       https.request({
         hostname: 'open.feishu.cn',
         path: '/open-apis/auth/v3/tenant_access_token/internal',
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
       }, res => {
         let body = '';
         res.on('data', c => body += c);
         res.on('end', () => {
           const r = JSON.parse(body);
           if (r.code === 0) {
             tenantToken = r.tenant_access_token;
             expire = Date.now() + r.expire * 1000;
             console.log('Token获取成功');
             resolve();
           } else reject(r.msg);
         });
       }).on('error', reject).end(data);
     });
   }

   const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => {
     console.log(`飞书Bridge启动，端口: ${PORT}`);
   });
