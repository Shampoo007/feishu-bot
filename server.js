const express=require('express'),https =require('https'),app=express();
   app.use(express.json());
   const CFG={id:process.env.FEISHU_APP_I D,secret:process.env.FEISHU_APP_ SECRET,token:process.env.FEISHU_ VERIFICATION_TOKEN};
   let token=null,expire=0;
   const log=(t,...a)=>console.log(`[${ne w Date().toLocaleTimeString('zh-CN ')}] [${t}]`,...a);
   async function getToken(){if(token&&Date.now()< expire-3e5)return token;return new Promise((resolve,reject)=>{const data=JSON.stringify({app_id:CFG.
 id,app_secret:CFG.secret});const
 req=https.request({hostname:'open.feishu.cn',path:'/open-apis/auth/v3/tenant_access_token/internal',method:'POST',headers:{'Content-Type':'application/json','Content-Length':d
 ata.length}},res=>{let b='';res.on('data',c=>b+=c);res. on('end',()=>{const r=JSON.parse(b);if(r.code===0){t oken=r.tenant_access_token;expir e=Date.now()+r.expire*1e3;resolv
 e(token)}else reject(new Error(r.msg))})});req.on('error' ,reject);req.write(data);req.end ()})}
   async function sendMsg(chat,text){try{const tk=await
 getToken(),typ=chat.startsWith('oc_')?'chat_id':'open_id',data=JSON.stringify({receive_id:chat,content:JSON.stringify({text}),msg_type:'text'});https.request({hostname:'open.f
 eishu.cn',path:`/open-apis/im/v1/messages?receive_id_type=${typ}`,method:'POST',headers:{Authorization:`Bearer
 ${tk}`,'Content-Type':'application/json','Content-Length':data.length}},res=>res.on('data',()=>{}).on('end',()=>log('发送',`已发送至${chat}`))).on('error',e=>log('错误',e.mess
 age)).end(data)}catch(e){log('错误',e.message)}}
   app.get('/',(req,res)=>res.json({status:'ok',service:'feishu-bridge'}));
   app.all('/feishu/webhook',async(req,res)=>{const data=req.body||{};log('收到',JSON. stringify(data).slice(0,100));if (data.challenge)return res.json({challenge:data.challen
 ge});if(data.header?.event_type= =='im.message.receive_v1'){const msg=data.event.message||{},chat= msg.chat_id,sender=data.event.se nder?.sender_id?.open_id||'unkno wn';let
 txt='';try{txt=JSON.parse(msg.content||'{}').text||''}catch(e){}log('消息',`${sender}:${txt.slice(0,30)}`);if(chat)sendMsg(chat,`收到:"${txt}"\n我是OpenClaw，连接成功！`)}res.
 json({code:0,msg:'success'})});
   app.listen(process.env.PORT||300 0,()=>{console.log('飞书Bridge启动，端 口:',process.env.PORT||3000)});
