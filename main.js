// main.js — Storage Editor (Dark Modern UI, Shadow DOM, draggable, remember position, minimize)
(function(){
  if(document.getElementById('storageEditorGUI')){ document.getElementById('storageEditorGUI').remove(); return; }

  // container (host) — attach to body
  const host = document.createElement('div');
  host.id = 'storageEditorGUI';
  host.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;pointer-events:auto;';
  document.body.appendChild(host);

  // Shadow root for style isolation
  const shadow = host.attachShadow({mode:'closed'});

  // read saved position
  const POS_KEY = 'se_gui_pos_v1';
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(POS_KEY)); }catch{}
  if(saved && typeof saved.left === 'number' && typeof saved.top === 'number'){
    host.style.left = saved.left + 'px';
    host.style.top = saved.top + 'px';
    host.style.right = 'auto';
  }

  // template markup + styles (Dark Modern)
  const style = `
    :host{ all:initial; font-family:Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
    .gui{
      width:400px; max-height:520px; display:flex; flex-direction:column;
      background: linear-gradient(180deg, #0f1720 0%, #0c0f15 100%);
      border:1px solid rgba(255,255,255,0.06); color:#d7e0ea;
      border-radius:10px; box-shadow: 0 10px 30px rgba(2,6,23,0.7);
      overflow:hidden; font-size:13px;
    }
    .header{ display:flex; align-items:center; justify-content:space-between; gap:8px;
      padding:10px 12px; cursor:grab; user-select:none;
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
      border-bottom:1px solid rgba(255,255,255,0.02);
    }
    .title{ font-weight:600; color:#e6f0ff; font-size:14px; }
    .controls{ display:flex; gap:6px; align-items:center; }
    button{ background:transparent; border:1px solid rgba(255,255,255,0.04); color:inherit;
      padding:6px 8px; border-radius:8px; cursor:pointer; font-size:12px;
      transition: all .12s ease;
    }
    button:hover{ transform:translateY(-1px); background: rgba(255,255,255,0.02); }
    .tabs{ display:flex; gap:6px; padding:10px; background:transparent; border-bottom:1px solid rgba(255,255,255,0.02); }
    .tab{ padding:6px 8px; border-radius:8px; cursor:pointer; color:#9fb0c8; border:1px solid transparent; }
    .tab.active{ background: linear-gradient(90deg, rgba(100,140,255,0.12), rgba(100,220,255,0.04)); color:#e8f4ff; border-color:rgba(100,140,255,0.16); }
    .list{ padding:10px; overflow:auto; max-height:360px; display:flex; flex-direction:column; gap:8px; }
    .row{ display:flex; gap:8px; align-items:center; }
    input[type="text"]{ background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.03); color:inherit;
      padding:6px 8px; border-radius:8px; outline:none; font-size:13px;
    }
    .key{ width:140px; flex-shrink:0; }
    .val{ flex:1; }
    .footer{ display:flex; justify-content:space-between; align-items:center; padding:10px; gap:8px; border-top:1px solid rgba(255,255,255,0.02); }
    .muted{ color:#8ea6bf; font-size:12px; }
    .small{ padding:4px 6px; font-size:12px; border-radius:6px; }
    .minimized{ width:200px; }
    i{ color:#7f98b0; }
  `;

  const html = `
    <div class="gui" id="gui">
      <div class="header" id="dragHeader">
        <div class="title">Storage Editor</div>
        <div class="controls">
          <button id="minBtn" title="Minimizar" class="small">–</button>
          <button id="closeBtn" title="Fechar" class="small">✖</button>
        </div>
      </div>

      <div class="tabs" id="tabs">
        <div class="tab active" id="tabCookies">Cookies</div>
        <div class="tab" id="tabLocal">localStorage</div>
        <div class="tab" id="tabSession">sessionStorage</div>
      </div>

      <div class="list" id="list"></div>

      <div class="footer">
        <div><button id="refresh" class="small">Atualizar</button></div>
        <div class="muted">Editando cliente — não confie em dados do cliente</div>
      </div>
    </div>
  `;

  // attach style + html into shadow
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<style>${style}</style>${html}`;
  shadow.appendChild(wrapper);

  // references inside shadow (use querySelector on shadow root)
  // We used closed shadow, so keep references now:
  const guiEl = shadow.querySelector('#gui');
  const dragHeader = shadow.querySelector('#dragHeader');
  const closeBtn = shadow.querySelector('#closeBtn');
  const minBtn = shadow.querySelector('#minBtn');
  const tabCookies = shadow.querySelector('#tabCookies');
  const tabLocal = shadow.querySelector('#tabLocal');
  const tabSession = shadow.querySelector('#tabSession');
  const listEl = shadow.querySelector('#list');
  const refreshBtn = shadow.querySelector('#refresh');

  // state
  let cur = 'cookies';
  let minimized = false;

  // helper storage functions
  function getCookies(){
    if(!document.cookie) return [];
    return document.cookie.split('; ').map(c => {
      const [name,...r] = c.split('=');
      return { name, value: decodeURIComponent(r.join('=')) };
    });
  }
  function setCookie(n,v){ document.cookie = `${n}=${encodeURIComponent(v)}; path=/`; }
  function deleteCookie(n){ document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`; }

  function getLocal(){ const a=[]; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); a.push({ key:k, value: localStorage.getItem(k) }); } return a; }
  function setLocal(k,v){ localStorage.setItem(k,v); }
  function deleteLocal(k){ localStorage.removeItem(k); }

  function getSession(){ const a=[]; for(let i=0;i<sessionStorage.length;i++){ const k=sessionStorage.key(i); a.push({ key:k, value: sessionStorage.getItem(k) }); } return a; }
  function setSession(k,v){ sessionStorage.setItem(k,v); }
  function deleteSession(k){ sessionStorage.removeItem(k); }

  // render
  function render(){
    listEl.innerHTML = '';
    let data = [], isC = cur === 'cookies';
    if(isC){ data = getCookies(); if(!data.length){ listEl.innerHTML = '<i>Nenhum cookie encontrado.</i>'; return; } }
    else if(cur === 'localStorage'){ data = getLocal(); if(!data.length){ listEl.innerHTML = '<i>localStorage vazio.</i>'; return; } }
    else { data = getSession(); if(!data.length){ listEl.innerHTML = '<i>sessionStorage vazio.</i>'; return; } }

    data.forEach(it => {
      const row = document.createElement('div');
      row.className = 'row';
      const ki = document.createElement('input'); ki.type='text'; ki.className='key'; ki.readOnly=true; ki.value = it.name||it.key;
      const vi = document.createElement('input'); vi.type='text'; vi.className='val'; vi.value = it.value;
      const sv = document.createElement('button'); sv.textContent='Salvar'; sv.className='small';
      const dl = document.createElement('button'); dl.textContent='Apagar'; dl.className='small';

      if(isC){
        sv.onclick = ()=>{ setCookie(ki.value, vi.value); toast(`Cookie "${ki.value}" salvo`); };
        dl.onclick = ()=>{ if(confirm(`Apagar cookie "${ki.value}"?`)){ deleteCookie(ki.value); render(); } };
      } else if(cur === 'localStorage'){
        sv.onclick = ()=>{ setLocal(ki.value, vi.value); toast(`localStorage "${ki.value}" salvo`); };
        dl.onclick = ()=>{ if(confirm(`Apagar localStorage "${ki.value}"?`)){ deleteLocal(ki.value); render(); } };
      } else {
        sv.onclick = ()=>{ setSession(ki.value, vi.value); toast(`sessionStorage "${ki.value}" salvo`); };
        dl.onclick = ()=>{ if(confirm(`Apagar sessionStorage "${ki.value}"?`)){ deleteSession(ki.value); render(); } };
      }

      row.appendChild(ki); row.appendChild(vi); row.appendChild(sv); row.appendChild(dl);
      listEl.appendChild(row);
    });
  }

  // small non-blocking toast
  function toast(msg){
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:30px;padding:8px 12px;background:rgba(255,255,255,0.06);border-radius:8px;color:#eaf6ff;font-size:12px;z-index:2147483647;opacity:0;transition:all .2s';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.style.opacity='1');
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),250); }, 1400);
  }

  // tab switching
  function setTab(t){
    cur = t;
    [tabCookies, tabLocal, tabSession].forEach(el => el.classList.remove('active'));
    if(t === 'cookies') tabCookies.classList.add('active');
    else if(t === 'localStorage') tabLocal.classList.add('active');
    else tabSession.classList.add('active');
    render();
  }

  tabCookies.addEventListener('click', ()=> setTab('cookies'));
  tabLocal.addEventListener('click', ()=> setTab('localStorage'));
  tabSession.addEventListener('click', ()=> setTab('sessionStorage'));
  refreshBtn.addEventListener('click', render);

  // close / minimize
  closeBtn.addEventListener('click', ()=> { host.remove(); });
  minBtn.addEventListener('click', ()=> {
    minimized = !minimized;
    if(minimized){
      guiEl.classList.add('minimized');
      guiEl.style.height = '44px';
      listEl.style.display = 'none';
      tabCookies.style.display = tabLocal.style.display = tabSession.style.display = 'none';
      minBtn.textContent = '+';
    } else {
      guiEl.classList.remove('minimized');
      guiEl.style.height = '';
      listEl.style.display = 'flex';
      tabCookies.style.display = tabLocal.style.display = tabSession.style.display = 'block';
      minBtn.textContent = '–';
    }
  });

  // drag handling (mouse + touch) with position persistence
  (function draggable(){
    let dragging = false, offsetX = 0, offsetY = 0;
    function down(e){
      dragging = true;
      dragHeader.style.cursor = 'grabbing';
      const rect = host.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, {passive:false});
      document.addEventListener('touchend', up);
    }
    function move(e){
      if(!dragging) return;
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const left = Math.max(6, clientX - offsetX);
      const top = Math.max(6, clientY - offsetY);
      host.style.left = left + 'px';
      host.style.top = top + 'px';
      host.style.right = 'auto';
    }
    function up(){
      if(!dragging) return;
      dragging = false;
      dragHeader.style.cursor = 'grab';
      // persist
      try{
        const rect = host.getBoundingClientRect();
        localStorage.setItem(POS_KEY, JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) }));
      }catch{}
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', up);
    }
    dragHeader.addEventListener('mousedown', down);
    dragHeader.addEventListener('touchstart', down, {passive:true});
  })();

  // initial render
  setTab('cookies');

  // accessibility: allow opening with keyboard if host is focused (optional)
  host.tabIndex = -1;
})();
