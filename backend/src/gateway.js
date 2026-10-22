const express = require('express');

function createGateway(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  const rawOrigin = options.upstreamOrigin || process.env.UAMS_API_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3000');
  let upstream;
  if (rawOrigin) {
    const parsed = new URL(rawOrigin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('UAMS_API_ORIGIN must be an HTTP(S) origin.');
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(parsed.hostname)) throw new Error('Remote production API origin requires HTTPS.');
    upstream = parsed.origin;
  }
  const origins = new Set(options.allowedOrigins || (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').split(',').map(value=>value.trim()).filter(Boolean));
  const fetchApi = options.fetchImpl || fetch;
  const timeout = options.timeoutMs || 15000;
  app.use((req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const origin=req.headers.origin;
    if(origin && !origins.has(origin)) return res.status(403).json({success:false,error:'Origin is not allowed.'});
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){
      res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization,X-CSRF-Token');
      return res.status(204).end();
    }
    next();
  });
  app.get('/api/health',async(req,res)=>{
    if(!upstream)return res.status(503).json({status:'unavailable',service:'uams-api-gateway'});
    try{
      const response=await fetchApi(upstream+'/api/health',{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(timeout)});
      return res.status(response.ok?200:503).json({status:response.ok?'ok':'degraded',service:'uams-api-gateway',api:response.ok?'ready':'unavailable'});
    }catch{return res.status(503).json({status:'unavailable',service:'uams-api-gateway'});}
  });
  app.use('/api/v1',express.raw({type:()=>true,limit:'2mb'}),async(req,res)=>{
    if(!upstream)return res.status(503).json({success:false,error:'The canonical API origin is not configured.'});
    try{
      // The destination origin is fixed server configuration, never a request parameter.
      const route=req.originalUrl.replace(/^\/api\/v1\/grades(?=\?|$)/,'/api/v1/grades/enter').replace(/^\/api\/v1\/library\/books(?=\?|$)/,'/api/v1/library');
      const destination=new URL(route,upstream);
      if(destination.origin!==upstream)return res.status(400).json({success:false,error:'Invalid API path.'});
      const headers={accept:req.headers.accept || 'application/json'};
      for(const name of ['authorization','cookie','content-type','origin','referer','x-csrf-token'])if(req.headers[name])headers[name]=req.headers[name];
      // Discard client-supplied proxy identity. CORS validation above establishes the
      // allowed browser origin; cookies and role authorization remain canonical.
      headers['x-forwarded-host']=req.headers.origin?new URL(req.headers.origin).host:req.get('host');
      const body=['GET','HEAD'].includes(req.method)?undefined:(req.body?.length?req.body:undefined);
      const response=await fetchApi(destination,{method:req.method,headers,body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(timeout)});
      for(const name of ['content-type','content-disposition','retry-after','location']){
        const value=response.headers.get(name);if(value)res.setHeader(name,value);
      }
      const cookies=response.headers.getSetCookie?.() || [];
      if(cookies.length)res.setHeader('Set-Cookie',cookies);
      const chunks=[];let size=0;
      if(response.body)for await(const chunk of response.body){
        size+=chunk.length;
        if(size>20*1024*1024)throw new Error('Response limit exceeded');
        chunks.push(Buffer.from(chunk));
      }
      const data=Buffer.concat(chunks);
      return res.status(response.status).send(data);
    }catch{return res.status(503).json({success:false,error:'The institutional API is unavailable. Please retry.'});}
  });
  app.use((error,req,res,next)=>res.status(error.type==='entity.too.large'?413:400).json({success:false,error:'Invalid API request.'}));
  return app;
}
module.exports={createGateway};
