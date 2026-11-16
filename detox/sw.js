// Novogodniy Detox Marathon: fully self-contained offline app cache.
// A first successful load while connected is needed to install this worker.
const CACHE='novogodniy-detox-pwa-v7-fixed-mobile-photo-sizes';
const APP=['./','./index.html','./manifest.webmanifest','./prizes-hq.css','./prizes-cutouts-20261116.webp','../app-icon.svg','../app-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE).then(async cache=>{
      await cache.addAll(APP);
      await self.skipWaiting();
    })
  );
});
self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('novogodniy-detox-pwa-')&&n!==CACHE).map(n=>caches.delete(n))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  const url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==self.location.origin)return;
  if(!url.pathname.startsWith('/perezagruzka/detox/') &&
     !['/perezagruzka/app-icon.svg','/perezagruzka/app-icon.png'].includes(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req,{ignoreSearch:true});
    // For navigations prefer the current site version; on blocked/offline
    // networks fall back promptly to the fully cached offline copy.
    if(req.mode==='navigate'){
      try{
        const response=await Promise.race([
          fetch(req,{cache:'no-store'}),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('network timeout')),3200))
        ]);
        if(response&&response.ok){
          if(response.type==='basic') await cache.put('./index.html',response.clone());
          return response;
        }
      }catch(err){}
      return cached || (await cache.match('./index.html')) || Response.error();
    }
    // Other assets: fast cached copy with background refresh.
    if(cached){
      event.waitUntil(fetch(req,{cache:'no-store'}).then(response=>{
        if(response&&response.ok&&response.type==='basic')return cache.put(req,response.clone());
      }).catch(()=>{}));
      return cached;
    }
    try{
      const response=await fetch(req);
      if(response&&response.ok&&response.type==='basic')await cache.put(req,response.clone());
      return response;
    }catch(err){return Response.error();}
  })());
});
