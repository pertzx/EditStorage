
if(document.getElementById('storageEditorGUI')){
    document.getElementById('storageEditorGUI').remove();
    return;
}

const gui = document.createElement('div');
gui.id = 'storageEditorGUI';
gui.style.cssText = `
    position:fixed; top:10px; right:10px; width:400px; max-height:500px;
    background:#fff; border:2px solid #444; border-radius:8px;
    box-shadow:0 4px 12px rgba(0,0,0,0.3); padding:10px; z-index:1000000;
    overflow-y:auto; font-family:Arial,sans-serif; font-size:14px;
    display:flex; flex-direction:column; cursor:default;
`;

gui.innerHTML = `
<div id="dragHeader" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; cursor:move;">
    <strong>Editor de Cookies / Local / Session Storage</strong>
    <button id="closeStorageEditor" style="cursor:pointer;">✖</button>
</div>

<div style="margin-bottom:8px;">
    <button id="tabCookies" style="margin-right:8px;">Cookies</button>
    <button id="tabLocal" style="margin-right:8px;">localStorage</button>
    <button id="tabSession">sessionStorage</button>
</div>

<div id="storageList" style="flex:1;overflow-y:auto;max-height:420px;"></div>
<button id="refreshStorageList" style="margin-top:8px;cursor:pointer;">Atualizar lista</button>
`;

document.body.appendChild(gui);
document.getElementById('closeStorageEditor').onclick = () => gui.remove();


// === DRAG ===
(function makeDraggable(){
    const header = document.getElementById('dragHeader');
    let x=0, y=0, offsetX=0, offsetY=0, dragging=false;

    function down(e){
        dragging = true;
        const rect = gui.getBoundingClientRect();
        offsetX = (e.clientX || e.touches?.[0].clientX) - rect.left;
        offsetY = (e.clientY || e.touches?.[0].clientY) - rect.top;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, {passive:false});
        document.addEventListener('touchend', up);
    }

    function move(e){
        if(!dragging) return;
        e.preventDefault();
        x = (e.clientX || e.touches?.[0].clientX) - offsetX;
        y = (e.clientY || e.touches?.[0].clientY) - offsetY;
        gui.style.left = x + "px";
        gui.style.top = y + "px";
        gui.style.right = "auto";
    }

    function up(){
        dragging = false;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', up);
    }

    header.addEventListener('mousedown', down);
    header.addEventListener('touchstart', down);
})();


// === RESTO DO SEU CÓDIGO (tabs, render etc) ===
// (Vou manter exatamente igual ao seu para não quebrar nada)

let currentTab='cookies';
const btnCookies=document.getElementById('tabCookies'),
      btnLocal=document.getElementById('tabLocal'),
      btnSession=document.getElementById('tabSession');

function setActiveTab(t){
    currentTab=t;
    [btnCookies,btnLocal,btnSession].forEach(b=>b.style.fontWeight='normal');
    if(t==='cookies')btnCookies.style.fontWeight='bold';
    else if(t==='localStorage')btnLocal.style.fontWeight='bold';
    else if(t==='sessionStorage')btnSession.style.fontWeight='bold';
    renderList();
}

btnCookies.onclick=()=>setActiveTab('cookies');
btnLocal.onclick=()=>setActiveTab('localStorage');
btnSession.onclick=()=>setActiveTab('sessionStorage');

function getCookies(){
    if(!document.cookie) return [];
    return document.cookie.split('; ').map(c=>{
        const [name,...r]=c.split('=');
        return {name,value:decodeURIComponent(r.join('='))};
    });
}
function setCookie(n,v){document.cookie=`${n}=${encodeURIComponent(v)}; path=/`;}
function deleteCookie(n){document.cookie=`${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`; }

function getLocalStorage(){
    let a=[];
    for(let i=0;i<localStorage.length;i++){
        let k=localStorage.key(i);
        a.push({key:k,value:localStorage.getItem(k)});
    } return a;
}
function setLocalStorage(k,v){localStorage.setItem(k,v);}
function deleteLocalStorage(k){localStorage.removeItem(k);}

function getSessionStorage(){
    let a=[];
    for(let i=0;i<sessionStorage.length;i++){
        let k=sessionStorage.key(i);
        a.push({key:k,value:sessionStorage.getItem(k)});
    } return a;
}
function setSessionStorage(k,v){sessionStorage.setItem(k,v);}
function deleteSessionStorage(k){sessionStorage.removeItem(k);}

const storageList=document.getElementById('storageList');

function renderList(){
    storageList.innerHTML='';
    let data=[], isCookie=currentTab==='cookies';
    if(currentTab==='cookies'){
        data=getCookies();
        if(data.length===0){storageList.innerHTML='<i>Nenhum cookie encontrado.</i>';return;}
    } else if(currentTab==='localStorage'){
        data=getLocalStorage();
        if(data.length===0){storageList.innerHTML='<i>localStorage vazio.</i>';return;}
    } else if(currentTab==='sessionStorage'){
        data=getSessionStorage();
        if(data.length===0){storageList.innerHTML='<i>sessionStorage vazio.</i>';return;}
    }

    data.forEach(it=>{
        const d=document.createElement('div');
        d.style='margin-bottom:10px;display:flex;align-items:center;gap:8px;';
        const ki=document.createElement('input');
        ki.type='text'; ki.readOnly=true; ki.style='width:120px;flex-shrink:0;';
        ki.value=it.name||it.key;
        const vi=document.createElement('input');
        vi.type='text'; vi.style='flex:1;'; vi.value=it.value;
        const sv=document.createElement('button');
        sv.textContent='Salvar'; sv.style.cursor='pointer';
        const dl=document.createElement('button');
        dl.textContent='Apagar'; dl.style.cursor='pointer';

        if(isCookie){
            sv.onclick=()=>{setCookie(ki.value,vi.value);alert(`Cookie "${ki.value}" atualizado.`);};
            dl.onclick=()=>{if(confirm(`Apagar cookie "${ki.value}"?`)){deleteCookie(ki.value);renderList();}};
        } else if(currentTab==='localStorage'){
            sv.onclick=()=>{setLocalStorage(ki.value,vi.value);alert(`localStorage "${ki.value}" atualizado.`);};
            dl.onclick=()=>{if(confirm(`Apagar localStorage "${ki.value}"?`)){deleteLocalStorage(ki.value);renderList();}};
        } else {
            sv.onclick=()=>{setSessionStorage(ki.value,vi.value);alert(`sessionStorage "${ki.value}" atualizado.`);};
            dl.onclick=()=>{if(confirm(`Apagar sessionStorage "${ki.value}"?`)){deleteSessionStorage(ki.value);renderList();}};
        }

        d.appendChild(ki); d.appendChild(vi); d.appendChild(sv); d.appendChild(dl);
        storageList.appendChild(d);
    });
}

document.getElementById('refreshStorageList').onclick=renderList;
setActiveTab('cookies');
