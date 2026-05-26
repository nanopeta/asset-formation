// ===== 定数 =====
const APP_VERSION='v85';
const TAX_RATE=0.20315;
const BUILT_IN_ACCOUNTS={
    'nisa-growth':    {label:'NISA成長投資',color:'#5b8fa8',badge:'b-blue',   taxFree:true},
    'nisa-tsumitate': {label:'NISA積立',    color:'#5fad9b',badge:'b-purple', taxFree:true},
    'specific':       {label:'特定口座',     color:'#7ab8c4',badge:'b-teal',   taxFree:false},
    'old-nisa':       {label:'旧NISA',       color:'#c97a7a',badge:'b-red',    taxFree:true},
};
const IDECO_COLOR='#c9915a';
const BUILT_IN_ASSET_TYPES={
    'fund':           {label:'投資信託',badge:'b-blue',  color:'#5b8fa8'},
    'domestic-stock': {label:'国内株式',badge:'b-teal',  color:'#5fad9b'},
    'us-stock':       {label:'米国株式',badge:'b-orange',color:'#c9915a'},
    'other':          {label:'その他',  badge:'b-purple',color:'#9b8fc4'},
    'cash':           {label:'現金',    badge:'b-blue',  color:'#8ab4c8'},
};
const ASSET_TYPE_COLORS={'fund':'#5b8fa8','domestic-stock':'#5fad9b','us-stock':'#c9915a','other':'#9b8fc4'};
function getAccounts(){const r={...BUILT_IN_ACCOUNTS};Object.entries(D.accountTypeOverrides||{}).forEach(([id,v])=>{if(r[id])r[id]={...r[id],...v};});(D.customAccounts||[]).forEach(a=>{r[a.id]={label:a.label,color:a.color,badge:a.badge};});return r;}
function getAssetTypes(){const r={...BUILT_IN_ASSET_TYPES};Object.entries(D.assetTypeOverrides||{}).forEach(([id,v])=>{if(r[id])r[id]={...r[id],...v};});(D.customAssetTypes||[]).forEach(t=>{r[t.id]={label:t.label,badge:t.badge||'b-gray',color:t.color||'#9ca3af'};});return r;}

function getScdHolding(){const id=D.settings.scdHoldingId;return(id&&D.holdings.find(h=>h.id===id))||D.holdings[0];}

function makeDefault(){
    return {
        settings:{scdTarget:10000000,scdHoldingId:'h-schd',idecoMonthlyTotal:0,idecoStartMonth:'',usdJpy:150,targetAllocation:{},hiddenSections:[]},
        bankAccounts:[
            {id:'bank-1',name:'楽天銀行',              note:'メイン',       order:0},
            {id:'bank-2',name:'あおぞら銀行 BANK支店', note:'現金バッファ', order:1},
            {id:'bank-3',name:'GMOあおぞら銀行',       note:'給与振込',     order:2},
        ],
        creditCards:[{id:'card-1',name:'楽天カード',note:'メインカード',order:0}],
        brokers:[{id:'broker-rakuten',name:'楽天証券',order:0}],
        holdings:[
            {id:'h-schd',  name:'楽天SCHD',                        account:'nisa-growth',    assetType:'fund',monthlyAmount:100000,spotAnnual:1200000,dividendYield:3.5,dividendMonths:[3,6,9,12],brokerId:'broker-rakuten',order:0},
            {id:'h-sp500', name:'eMAXIS Slim 米国株式(S&P500)',     account:'nisa-tsumitate', assetType:'fund',monthlyAmount: 50000,spotAnnual:      0,dividendYield:0.2,dividendMonths:[],brokerId:'broker-rakuten',order:1},
            {id:'h-orukan',name:'eMAXIS Slim 全世界株式(オルカン)',  account:'nisa-tsumitate', assetType:'fund',monthlyAmount: 50000,spotAnnual:      0,dividendYield:0.2,dividendMonths:[],brokerId:'broker-rakuten',order:2},
        ],
        idecoHoldings:[],
        pointAccounts:[],
        customAccounts:[],
        customAssetTypes:[],
        accountTypeOrder:['nisa-growth','nisa-tsumitate','specific','old-nisa'],
        assetTypeOrder:['fund','domestic-stock','us-stock','other','cash'],
        accountTypeOverrides:{},
        assetTypeOverrides:{},
        current:{
            bankValues:   {'bank-1':0,'bank-2':0,'bank-3':0},
            cardValues:   {'card-1':0},
            holdingValues:{'h-schd':{value:2687199,principal:2687199},'h-sp500':{value:0,principal:0},'h-orukan':{value:0,principal:0}},
            idecoValues:  {},
            pointValues:  {},
            nisa:{year:new Date().getFullYear(),seichouUsed:0,tsumitateUsed:0,lifetimeUsed:0,seichouLifetimeUsed:0},
        },
        snapshots:[],
    };
}

function load(){
    try{
        const r=localStorage.getItem('asset-v3');
        if(r){const d=JSON.parse(r);if(!d.current.nisa.seichouLifetimeUsed)d.current.nisa.seichouLifetimeUsed=d.current.nisa.lifetimeUsed||0;if(!d.settings.scdHoldingId)d.settings.scdHoldingId='h-schd';if(!d.assetTypeOverrides)d.assetTypeOverrides={};if(!d.settings.idecoStartMonth)d.settings.idecoStartMonth='';if(!d.settings.usdJpy)d.settings.usdJpy=150;if(!d.settings.targetAllocation)d.settings.targetAllocation={};if(!d.settings.hiddenSections)d.settings.hiddenSections=[];if(!d.brokers)d.brokers=[{id:'broker-rakuten',name:'楽天証券',order:0}];if(!d.accountTypeOrder)d.accountTypeOrder=[...Object.keys(BUILT_IN_ACCOUNTS),...(d.customAccounts||[]).map(a=>a.id)];if(!d.assetTypeOrder)d.assetTypeOrder=[...Object.keys(BUILT_IN_ASSET_TYPES),...(d.customAssetTypes||[]).map(t=>t.id)];if(!d.assetTypeOrder.includes('cash'))d.assetTypeOrder.push('cash');(d.holdings||[]).forEach((h,i)=>{if(!h.spotList){h.spotList=(h.spotAnnual||0)>0?[{id:'sp'+Date.now()+i,amount:h.spotAnnual,done:false}]:[];}if(!h.currency)h.currency='jpy';if(!h.dividendMonths)h.dividendMonths=[];if(h.brokerId===undefined)h.brokerId='';});if(!d.pointAccounts)d.pointAccounts=[];if(!d.current.pointValues)d.current.pointValues={};return d;}
        const v2=localStorage.getItem('asset-v2');
        if(v2)return migrateV2(JSON.parse(v2));
    }catch{}
    return makeDefault();
}

function migrateV2(old){
    const d=makeDefault();if(!old)return d;
    d.settings.scdTarget=old.settings?.scdTarget||10000000;
    const cmap={'nisa-growth':'nisa-growth','nisa-tsumitate':'nisa-tsumitate','specific':'specific','domestic-stock':'specific','us-stock':'specific','other':'specific'};
    const tmap={'nisa-growth':'fund','nisa-tsumitate':'fund','specific':'fund','domestic-stock':'domestic-stock','us-stock':'us-stock','other':'other'};
    if(old.holdings)d.holdings=old.holdings.map((h,i)=>({id:h.id,name:h.name,account:cmap[h.category]||'specific',assetType:tmap[h.category]||'fund',monthlyAmount:h.monthlyAmount||0,spotAnnual:h.spotAnnual||0,dividendYield:0,order:i}));
    const oc=old.current||{};
    d.current.holdingValues=oc.holdingValues||{};
    d.current.nisa=oc.nisa||d.current.nisa;
    if(!d.current.nisa.seichouLifetimeUsed)d.current.nisa.seichouLifetimeUsed=d.current.nisa.lifetimeUsed||0;
    ['bank-1','bank-2','bank-3'].forEach((id,i)=>{d.current.bankValues[id]=oc[['rakutenBank','aozoraBank','gmoBank'][i]]||0;});
    d.current.cardValues['card-1']=oc.rakutenCard||0;
    d.snapshots=(old.snapshots||[]).map(s=>({month:s.month,bankValues:{'bank-1':s.rakutenBank||0,'bank-2':s.aozoraBank||0,'bank-3':s.gmoBank||0},cardValues:{'card-1':s.rakutenCard||0},holdingValues:s.holdingValues||{},idecoValues:{},nisa:{...s.nisa||{},seichouLifetimeUsed:s.nisa?.lifetimeUsed||0},cash:s.cash||0,investment:s.investment||0,idecoTotal:0,total:s.total||0}));
    return d;
}

function persist(){try{localStorage.setItem('asset-v3',JSON.stringify(D));localStorage.setItem('asset-v3-ts',new Date().toISOString());updateTs();}catch(e){toast('保存に失敗しました（ストレージ容量不足の可能性があります）','error');}}
let D=load();

// ===== ユーティリティ =====
const fmt=n=>'¥'+Math.round(n||0).toLocaleString('ja-JP');
const pct=(v,m)=>m>0?Math.min(100,(v/m)*100):0;
const el=id=>document.getElementById(id);
const uid=()=>'x'+Date.now()+Math.random().toString(36).slice(2,5);
const formatMonth=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
function fmtMonths(months){const y=Math.floor(months/12),m=months%12;if(y===0)return`${m}ヶ月`;if(m===0)return`${y}年`;return`${y}年${m}ヶ月`;}
function updateTodayDate(){const d=new Date();const days=['日','月','火','水','木','金','土'];const s=el('today-date');if(s)s.textContent=`${d.getMonth()+1}月${d.getDate()}日（${days[d.getDay()]}）`;}
function updateTs(){const ts=localStorage.getItem('asset-v3-ts');if(!ts)return;const d=new Date(ts);const p=n=>String(n).padStart(2,'0');el('last-updated').textContent=`最終更新: ${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
function applyTheme(dark){document.body.classList.toggle('dark-mode',dark);const tb=el('theme-toggle');if(tb)tb.textContent=dark?'☀️':'🌙';}
function toggleTheme(){const dark=!document.body.classList.contains('dark-mode');localStorage.setItem('asset-theme',dark?'dark':'light');applyTheme(dark);}
function calcTotals(){const c=D.current;const bank=Object.values(c.bankValues).reduce((a,v)=>a+v,0)-Object.values(c.cardValues).reduce((a,v)=>a+v,0);const pointTotal=Object.values(c.pointValues||{}).reduce((a,v)=>a+v,0);const cash=bank+pointTotal;const inv=D.holdings.reduce((a,h)=>a+holdingJpy(h).value,0);const ideco=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.value||0),0);return{cash,inv,ideco,total:cash+inv+ideco};}
function calcIdecoEstimatedPri(){const{idecoStartMonth,idecoMonthlyTotal}=D.settings;if(!idecoStartMonth||!idecoMonthlyTotal)return 0;const[sy,sm]=idecoStartMonth.split('-').map(Number);const now=new Date();const months=(now.getFullYear()-sy)*12+(now.getMonth()+1-sm)+1;return Math.max(0,months)*idecoMonthlyTotal;}
function acBadge(acc){const a=getAccounts()[acc];return a?`<span class="badge ${a.badge}">${a.label}`:'';}
function atBadge(type){const t=getAssetTypes()[type];return t?`<span class="badge ${t.badge}">${t.label}</span>`:'';}
function buildAccountOptions(selId,val){el(selId).innerHTML=Object.entries(getAccounts()).map(([k,v])=>`<option value="${k}"${val===k?' selected':''}>${v.label}</option>`).join('');}
function buildAssetTypeOptions(selId,val){el(selId).innerHTML=Object.entries(getAssetTypes()).filter(([k])=>k!=='cash').map(([k,v])=>`<option value="${k}"${val===k?' selected':''}>${v.label}</option>`).join('');}
function buildBrokerOptions(selId,val){el(selId).innerHTML='<option value="">未設定</option>'+(D.brokers||[]).map(b=>`<option value="${b.id}"${val===b.id?' selected':''}>${b.name}</option>`).join('');}
function spotTotal(h){return(h.spotList||[]).reduce((a,s)=>a+(s.amount||0),0);}
function spotDone(h){return(h.spotList||[]).filter(s=>s.done).reduce((a,s)=>a+(s.amount||0),0);}
function gainHtml(val,pri,size='11px'){if(!pri)return'';const g=val-pri,r=(g/pri*100),cls=g>=0?'positive':'negative',sign=g>=0?'+':'';return`<span class="${cls}" style="font-size:${size}">${sign}${fmt(g)}</span><span style="color:var(--muted);font-size:${size};margin-left:4px;">(${sign}${r.toFixed(2)}%)</span>`;}
function holdingJpy(h){const hv=D.current.holdingValues[h.id]||{};const mul=h.currency==='usd'?(D.settings.usdJpy||150):1;return{value:(hv.value||0)*mul,principal:(hv.principal||0)*mul};}

function toast(msg,type='info'){const t=document.createElement('div');t.className='toast toast-'+type;t.setAttribute('role','alert');const dismiss=()=>{t.classList.remove('toast-show');t.addEventListener('transitionend',()=>t.remove(),{once:true});};const msgSpan=document.createElement('span');msgSpan.textContent=msg;const closeBtn=document.createElement('button');closeBtn.className='toast-close';closeBtn.textContent='×';closeBtn.setAttribute('aria-label','閉じる');t.appendChild(msgSpan);t.appendChild(closeBtn);document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add('toast-show'));const tid=setTimeout(dismiss,5000);closeBtn.onclick=()=>{clearTimeout(tid);dismiss();};}

function customConfirm(msg,onOk,opts){opts=opts||{};const modal=el('confirm-modal');const bodyEl=el('confirm-modal-body');if(opts.html)bodyEl.innerHTML=msg;else bodyEl.textContent=msg;const okBtn=el('confirm-modal-ok');okBtn.textContent=opts.okLabel||'削除';okBtn.className='btn '+(opts.okClass||'btn-d')+' btn-sm';modal.style.display='flex';const close=()=>{modal.style.display='none';};okBtn.onclick=()=>{close();onOk();};el('confirm-modal-cancel').onclick=close;modal.onclick=(e)=>{if(e.target===modal)close();};}

function handleTitleClick(){if(_unsaved){customConfirm('保存されていない変更があります。リロードすると失われます。',()=>location.reload(),{okLabel:'リロード',okClass:'btn-d'});return;}location.reload();}

// ===== 月末リマインダー通知 =====
function _renderNotifStatus(){const s=el('notif-status');if(!s)return;const ok='Notification' in window&&Notification.permission==='granted';s.textContent=ok?'🔔 有効':'🔕 未設定';s.style.color=ok?'var(--success)':'var(--muted)';}
async function requestNotifPermission(){if(!('Notification' in window)){toast('このブラウザは通知に対応していません','error');return;}if(Notification.permission==='granted'){toast('通知はすでに有効です');_renderNotifStatus();return;}const perm=await Notification.requestPermission();if(perm==='granted'){toast('月末リマインダーを有効にしました 🔔','success');await _registerPeriodicSync();}else{toast('通知が許可されませんでした。ブラウザ設定から許可してください','error');}  _renderNotifStatus();}
async function _registerPeriodicSync(){try{const reg=await navigator.serviceWorker.ready;if('periodicSync' in reg)await reg.periodicSync.register('monthly-reminder',{minInterval:12*60*60*1000});}catch(e){}}

// ===== ヘルプモーダル =====
function openHelp(tab){tab=tab||'usage';el('help-modal').style.display='flex';switchHelpTab(tab);}
function closeHelp(){el('help-modal').style.display='none';}
function switchHelpTab(tab){['usage','changelog'].forEach(t=>{el('help-tab-'+t).classList.toggle('active',t===tab);el('help-pane-'+t).style.display=t===tab?'':'none';});}

// ===== NISA バー =====
function renderNisaBar(prefix,used,max){const p=pct(used,max);const barEl=el(`ns-${prefix}-bar`);barEl.style.width=Math.min(100,p)+'%';const over=used>max;if(over)barEl.classList.add('fill-red');else barEl.classList.remove('fill-red');el(`ns-${prefix}-used`).textContent=fmt(used);el(`ns-${prefix}-pct`).textContent=p.toFixed(1)+'%';const remEl=el(`ns-${prefix}-rem`);if(over){remEl.textContent='超過 '+fmt(used-max);remEl.style.color='var(--danger)';}else{remEl.textContent=fmt(max-used);remEl.style.color='';}}

// ===== ダッシュボード =====
let chartPortfolio=null;
let byAccChart=null,byTypeChart=null;
let trendPeriod=0;
// データ件数が同じなら update()、変わったら destroy→recreate
function _chartRender(chart,ctx,config){const nd=config.data;if(chart&&chart.data.labels.length===nd.labels.length&&chart.data.datasets.length===nd.datasets.length){chart.data.labels=nd.labels;nd.datasets.forEach((ds,i)=>{chart.data.datasets[i].data=ds.data;if(ds.backgroundColor!==undefined)chart.data.datasets[i].backgroundColor=ds.backgroundColor;if(ds.borderColor!==undefined)chart.data.datasets[i].borderColor=ds.borderColor;});chart.update('active');return chart;}if(chart)chart.destroy();return new Chart(ctx,config);}
function setTrendPeriod(months,btn){trendPeriod=months;document.querySelectorAll('.tpb').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderTrendChart();}

// ===== ダッシュボード サブレンダラー (B-1) =====
function renderDashHero(c,{cash,inv,ideco,total},invPri,effectiveIdecoPri,idecoActualPri,idecoEstPri,totalPri,snaps){
    el('db-total').textContent=fmt(total);
    el('db-total-gain').innerHTML=gainHtml(inv+ideco,totalPri,'14px');
    if(snaps.length>=1){const diff=total-snaps[snaps.length-1].total;const mEl=el('db-month-diff');mEl.textContent=(diff>=0?'+':'')+fmt(diff);mEl.style.color=diff>=0?'rgba(255,255,255,.95)':'#fca5a5';}
    el('db-inv').textContent=fmt(inv);el('db-ideco').textContent=fmt(ideco);el('db-cash').textContent=fmt(cash);
    el('db-inv-gain').innerHTML=gainHtml(inv,invPri);el('db-ideco-gain').innerHTML=gainHtml(ideco,effectiveIdecoPri);
    const apEl=el('db-ideco-actual-pri');if(apEl)apEl.textContent=idecoActualPri>0?`本来の元本: ${fmt(idecoActualPri)}`:idecoEstPri>0?`推計元本: ${fmt(idecoEstPri)}`:'';
    const cards=D.creditCards;
    el('db-bank-mini').innerHTML=D.bankAccounts.map(b=>{const linked=cards.filter(cd=>cd.bankId===b.id&&(c.cardValues[cd.id]||0)>0);const cardRows=linked.map(cd=>`<div class="bank-mini-row" style="padding-left:10px;"><span style="color:var(--danger)">└ ${cd.name}</span><span style="color:var(--danger)">-${fmt(c.cardValues[cd.id]||0)}</span></div>`).join('');return`<div class="bank-mini-row"><span>${b.name}${b.note?` (${b.note})`:''}</span><span>${fmt(c.bankValues[b.id]||0)}</span></div>${cardRows}`;}).join('')+cards.filter(cd=>!cd.bankId&&(c.cardValues[cd.id]||0)>0).map(cd=>`<div class="bank-mini-row"><span style="color:var(--danger)">${cd.name}</span><span style="color:var(--danger)">-${fmt(c.cardValues[cd.id]||0)}</span></div>`).join('')+(D.pointAccounts||[]).filter(p=>(c.pointValues?.[p.id]||0)>0).map(p=>`<div class="bank-mini-row"><span style="color:var(--muted)">🎁 ${p.name}</span><span style="color:var(--muted)">${Math.round(c.pointValues[p.id]).toLocaleString('ja-JP')} pt</span></div>`).join('');
}
function renderDashScdStrip(scdH,scdJpy,target){
    const principal=scdJpy.principal,p=pct(principal,target);
    el('ss-val').textContent=fmt(principal);el('ss-meta').textContent=`/ ${fmt(target)}`;el('ss-pct').textContent=p.toFixed(1)+'%';el('ss-rem').textContent=`残り ${fmt(Math.max(0,target-principal))}`;el('ss-bar').style.width=p+'%';
    if(scdH){const rate=(scdH.monthlyAmount||0)+spotTotal(scdH)/12,rem=target-principal;if(rem>0&&rate>0){const months=Math.ceil(rem/rate);const eta=new Date();eta.setMonth(eta.getMonth()+months);el('ss-eta').textContent=`${eta.getFullYear()}年${eta.getMonth()+1}月（${fmtMonths(months)}）`;}else el('ss-eta').textContent=rem<=0?'達成済み':'--';}
}
function renderDashNisaSection(mo){
    const now=new Date();
    const seichouAnnual  =D.holdings.filter(h=>h.account==='nisa-growth'   ).reduce((a,h)=>a+(h.monthlyAmount||0)*mo+spotDone(h),0);
    const tsumitateAnnual=D.holdings.filter(h=>h.account==='nisa-tsumitate').reduce((a,h)=>a+(h.monthlyAmount||0)*mo,0);
    const seichouLifetime=D.holdings.filter(h=>h.account==='nisa-growth'   ).reduce((a,h)=>a+holdingJpy(h).principal,0);
    const totalLifetime  =D.holdings.filter(h=>h.account==='nisa-growth'||h.account==='nisa-tsumitate').reduce((a,h)=>a+holdingJpy(h).principal,0);
    el('db-nisa-year').textContent=now.getFullYear();
    renderNisaBar('s',seichouAnnual,2400000);renderNisaBar('t',tsumitateAnnual,1200000);renderNisaBar('l',totalLifetime,18000000);renderNisaBar('sl',seichouLifetime,12000000);
    const planSeichouM=D.holdings.filter(h=>h.account==='nisa-growth'   ).reduce((a,h)=>a+(h.monthlyAmount||0),0);
    const planSeichouSp=D.holdings.filter(h=>h.account==='nisa-growth'  ).reduce((a,h)=>a+spotTotal(h),0);
    const planTsumM    =D.holdings.filter(h=>h.account==='nisa-tsumitate').reduce((a,h)=>a+(h.monthlyAmount||0),0);
    const planIdecoM   =D.settings.idecoMonthlyTotal||0;
    const planEl=el('nisa-plan-rows'),planSect=el('nisa-plan-section');
    if(!planEl)return;
    const nisaRows=[];
    if(planSeichouM>0||planSeichouSp>0){
        const allSpots=D.holdings.filter(h=>h.account==='nisa-growth').flatMap(h=>h.spotList||[]);
        const doneN=allSpots.filter(s=>s.done).length,totalN=allSpots.length;
        let sp='';if(planSeichouSp>0){sp=` + スポット${fmt(planSeichouSp)}`;if(totalN>0)sp+=`<span class="spot-badge${doneN===totalN?' spot-done':''}">${doneN}/${totalN}件済</span>`;}
        nisaRows.push(`<div class="plan-row"><span>成長投資枠</span><span>${fmt(planSeichouM)}/月×12${sp} = <strong>${fmt(planSeichouM*12+planSeichouSp)}</strong></span></div>`);
    }
    if(planTsumM>0)nisaRows.push(`<div class="plan-row"><span>積立投資枠</span><span>${fmt(planTsumM)}/月×12 = <strong>${fmt(planTsumM*12)}</strong></span></div>`);
    const allRows=[...nisaRows];
    if(nisaRows.length)allRows.push(`<div class="plan-row plan-total"><span>NISA合計</span><strong>${fmt(planSeichouM*12+planSeichouSp+planTsumM*12)}</strong></div>`);
    if(planIdecoM>0)allRows.push(`<div class="plan-row plan-ideco"><span>iDeCo</span><span>${fmt(planIdecoM)}/月×12 = <strong>${fmt(planIdecoM*12)}</strong></span></div>`);
    planEl.innerHTML=allRows.join('');if(planSect)planSect.style.display=allRows.length?'':'none';
}

function renderDashboard(){
    const c=D.current;
    const{cash,inv,ideco,total}=calcTotals();
    {const hidden=D.settings.hiddenSections||[];['sec-schd','sec-nisa','sec-portfolio','sec-trend','sec-detail','sec-sim','sec-div-cal','sec-div-sim','sec-reinvest','sec-ideco-sim','sec-fire','sec-drawdown','sec-tax'].forEach(id=>{const s=el(id);if(s)s.style.display=hidden.includes(id)?'none':'';});}
    {const rem=el('snap-reminder');if(rem){const now=new Date();const lm=new Date(now.getFullYear(),now.getMonth()-1,1);const lastMonth=formatMonth(lm);const hasSnap=D.snapshots.some(s=>s.month===lastMonth);if(!hasSnap&&D.snapshots.length>0){rem.style.display='';rem.innerHTML=`<span style="color:#92400e">⚠️ ${lastMonth} の記録がまだありません</span><button class="snap-reminder-btn" onclick="document.querySelector('[data-tab=record]').click();el('rec-month').value='${lastMonth}'">記録する</button>`;}else{rem.style.display='none';}}}
    const invPri=D.holdings.reduce((a,h)=>a+holdingJpy(h).principal,0);
    const idecoPri=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.principal||0),0);
    const idecoActualPri=c.idecoActualPrincipal||0;
    const idecoEstPri=calcIdecoEstimatedPri();
    const effectiveIdecoPri=idecoActualPri||idecoEstPri||idecoPri;
    const totalPri=invPri+effectiveIdecoPri;
    const snaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    renderDashHero(c,{cash,inv,ideco,total},invPri,effectiveIdecoPri,idecoActualPri,idecoEstPri,totalPri,snaps);
    const scdH=getScdHolding();
    renderDashScdStrip(scdH,scdH?holdingJpy(scdH):{value:0,principal:0},D.settings.scdTarget||10000000);
    renderDashNisaSection(new Date().getMonth()+1);
    renderPortfolio(inv+ideco);
    renderAnalysisData();
    buildReinvestHoldingOptions();
    renderSCHDReinvest();
    renderDividendSim();
    renderDivCalendar();
    renderTrendChart();
    renderFire();
    renderTaxEstimate();
    updateTs();
}

function renderPortfolio(totalInv){
    const c=D.current;
    const prev=prevSnap();
    const items=[
        ...D.holdings.map(h=>{const mul=h.currency==='usd'?(D.settings.usdJpy||150):1;const val=holdingJpy(h).value;const prevVal=(prev?.holdingValues?.[h.id]?.value||0)*mul;return{id:h.id,name:h.name,account:h.account,assetType:h.assetType,value:val,prevVal,color:getAccounts()[h.account]?.color||'#9ca3af'};}),
        ...D.idecoHoldings.map(h=>({id:h.id,name:h.name,account:'ideco',assetType:h.assetType,value:c.idecoValues[h.id]?.value||0,prevVal:prev?.idecoValues?.[h.id]?.value||0,color:IDECO_COLOR})),
    ].filter(i=>i.value>0);
    const tbody=el('db-ptable');
    if(!items.length){tbody.innerHTML='<tr><td colspan="4" class="empty">記録タブからデータを入力してください</td></tr>';if(chartPortfolio){chartPortfolio.destroy();chartPortfolio=null;}renderAllocationBars([]);return;}
    tbody.innerHTML=items.map(i=>{
        const r=totalInv>0?((i.value/totalInv)*100).toFixed(1):'0.0';
        const accLabel=i.account==='ideco'?'<span class="badge b-ideco">iDeCo</span>':acBadge(i.account)+'</span>';
        const diff=i.prevVal>0?i.value-i.prevVal:null;
        const diffHtml=diff!==null?`<span class="${diff>=0?'positive':'negative'}" style="font-size:11px;">${diff>=0?'+':''}${fmt(diff)}</span>`:'<span style="color:var(--muted);font-size:11px;">--</span>';
        return`<tr><td><div class="td-name"><span class="dot" style="background:${i.color}"></span>${i.name}</div></td><td>${accLabel}</td><td style="text-align:right">${diffHtml}</td><td style="text-align:right">${r}%</td></tr>`;
    }).join('');
    const ctx=el('portfolio-chart').getContext('2d');
    chartPortfolio=_chartRender(chartPortfolio,ctx,{type:'doughnut',data:{labels:items.map(i=>i.name),datasets:[{data:items.map(i=>i.value),backgroundColor:items.map(i=>i.color),borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)}  (${((c.raw/totalInv)*100).toFixed(1)}%)`}}}}});
    renderAllocationBars(items);
}

function renderAllocationBars(items){
    const sec=el('db-alloc-section');if(!sec)return;
    const ta=D.settings.targetAllocation||{};
    if(!Object.keys(ta).length){sec.style.display='none';return;}
    const totalVal=items.reduce((a,i)=>a+i.value,0);
    const byType={};
    items.forEach(i=>{byType[i.assetType]=(byType[i.assetType]||0)+i.value;});
    const types=getAssetTypes();
    const allIds=[...new Set([...Object.keys(ta),...Object.keys(byType)])];
    sec.style.display='';
    sec.innerHTML=`<div class="alloc-title">目標配分</div><table class="alloc-table"><thead><tr><th>種別</th><th style="text-align:right">実績</th><th style="text-align:right">目標</th><th style="text-align:right">差分</th><th style="text-align:right">買い増し目安</th></tr></thead><tbody>`+
    allIds.map(id=>{
        const actual=totalVal>0?((byType[id]||0)/totalVal*100):0;
        const target=ta[id]||0;
        const diff=actual-target;
        const diffCls=Math.abs(diff)<3?'':'positive';
        const diffClsNeg=diff<-2?'negative':'';
        const sign=diff>=0?'+':'';
        const buyAmt=target>0?Math.round(totalVal*(target-actual)/100):null;
        const buyHtml=buyAmt!=null?(buyAmt>0?`<span class="positive">+${fmt(buyAmt)}</span>`:`<span class="negative">${fmt(buyAmt)}</span>`):'--';
        return`<tr><td>${types[id]?.label||id}</td><td style="text-align:right">${actual.toFixed(1)}%</td><td style="text-align:right;color:var(--muted)">${target>0?target+'%':'--'}</td><td style="text-align:right"><span class="${diff>=0?diffCls:diffClsNeg}">${target>0?sign+diff.toFixed(1)+'%':'--'}</span></td><td style="text-align:right">${buyHtml}</td></tr>`;
    }).join('')+'</tbody></table>';
}

function renderAnalysisData(){
    const c=D.current;
    const scdH=getScdHolding();
    const scdAnalJpy=scdH?holdingJpy(scdH):{value:0,principal:0};
    const target=D.settings.scdTarget||10000000;
    el('sim-cur').textContent=fmt(scdAnalJpy.principal);el('sim-m').textContent=scdH?fmt(scdH.monthlyAmount)+'/月':'--';el('sim-sp').textContent=scdH?fmt(spotTotal(scdH))+'/年':'--';
    const rem=Math.max(0,target-scdAnalJpy.principal);el('sim-rem').textContent=fmt(rem);
    if(scdH){const rate=(scdH.monthlyAmount||0)+spotTotal(scdH)/12;if(rem>0&&rate>0){const months=Math.ceil(rem/rate);const eta=new Date();eta.setMonth(eta.getMonth()+months);el('sim-eta').textContent=`${eta.getFullYear()}年${eta.getMonth()+1}月`;el('sim-months').textContent=fmtMonths(months);}else{el('sim-eta').textContent=rem<=0?'達成済み':'--';el('sim-months').textContent='--';}}

    const{cash,inv,ideco}=calcTotals();const totalInv=inv+ideco;
    const allH=[
        ...D.holdings.map(h=>{const jpy=holdingJpy(h);return{...h,hv:{value:jpy.value,principal:jpy.principal},acLabel:acBadge(h.account)+'</span>',accKey:h.account,isIdeco:false};}),
        ...D.idecoHoldings.map(h=>({...h,hv:c.idecoValues[h.id]||{},acLabel:'<span class="badge b-ideco">iDeCo</span>',accKey:'ideco',isIdeco:true})),
    ];
    const totalVal=allH.reduce((a,h)=>a+(h.hv.value||0),0);
    const totalPri=allH.reduce((a,h)=>a+(h.hv.principal||0),0);
    const totalGain=totalPri>0?totalVal-totalPri:null;
    el('an-total-val').textContent=fmt(totalVal);el('an-total-pri').textContent=fmt(totalPri);
    if(totalGain!==null){const rate=(totalGain/totalPri*100);el('an-total-gain').innerHTML=`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${fmt(totalGain)}</span>`;el('an-total-gain-r').innerHTML=`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${rate.toFixed(2)}%</span>`;}

    const byAcc={},byType={};
    allH.forEach(h=>{if(!byAcc[h.accKey])byAcc[h.accKey]={val:0,pri:0,label:h.acLabel};byAcc[h.accKey].val+=h.hv.value||0;byAcc[h.accKey].pri+=h.hv.principal||0;if(!byType[h.assetType])byType[h.assetType]={val:0,pri:0};byType[h.assetType].val+=h.hv.value||0;byType[h.assetType].pri+=h.hv.principal||0;});
    if(cash>0)byType['cash']={val:cash,pri:0};
    const accOrder=[...(D.accountTypeOrder||[...Object.keys(BUILT_IN_ACCOUNTS),...(D.customAccounts||[]).map(a=>a.id)]),'ideco'];
    function breakdownRow(label,d,totalVal,totalGain,idx){const g=d.pri>0?d.val-d.pri:null;const gr=d.pri>0?(d.val-d.pri)/d.pri*100:null;const r=totalVal>0?((d.val/totalVal)*100).toFixed(1):'0.0';const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gr!==null?`<span class="${gr>=0?'positive':'negative'}">${gr>=0?'+':''}${gr.toFixed(2)}%</span>`:'--';return`<tr${idx!==undefined?` data-row-idx="${idx}"`:''}><td><div class="td-name">${label}</div></td><td style="text-align:right">${fmt(d.val)}</td><td style="text-align:right">${gHtml}</td><td style="text-align:right">${grHtml}</td><td style="text-align:right">${r}%</td></tr>`;}
    const totalGainRate=totalPri>0?(totalGain/totalPri*100):null;
    const accFooter=`<tr style="border-top:2px solid var(--border);font-weight:700"><td>合計</td><td style="text-align:right">${fmt(totalVal)}</td><td style="text-align:right">${totalGain!==null?`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${fmt(totalGain)}</span>`:'--'}</td><td style="text-align:right">${totalGainRate!==null?`<span class="${totalGainRate>=0?'positive':'negative'}">${totalGainRate>=0?'+':''}${totalGainRate.toFixed(2)}%</span>`:'--'}</td><td></td></tr>`;
    const accEntries=Object.entries(byAcc).sort((a,b)=>accOrder.indexOf(a[0])-accOrder.indexOf(b[0])).filter(([,d])=>d.val>0);
    el('an-by-account').innerHTML=accEntries.map(([,d],i)=>breakdownRow(d.label,d,totalVal,totalGain,i)).join('')+accFooter;
    const typeOrder=D.assetTypeOrder||[...Object.keys(BUILT_IN_ASSET_TYPES),...(D.customAssetTypes||[]).map(t=>t.id)];
    const typeEntries=Object.entries(byType).sort((a,b)=>{if(a[0]==='cash')return 1;if(b[0]==='cash')return -1;const ai=typeOrder.indexOf(a[0]),bi=typeOrder.indexOf(b[0]);return(ai<0?999:ai)-(bi<0?999:bi);}).filter(([,d])=>d.val>0);
    const totalTypeVal=typeEntries.reduce((a,[,d])=>a+d.val,0);
    const typeFooter=`<tr style="border-top:2px solid var(--border);font-weight:700"><td>合計</td><td style="text-align:right">${fmt(totalTypeVal)}</td><td style="text-align:right">${totalGain!==null?`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${fmt(totalGain)}</span>`:'--'}</td><td style="text-align:right">${totalGainRate!==null?`<span class="${totalGainRate>=0?'positive':'negative'}">${totalGainRate>=0?'+':''}${totalGainRate.toFixed(2)}%</span>`:'--'}</td><td></td></tr>`;
    el('an-by-type').innerHTML=typeEntries.map(([k,d],i)=>breakdownRow(k==='cash'?'<span class="badge b-blue">現金</span>':atBadge(k),d,totalTypeVal,totalGain,i)).join('')+typeFooter;
    {const accts=getAccounts();const accColors=accEntries.map(([k])=>k==='ideco'?IDECO_COLOR:(accts[k]?.color||'#9ca3af'));const accCtx=el('by-account-chart').getContext('2d');byAccChart=_chartRender(byAccChart,accCtx,{type:'doughnut',data:{labels:accEntries.map(([k,d])=>d.label.replace(/<[^>]*>/g,'')||k),datasets:[{data:accEntries.map(([,d])=>d.val),backgroundColor:accColors,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:11,padding:8},onClick:(e,li,legend)=>{const idx=li.index;const ci=legend.chart;const was=ci.getDataVisibility(idx);ci.toggleDataVisibility(idx);ci.update();const rows=el('an-by-account').querySelectorAll('[data-row-idx]');if(rows[idx])rows[idx].style.display=was?'none':'';},},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)}  (${((c.raw/totalVal)*100).toFixed(1)}%)`}}}}});}
    {const atypes=getAssetTypes();const typeColors=typeEntries.map(([k])=>atypes[k]?.color||ASSET_TYPE_COLORS[k]||'#9ca3af');const typeLabels=typeEntries.map(([k])=>atypes[k]?.label||k);const typCtx=el('by-type-chart').getContext('2d');byTypeChart=_chartRender(byTypeChart,typCtx,{type:'doughnut',data:{labels:typeLabels,datasets:[{data:typeEntries.map(([,d])=>d.val),backgroundColor:typeColors,borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:11,padding:8},onClick:(e,li,legend)=>{const idx=li.index;const ci=legend.chart;const was=ci.getDataVisibility(idx);ci.toggleDataVisibility(idx);ci.update();const rows=el('an-by-type').querySelectorAll('[data-row-idx]');if(rows[idx])rows[idx].style.display=was?'none':'';},},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)}  (${((c.raw/totalTypeVal)*100).toFixed(1)}%)`}}}}});}
    const updateAnHoldingsFoot=(s)=>{const vis=s.rows.filter(r=>r.tr.style.display!=='none');const tot=(ci)=>vis.reduce((a,r)=>a+(parseFloat(r.cells[ci]?.raw)||0),0);const v=tot(3),p=tot(4),g=p>0?v-p:null,gr=p>0?(v-p)/p*100:null;const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gr!==null?`<span class="${gr>=0?'positive':'negative'}">${gr>=0?'+':''}${gr.toFixed(2)}%</span>`:'--';el('an-holdings-foot').innerHTML=`<tr style="border-top:2px solid var(--border);font-weight:700"><td>合計</td><td></td><td></td><td style="text-align:right">${fmt(v)}</td><td style="text-align:right">${p>0?fmt(p):'--'}</td><td style="text-align:right">${gHtml}</td><td style="text-align:right">${grHtml}</td><td></td></tr>`;};
    el('an-holdings').innerHTML=!allH.length?'<tr><td colspan="8" class="empty">データなし</td></tr>':allH.map(h=>{const v=h.hv.value||0,p=h.hv.principal||0,g=p>0?v-p:null,gRate=p>0?(v-p)/p*100:null;const r=totalInv>0?((v/totalInv)*100).toFixed(1):'0.0';const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gRate!==null?`<span class="${gRate>=0?'positive':'negative'}">${gRate>=0?'+':''}${gRate.toFixed(2)}%</span>`:'--';const accText=h.accKey==='ideco'?'iDeCo':(getAccounts()[h.accKey]?.label||h.accKey);const atText=getAssetTypes()[h.assetType]?.label||h.assetType;return`<tr><td><div class="td-name">${h.name}</div></td><td data-raw="${accText}">${h.acLabel}</td><td data-raw="${atText}">${atBadge(h.assetType)}</td><td data-raw="${v}" style="text-align:right">${fmt(v)}</td><td data-raw="${p}" style="text-align:right">${p>0?fmt(p):'--'}</td><td data-raw="${g??''}" style="text-align:right">${gHtml}</td><td data-raw="${gRate??''}" style="text-align:right">${grHtml}</td><td data-raw="${r}" style="text-align:right">${r}%</td></tr>`;}).join('');
    xfBind('an-holdings','an-holdings',{afterFilter:updateAnHoldingsFoot});
}

function buildReinvestHoldingOptions(){
    const sel=el('sim-holding-sel');
    if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">-- 銘柄を選択 --</option>'+
        D.holdings.map(h=>`<option value="${h.id}">${h.name}</option>`).join('');
    if(cur)sel.value=cur;
}
function _populateReinvestFromHolding(id){
    const h=id?D.holdings.find(x=>x.id===id):null;
    if(!h)return;
    el('schd-start-val').value='';
    el('schd-start-principal').value='';
    el('schd-yield-sim').value=(h.dividendYield||0).toFixed(2);
    el('schd-monthly-add').value=h.monthlyAmount||0;
    const accs=getAccounts();const taxCb=el('schd-tax');
    if(taxCb)taxCb.checked=!(accs[h.account]?.taxFree);
}
function renderSCHDReinvest(){
    const selId=el('sim-holding-sel')?.value||'';
    const selH=selId?D.holdings.find(h=>h.id===selId):getScdHolding();
    const selJpy=selH?holdingJpy(selH):{value:0,principal:0};
    const inputVal=parseFloat(el('schd-start-val')?.value)||0;
    const startVal=inputVal>0?inputVal:selJpy.value;
    const inputPri=parseFloat(el('schd-start-principal')?.value)||0;
    const startPrincipal=inputPri>0?inputPri:selJpy.principal;
    const y=parseFloat(el('schd-yield-sim')?.value||3.0)/100;
    const divGrowth=parseFloat(el('schd-div-growth')?.value||0)/100;
    const annualReturn=parseFloat(el('schd-annual-return')?.value||0)/100;
    const years=parseInt(el('schd-years-sel')?.value||10);
    const monthlyAdd=parseFloat(el('schd-monthly-add')?.value)||0;
    const reinvest=el('schd-reinvest')?.checked!==false;
    const taxAfter=el('schd-tax')?.checked||false;
    const TAX=1-TAX_RATE;
    const targetIncome=parseFloat(el('schd-target-income')?.value)||0;
    const rows=[];let val=startVal,cumDiv=0,reachYr=null;
    for(let yr=1;yr<=years;yr++){
        const effectiveYield=y*Math.pow(1+divGrowth,yr-1);
        const divGross=val*effectiveYield;
        const divNet=taxAfter?divGross*TAX:divGross;
        cumDiv+=divNet;
        val=val*(1+annualReturn)+monthlyAdd*12+(reinvest?divNet:0);
        const principal=startPrincipal+monthlyAdd*12*yr;
        const gain=val-principal;
        if(targetIncome>0&&reachYr===null&&divNet/12>=targetIncome)reachYr=yr;
        rows.push({yr,val,div:divNet,cumDiv,principal,gain});
    }
    const note=el('schd-reach-note');
    if(note){
        if(targetIncome>0&&reachYr){note.style.display='';note.style.background='';note.style.borderColor='';note.style.color='';note.textContent=`目標月収 ${fmt(targetIncome)} 達成: ${reachYr}年目`;}
        else if(targetIncome>0&&!reachYr){note.style.display='';note.style.background='#fef3c7';note.style.borderColor='#f59e0b';note.style.color='#92400e';note.textContent=`目標月収 ${fmt(targetIncome)} は${years}年以内に未達成`;}
        else{note.style.display='none';note.style.background='';note.style.borderColor='';note.style.color='';}
    }
    el('schd-reinvest-body').innerHTML=rows.map(r=>{
        const gainCls=r.gain>=0?'positive':'negative';
        const gainStr=r.gain>=0?'+'+fmt(r.gain):fmt(r.gain);
        const highlight=targetIncome>0&&reachYr===r.yr?' style="background:#f0fdf4;outline:2px solid #86efac;outline-offset:-1px;"':'';
        return`<tr${highlight}>
        <td>${r.yr}年目${reachYr===r.yr?'<span style="margin-left:4px;font-size:10px;color:var(--success);font-weight:700;">✓達成</span>':''}</td>
        <td style="text-align:right">${fmt(r.principal)}</td>
        <td style="text-align:right">${fmt(r.val)}</td>
        <td style="text-align:right"><span class="${gainCls}">${gainStr}</span></td>
        <td style="text-align:right;color:var(--success);font-weight:600">${fmt(r.div)}</td>
        <td style="text-align:right;color:var(--muted)">${fmt(r.div/12)}</td>
        <td style="text-align:right">${fmt(r.cumDiv)}</td>
    </tr>`;}).join('');
    // チャート描画
    const rCtx=el('reinvest-chart')?.getContext('2d');
    if(rCtx&&rows.length){
        chartReinvest=_chartRender(chartReinvest,rCtx,{type:'line',data:{labels:rows.map(r=>r.yr+'年'),datasets:[
            {label:'評価額',    data:rows.map(r=>r.val),      borderColor:'#5b8fa8',backgroundColor:'rgba(91,143,168,.10)',fill:true, tension:.3,pointRadius:3},
            {label:'投資元本',  data:rows.map(r=>r.principal),borderColor:'#c9915a',borderDash:[6,3],              fill:false,tension:.3,pointRadius:3,borderWidth:1.5},
            {label:'累計分配金',data:rows.map(r=>r.cumDiv),   borderColor:'#5fad9b',borderDash:[4,3],              fill:false,tension:.3,pointRadius:3},
        ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:11}}},scales:{y:{ticks:{callback:v=>(v/10000).toFixed(0)+'万円'}}}}});
    }else if(chartReinvest){chartReinvest.destroy();chartReinvest=null;}
}

function renderDividendSim(){
    const c=D.current;
    const divGrowthRate=parseFloat(el('div-sim-growth-rate')?.value||3)/100;
    const allH=[
        ...D.holdings.filter(h=>(h.dividendYield||0)>0).map(h=>{const jpy=holdingJpy(h);return{...h,hv:{value:jpy.value,principal:jpy.principal},isIdeco:false};}),
        ...D.idecoHoldings.filter(h=>(h.dividendYield||0)>0).map(h=>({...h,hv:c.idecoValues[h.id]||{},isIdeco:true})),
    ];
    let totalBefore=0,totalAfter=0,total5yr=0,total10yr=0;
    const rows=allH.map(h=>{
        const v=h.hv.value||0;
        const y=(h.dividendYield||0)/100;
        const before=v*y;
        const isTaxFree=(getAccounts()[h.account]?.taxFree)||h.isIdeco;
        const taxRate=isTaxFree?0:TAX_RATE;
        const after=before*(1-taxRate);
        const after5yr=after*Math.pow(1+divGrowthRate,5);
        const after10yr=after*Math.pow(1+divGrowthRate,10);
        totalBefore+=before;totalAfter+=after;total5yr+=after5yr;total10yr+=after10yr;
        const accText=h.isIdeco?'iDeCo':(getAccounts()[h.account]?.label||h.account);
        const accLabel=h.isIdeco?'<span class="badge b-ideco">iDeCo</span>':acBadge(h.account)+'</span>';
        const taxText=isTaxFree?'非課税':'課税';
        const taxLabel=isTaxFree?'<span class="div-tax-free">非課税</span>':'<span class="div-tax">課税</span>';
        const yieldStr=(y*100).toFixed(2)+'%';
        return`<tr>
            <td><div class="td-name">${h.name}</div></td>
            <td data-raw="${accText}">${accLabel}</td>
            <td data-raw="${taxText}">${taxLabel}</td>
            <td data-raw="${v}" style="text-align:right">${fmt(v)}</td>
            <td data-raw="${(y*100).toFixed(2)}" style="text-align:right">${yieldStr}</td>
            <td data-raw="${Math.round(before)}" style="text-align:right">${fmt(before)}</td>
            <td data-raw="${Math.round(after)}" style="text-align:right">${fmt(after)}</td>
            <td data-raw="${Math.round(after/12)}" style="text-align:right">${fmt(after/12)}</td>
            <td data-raw="${Math.round(after5yr)}" style="text-align:right;color:var(--muted)">${fmt(after5yr)}</td>
            <td data-raw="${Math.round(after10yr)}" style="text-align:right;color:var(--muted)">${fmt(after10yr)}</td>
        </tr>`;
    });
    el('div-sim-body').innerHTML=rows.join('');
    const updateDivSimFoot=(s)=>{
        const vis=s.rows.filter(r=>r.tr.style.display!=='none');
        const tot=(ci)=>vis.reduce((a,r)=>a+(parseFloat(r.cells[ci]?.raw)||0),0);
        const b=tot(5),a=tot(6),a5=tot(8),a10=tot(9);
        el('div-sim-foot').innerHTML=`<tr style="border-top:2px solid var(--border);font-weight:700"><td>合計</td><td></td><td></td><td></td><td></td><td style="text-align:right">${fmt(b)}</td><td style="text-align:right">${fmt(a)}</td><td style="text-align:right">${fmt(a/12)}</td><td style="text-align:right;color:var(--muted)">${fmt(a5)}</td><td style="text-align:right;color:var(--muted)">${fmt(a10)}</td></tr>`;
    };
    xfBind('div-sim','div-sim-body',{afterFilter:updateDivSimFoot});
}

let chartDivCal=null;
function renderDivCalendar(){
    const c=D.current;
    const allH=[
        ...D.holdings.filter(h=>(h.dividendYield||0)>0&&(h.dividendMonths||[]).length>0).map(h=>({...h,isIdeco:false})),
        ...D.idecoHoldings.filter(h=>(h.dividendYield||0)>0&&(h.dividendMonths||[]).length>0).map(h=>({...h,isIdeco:true})),
    ];
    const body=el('div-cal-body');if(!body)return;
    if(!allH.length){
        if(chartDivCal){chartDivCal.destroy();chartDivCal=null;}
        body.innerHTML='<div style="color:var(--muted);font-size:13px;padding:4px 0;">配当月を設定した銘柄がありません。銘柄設定 → 銘柄を編集 → 配当月を選択してください。</div>';return;
    }
    const monthly=Array(12).fill(0);
    allH.forEach(h=>{
        const val=h.isIdeco?(c.idecoValues[h.id]?.value||0):holdingJpy(h).value;
        const annual=val*(h.dividendYield||0)/100;
        const months=h.dividendMonths||[];
        const perMonth=months.length?annual/months.length:0;
        months.forEach(m=>monthly[m-1]+=perMonth);
    });
    const mNames=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const annualTotal=monthly.reduce((a,v)=>a+v,0);
    if(!el('div-cal-chart')){
        body.innerHTML='<div class="chart-wrap" style="height:220px"><canvas id="div-cal-chart"></canvas></div><div id="div-cal-total" style="margin-top:10px;font-size:12px;color:var(--muted);text-align:right;"></div>';
    }
    const totalEl=el('div-cal-total');
    if(totalEl)totalEl.innerHTML=annualTotal>0?`年間合計 <strong style="color:var(--success);font-size:14px;">${fmt(annualTotal)}</strong>　月平均 <strong style="color:var(--text)">${fmt(annualTotal/12)}</strong>`:'';
    const ctx=el('div-cal-chart')?.getContext('2d');
    if(ctx){
        chartDivCal=_chartRender(chartDivCal,ctx,{type:'bar',data:{labels:mNames,datasets:[{label:'月間配当',data:monthly,backgroundColor:monthly.map(v=>v>0?'rgba(95,173,155,.8)':'rgba(216,231,239,.6)'),borderColor:monthly.map(v=>v>0?'#5fad9b':'#d8e7ef'),borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}}},scales:{y:{ticks:{callback:v=>v>=10000?(v/10000).toFixed(1)+'万':fmt(v)},beginAtZero:true}}}});
    }
}

function calcIncomeTax(income){
    const b=[[1950000,.05,0],[3300000,.1,97500],[6950000,.2,427500],[9000000,.23,636000],[18000000,.33,1536000],[40000000,.4,2796000]];
    for(const[lim,r,d] of b)if(income<=lim)return Math.max(0,Math.floor(income*r-d));
    return Math.floor(income*.45-4796000);
}
function renderIdecoSim(){
    const c=D.current;
    const idecoTotal=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.value||0),0);
    const res=el('ideco-sim-result');if(!res)return;
    if(!idecoTotal){res.innerHTML='<div style="color:var(--muted);font-size:13px;">iDeCoの評価額を記録タブで入力してください</div>';return;}
    const yrs=parseInt(el('ideco-sim-years')?.value||20);
    const ret=parseFloat(el('ideco-sim-return')?.value||4)/100;
    const method=el('ideco-sim-method')?.value||'lumpsum';
    const projected=Math.round(idecoTotal*Math.pow(1+ret,yrs));
    let html='';
    if(method==='lumpsum'){
        const startMonth=D.settings.idecoStartMonth;
        let svcYrs=20;
        if(startMonth){
            const start=new Date(startMonth+'-01');
            const receiveDate=new Date();receiveDate.setFullYear(receiveDate.getFullYear()+yrs);
            svcYrs=Math.max(1,Math.floor((receiveDate-start)/(1000*60*60*24*365.25)));
        }
        const deduction=svcYrs<=20?400000*svcYrs:8000000+700000*(svcYrs-20);
        const taxableIncome=Math.floor(Math.max(0,projected-deduction)/2);
        const incomeTax=calcIncomeTax(taxableIncome);
        const residentTax=Math.floor(taxableIncome*0.1);
        const totalTax=incomeTax+residentTax;
        const netAmount=projected-totalTax;
        const noStartNote=!startMonth?'<div style="font-size:11px;color:var(--warning);margin-bottom:8px;">⚠ 基本設定でiDeCo開始月を設定すると加入年数が自動計算されます（現在は'+svcYrs+'年で計算）</div>':'';
        html=`${noStartNote}<div class="g4 mb">
            <div class="card card-sm"><div class="clabel">${yrs}年後の想定残高</div><div class="cval">${fmt(projected)}</div></div>
            <div class="card card-sm"><div class="clabel">退職所得控除（加入${svcYrs}年）</div><div class="cval">${fmt(deduction)}</div></div>
            <div class="card card-sm"><div class="clabel">概算税額</div><div class="cval" style="color:var(--danger)">${fmt(totalTax)}</div><div class="csub">税率 ${projected>0?(totalTax/projected*100).toFixed(1):0}%</div></div>
            <div class="card card-sm"><div class="clabel">実質受取額（税引後）</div><div class="cval positive">${fmt(netAmount)}</div></div>
        </div>
        <div style="font-size:11px;color:var(--muted);">所得税 ${fmt(incomeTax)} + 住民税 ${fmt(residentTax)}　※退職所得 = (残高 − 控除額) ÷ 2 に累進課税</div>`;
    } else {
        const annualAmount=Math.round(projected/20);
        const pensionDeduction=1100000;
        const taxableIncome=Math.max(0,annualAmount-pensionDeduction);
        const incomeTax=calcIncomeTax(taxableIncome);
        const residentTax=Math.floor(taxableIncome*0.1);
        const totalTax=incomeTax+residentTax;
        const netAnnual=annualAmount-totalTax;
        html=`<div class="g4 mb">
            <div class="card card-sm"><div class="clabel">${yrs}年後の想定残高</div><div class="cval">${fmt(projected)}</div></div>
            <div class="card card-sm"><div class="clabel">年間受取（20年分割）</div><div class="cval">${fmt(annualAmount)}</div><div class="csub">${fmt(annualAmount/12)}/月</div></div>
            <div class="card card-sm"><div class="clabel">概算税額/年</div><div class="cval" style="color:var(--danger)">${fmt(totalTax)}</div></div>
            <div class="card card-sm"><div class="clabel">年間実質受取（税引後）</div><div class="cval positive">${fmt(netAnnual)}</div><div class="csub">${fmt(netAnnual/12)}/月</div></div>
        </div>
        <div style="font-size:11px;color:var(--muted);">公的年金等控除 ${fmt(pensionDeduction)}/年 適用後に課税　※65歳以上想定</div>`;
    }
    res.innerHTML=html;
}

let chartDrawdown=null;
function renderDrawdown(){
    const{total}=calcTotals();
    const initAsset=parseFloat(el('dd-init-asset')?.value)||total;
    const monthlyWithdraw=parseFloat(el('dd-annual-withdraw')?.value)||0;
    const annualWithdraw=monthlyWithdraw*12;
    const ret=parseFloat(el('dd-return')?.value||4)/100;
    const inflation=parseFloat(el('dd-inflation')?.value||0)/100;
    const years=parseInt(el('dd-years')?.value||40);
    const res=el('drawdown-result');if(!res)return;
    if(monthlyWithdraw<=0){res.innerHTML='<div style="color:var(--muted);font-size:13px;">月間取り崩し額を入力してください</div>';if(chartDrawdown){chartDrawdown.destroy();chartDrawdown=null;}return;}
    const rows=[];let val=initAsset,depletedYr=null,curWithdraw=annualWithdraw;
    for(let yr=1;yr<=years;yr++){
        val=val*(1+ret)-curWithdraw;
        if(val<=0&&depletedYr===null)depletedYr=yr;
        rows.push({yr,val:Math.max(0,val),withdraw:curWithdraw});
        if(val<0)break;
        curWithdraw*=(1+inflation);
    }
    const isSafe=depletedYr===null;
    if(!el('drawdown-stats')){res.innerHTML='<div id="drawdown-stats"></div><div class="chart-wrap chart-h300" id="drawdown-chart-wrap" style="margin-bottom:12px"><canvas id="drawdown-chart"></canvas></div><div id="drawdown-table-wrap" class="tbl-wrap tbl-scroll"></div>';}
    el('drawdown-stats').innerHTML=`<div class="g3 mb">
        <div class="card card-sm"><div class="clabel">初期資産</div><div class="cval">${fmt(initAsset)}</div></div>
        <div class="card card-sm"><div class="clabel">月間取り崩し（初年）</div><div class="cval">${fmt(monthlyWithdraw)}</div><div class="csub">年間 ${fmt(annualWithdraw)}${inflation>0?` (+${(inflation*100).toFixed(1)}%/年)`:''}</div></div>
        <div class="card card-sm"><div class="clabel">資産枯渇</div><div class="cval" style="color:${isSafe?'var(--success)':'var(--danger)'}">${isSafe?years+'年超 安全':depletedYr+'年目'}</div></div>
    </div>`;
    el('drawdown-table-wrap').innerHTML=`<table>
        <thead><tr><th>経過年</th><th style="text-align:right">残高</th><th style="text-align:right">年間取崩</th><th style="text-align:right">運用損益</th></tr></thead>
        <tbody>${rows.map((r,i)=>{
            const prevVal=i===0?initAsset:rows[i-1].val;
            const gain=r.val-prevVal+r.withdraw;
            const depleted=r.val===0;
            return`<tr${depleted?' style="background:#fef2f2"':''}><td>${r.yr}年目</td><td style="text-align:right;font-weight:600">${depleted?'<span style="color:var(--danger)">枯渇</span>':fmt(r.val)}</td><td style="text-align:right;color:var(--muted)">${fmt(r.withdraw)}</td><td style="text-align:right"><span class="${gain>=0?'positive':'negative'}">${gain>=0?'+':''}${fmt(gain)}</span></td></tr>`;
        }).join('')}</tbody>
    </table>`;
    const ctx=el('drawdown-chart')?.getContext('2d');
    if(ctx)chartDrawdown=_chartRender(chartDrawdown,ctx,{type:'line',data:{labels:rows.map(r=>r.yr+'年'),datasets:[
        {label:'資産残高',data:rows.map(r=>r.val),borderColor:'#5b8fa8',backgroundColor:'rgba(91,143,168,.12)',fill:true,tension:.3,pointRadius:2},
        {label:'初期資産',data:rows.map(()=>initAsset),borderColor:'#c9915a',borderDash:[6,3],fill:false,tension:0,pointRadius:0,borderWidth:1.5},
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:11}}},scales:{y:{ticks:{callback:v=>(v/10000).toFixed(0)+'万円'},beginAtZero:true}}}});
}

function renderTaxEstimate(){
    const c=D.current;
    const accs=getAccounts();
    let taxableDivPre=0,nisaDivPre=0;
    D.holdings.forEach(h=>{
        if(!(h.dividendYield||0))return;
        const val=holdingJpy(h).value;
        const annual=val*(h.dividendYield/100);
        if(accs[h.account]?.taxFree)nisaDivPre+=annual;
        else taxableDivPre+=annual;
    });
    D.idecoHoldings.forEach(h=>{
        if(!(h.dividendYield||0))return;
        nisaDivPre+=(c.idecoValues[h.id]?.value||0)*(h.dividendYield/100);
    });
    const divTax=taxableDivPre*TAX_RATE;
    let taxableGain=0,nisaGain=0,idecoGain=0;
    D.holdings.forEach(h=>{
        const{value,principal}=holdingJpy(h);
        const gain=value-principal;
        if(gain<=0)return;
        if(accs[h.account]?.taxFree)nisaGain+=gain;
        else taxableGain+=gain;
    });
    D.idecoHoldings.forEach(h=>{
        const val=c.idecoValues[h.id]?.value||0;
        const pri=c.idecoValues[h.id]?.principal||0;
        if(val-pri>0)idecoGain+=val-pri;
    });
    const gainTax=taxableGain*TAX_RATE;
    const body=el('tax-result');if(!body)return;
    const taxableRows=D.holdings.filter(h=>!accs[h.account]?.taxFree);
    body.innerHTML=`<div class="g4 mb">
        <div class="card card-sm"><div class="clabel">配当税（特定口座）</div><div class="cval" style="color:var(--danger)">${fmt(divTax)}</div><div class="csub">税前配当 ${fmt(taxableDivPre)}</div></div>
        <div class="card card-sm"><div class="clabel">潜在税（特定口座含み益）</div><div class="cval" style="color:var(--warning)">${fmt(gainTax)}</div><div class="csub">含み益 ${fmt(taxableGain)}</div></div>
        <div class="card card-sm"><div class="clabel">NISA非課税メリット</div><div class="cval positive">${fmt((nisaDivPre*TAX_RATE)+(nisaGain*TAX_RATE))}</div><div class="csub">配当+含み益節税分</div></div>
        <div class="card card-sm"><div class="clabel">iDeCo非課税メリット</div><div class="cval positive">${fmt(idecoGain*TAX_RATE)}</div><div class="csub">含み益節税分</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px;">※ 配当税は今年の推定年間額。含み益潜在税は売却した場合の概算（20.315%）。実際の税額は確定申告等で確認してください。</div>
    ${taxableRows.length?`<div class="tbl-wrap tbl-scroll" id="tax-table"><div class="tbl-head">特定口座 銘柄別内訳</div>
    <table><thead><tr>
    <th>銘柄名 <button class="xf-btn" data-xf-table="tax-table" data-xf-col="0" onclick="xfOpen('tax-table',0,this)">▾</button></th>
    <th style="text-align:right">評価額 <button class="xf-btn" data-xf-table="tax-table" data-xf-col="1" onclick="xfOpen('tax-table',1,this)">▾</button></th>
    <th style="text-align:right">年間配当(税前) <button class="xf-btn" data-xf-table="tax-table" data-xf-col="2" onclick="xfOpen('tax-table',2,this)">▾</button></th>
    <th style="text-align:right">配当税 <button class="xf-btn" data-xf-table="tax-table" data-xf-col="3" onclick="xfOpen('tax-table',3,this)">▾</button></th>
    <th style="text-align:right">含み益 <button class="xf-btn" data-xf-table="tax-table" data-xf-col="4" onclick="xfOpen('tax-table',4,this)">▾</button></th>
    <th style="text-align:right">潜在税 <button class="xf-btn" data-xf-table="tax-table" data-xf-col="5" onclick="xfOpen('tax-table',5,this)">▾</button></th>
    </tr></thead>
    <tbody id="tax-holdings-body">${taxableRows.map(h=>{
        const{value,principal}=holdingJpy(h);
        const annual=value*(h.dividendYield||0)/100;
        const gain=value-principal;
        return`<tr><td><div class="td-name">${h.name}</div></td><td style="text-align:right">${fmt(value)}</td><td style="text-align:right">${fmt(annual)}</td><td style="text-align:right;color:var(--danger)">${fmt(annual*TAX_RATE)}</td><td style="text-align:right">${gain>0?`<span class="positive">+${fmt(gain)}</span>`:'<span style="color:var(--muted)">--</span>'}</td><td style="text-align:right;color:var(--warning)">${gain>0?fmt(gain*TAX_RATE):'--'}</td></tr>`;
    }).join('')}</tbody></table></div>`:''}`;
    if(taxableRows.length)xfBind('tax-table','tax-holdings-body',{});
}

function renderFire(){
    const{total}=calcTotals();
    const desired=parseFloat(el('fire-monthly')?.value)||0;
    const rate=parseFloat(el('fire-rate')?.value||4)/100;
    const ret=parseFloat(el('fire-return')?.value||4)/100;
    const inflation=parseFloat(el('fire-inflation')?.value||2)/100;
    const autoContrib=D.holdings.reduce((a,h)=>a+(h.monthlyAmount||0),0)+(D.settings.idecoMonthlyTotal||0);
    const contrib=parseFloat(el('fire-contrib')?.value)||autoContrib;
    const res=el('fire-result');if(!res)return;
    if(desired<=0){res.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px 0;">希望月収を入力するとシミュレーションが表示されます</div>';return;}
    const effectiveRate=rate-inflation;
    const target=effectiveRate>0?desired*12/effectiveRate:desired*12/rate;
    const nowMonthly=total*rate/12;
    const nowPct=Math.min(100,total/target*100);
    // 達成年数計算（年次複利）
    let v=total,yrs=0;
    const annualContrib=contrib*12;
    if(v>=target){yrs=0;}else{while(v<target&&yrs<100){v=v*(1+ret)+annualContrib;yrs++;}}
    const achieved=v>=target||total>=target;
    const eta=new Date();eta.setFullYear(eta.getFullYear()+yrs);
    res.innerHTML=`
        <div class="g3 mb">
            <div class="card" style="padding:14px">
                <div class="clabel">FIRE必要資産</div>
                <div class="cval">${fmt(target)}</div>
                <div style="font-size:11px;color:var(--muted)">${fmt(desired)}/月 ÷ ${(rate*100).toFixed(1)}%</div>
            </div>
            <div class="card" style="padding:14px">
                <div class="clabel">現在の取り崩し可能月額</div>
                <div class="cval ${nowMonthly>=desired?'positive':''}">${fmt(nowMonthly)}</div>
                <div style="font-size:11px;color:var(--muted)">目標の ${nowPct.toFixed(1)}%</div>
            </div>
            <div class="card" style="padding:14px">
                <div class="clabel">FIRE達成予想</div>
                <div class="cval" style="color:var(--primary)">${total>=target?'達成済み':achieved?eta.getFullYear()+'年'+( eta.getMonth()+1)+'月':'100年超'}</div>
                <div style="font-size:11px;color:var(--muted)">${total>=target?'おめでとうございます':achieved?'約'+yrs+'年後':'積立額を増やしましょう'}</div>
            </div>
        </div>
        <div class="pb" style="margin-bottom:4px"><div class="pb-fill fill-blue" style="width:${nowPct.toFixed(1)}%"></div></div>
        <div style="font-size:11px;color:var(--muted)">${fmt(total)} / ${fmt(target)}（${nowPct.toFixed(1)}%）　月次積立: ${fmt(contrib)}/月</div>`;
}

let chartReinvest=null;
let chartTrend=null;
function renderTrendChart(){
    let snaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    if(trendPeriod>0)snaps=snaps.slice(-trendPeriod);
    const ctx=el('trend-chart').getContext('2d');
    if(!snaps.length){if(chartTrend){chartTrend.destroy();chartTrend=null;}ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.fillStyle='#94a3b8';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('記録を追加すると表示されます',ctx.canvas.width/2,140);return;}
    const principalData=snaps.map(s=>{
        const invPri=Object.values(s.holdingValues||{}).reduce((a,v)=>a+(v.principal||0),0);
        const idecoPri=s.idecoActualPrincipal||Object.values(s.idecoValues||{}).reduce((a,v)=>a+(v.principal||0),0);
        return invPri+idecoPri;
    });
    const gainData=snaps.map(s=>{
        const invVal=Object.values(s.holdingValues||{}).reduce((a,v)=>a+(v.value||0),0);
        const invPri=Object.values(s.holdingValues||{}).reduce((a,v)=>a+(v.principal||0),0);
        const idecoPri=s.idecoActualPrincipal||Object.values(s.idecoValues||{}).reduce((a,v)=>a+(v.principal||0),0);
        return (invVal+(s.idecoTotal||0))-(invPri+idecoPri);
    });
    const _tooltipOrder=['現金','投資','iDeCo','投資元本','含み損益'];
    chartTrend=_chartRender(chartTrend,ctx,{type:'line',data:{labels:snaps.map(s=>s.month),datasets:[
        {label:'iDeCo',    data:snaps.map(s=>s.idecoTotal||0), borderColor:'#c9915a',backgroundColor:'rgba(201,145,90,.22)', fill:true, tension:.3,pointRadius:3,stack:'assets'},
        {label:'投資',     data:snaps.map(s=>s.investment),    borderColor:'#5b8fa8',backgroundColor:'rgba(91,143,168,.22)', fill:true, tension:.3,pointRadius:3,stack:'assets'},
        {label:'現金',     data:snaps.map(s=>s.cash),          borderColor:'#8ab4c8',backgroundColor:'rgba(138,180,200,.18)',fill:true, tension:.3,pointRadius:3,stack:'assets'},
        {label:'投資元本', data:principalData,                  borderColor:'#c9915a',borderDash:[6,3],fill:false,tension:.3,pointRadius:3,borderWidth:2},
        {label:'含み損益', data:gainData,                       borderColor:'#5fad9b',borderDash:[3,2],fill:false,tension:.3,pointRadius:3,borderWidth:2},
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:11}},tooltip:{itemSort:(a,b)=>_tooltipOrder.indexOf(a.dataset.label)-_tooltipOrder.indexOf(b.dataset.label)}},scales:{y:{stacked:true,ticks:{callback:v=>(v/10000).toFixed(0)+'万円'}}}}});
}

// ===== NISA 自動推計 =====
function autoFillNisa(){
    const now=new Date();
    const monthsElapsed=now.getMonth()+1;
    let seichou=0,tsumitate=0;
    D.holdings.forEach(h=>{
        const m=h.monthlyAmount||0;
        if(h.account==='nisa-growth')seichou+=m*monthsElapsed;
        if(h.account==='nisa-tsumitate')tsumitate+=m*monthsElapsed;
    });
    el('rec-seichou').value=seichou;
    el('rec-tsumitate').value=tsumitate;
    const prev=prevSnap();
    const prevLifetime=prev?prev.nisa?.lifetimeUsed||0:0;
    el('rec-lifetime').value=prevLifetime+(seichou+tsumitate);
    const prevSL=prev?prev.nisa?.seichouLifetimeUsed||0:0;
    el('rec-seichou-lifetime').value=prevSL+seichou;
    markUnsaved();
    toast(`${now.getFullYear()}年${monthsElapsed}月分（${monthsElapsed}ヶ月）の積立額で推計しました。スポット投資がある場合は手動で加算してください。`);
}

// ===== 記録タブ =====
let _unsaved=false;
function markUnsaved(){_unsaved=true;el('rec-unsaved').style.display='';}
function clearUnsaved(){_unsaved=false;el('rec-unsaved').style.display='none';}

function renderRecordTab(){renderBankInputs();renderCardInputs();renderPointInputs();renderHoldingInputs();renderIdecoInputs();renderHistoryTable();}

function renderBankInputs(){
    const c=D.current,prev=prevSnap();
    const grid=el('rec-banks-grid');grid.className=`g${Math.min(4,D.bankAccounts.length)}`;
    grid.innerHTML=D.bankAccounts.map(b=>{const pv=prev?.bankValues?.[b.id];const ph=pv?`前月: ${Math.round(pv).toLocaleString('ja-JP')}`:'0';return`<div class="fg"><label>${b.name}${b.note?`（${b.note}）`:''} (円)</label><input type="number" class="hi" id="rb-${b.id}" value="${c.bankValues[b.id]||''}" placeholder="${ph}" min="0" oninput="markUnsaved()"></div>`;}).join('');
}
function renderCardInputs(){
    const c=D.current,prev=prevSnap();el('rec-cards-section').style.display=D.creditCards.length>0?'':'none';
    const grid=el('rec-cards-grid');grid.className=`g${Math.min(4,D.creditCards.length)}`;
    grid.innerHTML=D.creditCards.map(cd=>{const pv=prev?.cardValues?.[cd.id];const ph=pv?`前月: ${Math.round(pv).toLocaleString('ja-JP')}`:'0';return`<div class="fg"><label>${cd.name}${cd.note?`（${cd.note}）`:''} (円)</label><input type="number" class="hi" id="rc-${cd.id}" value="${c.cardValues[cd.id]||''}" placeholder="${ph}" min="0" oninput="markUnsaved()"></div>`;}).join('');
}
function renderPointInputs(){
    const c=D.current,prev=prevSnap();
    const sec=el('rec-points-section');if(sec)sec.style.display=(D.pointAccounts||[]).length>0?'':'none';
    const grid=el('rec-points-grid');if(!grid)return;
    grid.className=`g${Math.min(4,(D.pointAccounts||[]).length||1)}`;
    grid.innerHTML=(D.pointAccounts||[]).map(p=>{const pv=prev?.pointValues?.[p.id];const ph=pv!==undefined?`前月: ${Math.round(pv).toLocaleString('ja-JP')}`:'0';return`<div class="fg"><label>${p.name}${p.note?`（${p.note}）`:''} (pt)</label><input type="number" class="hi" id="rp-${p.id}" value="${c.pointValues?.[p.id]||''}" placeholder="${ph}" min="0" oninput="markUnsaved()"></div>`;}).join('');
}

function prevSnap(){return D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month)).pop();}
function copyPrevSnap(){
    const prev=prevSnap();
    if(!prev){toast('コピー元となる前月データがありません','error');return;}
    D.bankAccounts.forEach(b=>{const e=el(`rb-${b.id}`);if(e)e.value=prev.bankValues?.[b.id]||'';});
    D.creditCards.forEach(cd=>{const e=el(`rc-${cd.id}`);if(e)e.value=prev.cardValues?.[cd.id]||'';});
    D.holdings.forEach(h=>{const hv=prev.holdingValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    D.idecoHoldings.forEach(h=>{const hv=prev.idecoValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    (D.pointAccounts||[]).forEach(p=>{const e=el('rp-'+p.id);if(e)e.value=prev.pointValues?.[p.id]||'';});
    const apiEl=el('rec-ideco-actual-pri');if(apiEl)apiEl.value=prev.idecoActualPrincipal||'';
    el('rec-seichou').value=prev.nisa?.seichouUsed||'';el('rec-tsumitate').value=prev.nisa?.tsumitateUsed||'';
    el('rec-lifetime').value=prev.nisa?.lifetimeUsed||'';el('rec-seichou-lifetime').value=prev.nisa?.seichouLifetimeUsed||'';
    const noteEl=el('rec-note');if(noteEl)noteEl.value=prev.note||'';
    markUnsaved();toast(`${prev.month} のデータをコピーしました`);
}

function holdingRow(h,hv,prevHv,showAccount){
    const cur=hv?.value||0,diff=prevHv?cur-prevHv.value:null;
    const lossBg=(cur>0&&(hv?.principal||0)>0&&cur<hv.principal)?'hi-warn':'';
    const bigMove=prevHv?.value>0&&cur>0&&Math.abs(cur-prevHv.value)/prevHv.value>=0.3;
    const warnIcon=bigMove?'<span title="前月比±30%以上の変動" style="margin-left:3px;font-size:11px;">⚠️</span>':'';
    const diffHtml=diff!==null?`<span class="${diff>=0?'positive':'negative'}">${diff>=0?'+':''}${fmt(diff)}</span>${warnIcon}`:'<span class="neutral">--</span>';
    const lossRatio=hv?.principal>0?(cur-hv.principal)/hv.principal:0;
    const lossWarn=hv?.principal>0&&lossRatio<-0.20?`<span title="含み損が元本の${Math.abs(lossRatio*100).toFixed(0)}%超" style="color:var(--danger);font-size:11px;margin-left:3px;">⚠</span>`:'';
    const accCell=showAccount?`<td>${acBadge(h.account)}</span></td>`:'';
    const unit=h.currency==='usd'?'USD':'円';
    return`<tr draggable="true" data-id="${h.id}" data-group="${showAccount?'regular':'ideco'}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)">
        <td class="drag-handle">⠿</td><td><div class="td-name">${h.name}${lossWarn}${h.currency==='usd'?'<span class="badge b-orange" style="margin-left:4px;font-size:10px;">USD</span>':''}</div></td>${accCell}
        <td>${atBadge(h.assetType)}</td>
        <td class="itd"><input class="hi ${lossBg}" type="number" id="hv-${h.id}" value="${hv?.value||''}" placeholder="0" min="0" oninput="markUnsaved()"><span style="font-size:10px;color:var(--muted);margin-left:2px;">${unit}</span></td>
        <td class="itd"><input class="hi" type="number" id="hp-${h.id}" value="${hv?.principal||''}" placeholder="0" min="0" oninput="markUnsaved()"><span style="font-size:10px;color:var(--muted);margin-left:2px;">${unit}</span></td>
        <td style="text-align:right">${diffHtml}</td></tr>`;
}
function renderHoldingInputs(){const c=D.current,prev=prevSnap();el('rec-holdings-body').innerHTML=D.holdings.length===0?'<tr><td colspan="7" class="empty">銘柄が登録されていません</td></tr>':D.holdings.map(h=>holdingRow(h,c.holdingValues[h.id],prev?.holdingValues?.[h.id],true)).join('');}
function renderIdecoInputs(){const c=D.current,prev=prevSnap();el('rec-ideco-body').innerHTML=D.idecoHoldings.length===0?'<tr><td colspan="6" class="empty">iDeCo銘柄が登録されていません</td></tr>':D.idecoHoldings.map(h=>holdingRow(h,c.idecoValues[h.id],prev?.idecoValues?.[h.id],false)).join('');const apEl=el('rec-ideco-actual-pri');if(apEl)apEl.value=c.idecoActualPrincipal||'';}

function saveSnapshot(){
    const month=el('rec-month').value;if(!month){toast('記録月を選択してください','error');return;}
    const c=D.current;
    D.bankAccounts.forEach(b=>c.bankValues[b.id]=Number(el(`rb-${b.id}`)?.value)||0);
    D.creditCards.forEach(cd=>c.cardValues[cd.id]=Number(el(`rc-${cd.id}`)?.value)||0);
    if(!c.pointValues)c.pointValues={};
    (D.pointAccounts||[]).forEach(p=>c.pointValues[p.id]=Number(el('rp-'+p.id)?.value)||0);
    D.holdings.forEach(h=>{const v=Number(el(`hv-${h.id}`)?.value)||0,p=Number(el(`hp-${h.id}`)?.value)||0;c.holdingValues[h.id]={value:v,principal:p||c.holdingValues[h.id]?.principal||0};});
    D.idecoHoldings.forEach(h=>{const v=Number(el(`hv-${h.id}`)?.value)||0,p=Number(el(`hp-${h.id}`)?.value)||0;c.idecoValues[h.id]={value:v,principal:p||c.idecoValues[h.id]?.principal||0};});
    c.idecoActualPrincipal=Number(el('rec-ideco-actual-pri')?.value)||0;
    c.nisa.seichouUsed=Number(el('rec-seichou').value)||0;c.nisa.tsumitateUsed=Number(el('rec-tsumitate').value)||0;c.nisa.lifetimeUsed=Number(el('rec-lifetime').value)||0;c.nisa.seichouLifetimeUsed=Number(el('rec-seichou-lifetime').value)||0;
    if(c.nisa.seichouUsed>2400000)toast('成長投資枠（年間）が上限 240万円を超えています','error');
    if(c.nisa.tsumitateUsed>1200000)toast('積立投資枠（年間）が上限 120万円を超えています','error');
    if(c.nisa.lifetimeUsed>18000000)toast('生涯投資枠が上限 1,800万円を超えています','error');
    const{cash,inv,ideco}=calcTotals();
    const prevSnaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    const prevSnapForModal=prevSnaps.length&&prevSnaps[prevSnaps.length-1].month!==month?prevSnaps[prevSnaps.length-1]:null;
    const snap={month,note:el('rec-note')?.value||'',bankValues:{...c.bankValues},cardValues:{...c.cardValues},pointValues:{...c.pointValues||{}},holdingValues:JSON.parse(JSON.stringify(c.holdingValues)),idecoValues:JSON.parse(JSON.stringify(c.idecoValues)),idecoActualPrincipal:c.idecoActualPrincipal,nisa:{...c.nisa},cash,investment:inv,idecoTotal:ideco,total:cash+inv+ideco};
    const idx=D.snapshots.findIndex(s=>s.month===month);
    if(idx>=0)D.snapshots[idx]=snap;else D.snapshots.push(snap);
    persist();clearUnsaved();renderDashboard();renderHistoryTable();renderHoldingInputs();renderIdecoInputs();
    showSnapSummary(month,snap,prevSnapForModal);
}

function showSnapSummary(month,snap,prev){
    const modal=el('snap-modal');if(!modal)return;
    const diff=prev?snap.total-prev.total:null;
    const invGain=snap.investment-(D.holdings.reduce((a,h)=>a+(snap.holdingValues?.[h.id]?.principal||0),0)+D.idecoHoldings.reduce((a,h)=>a+(snap.idecoValues?.[h.id]?.principal||0),0));
    const diffRow=diff!==null?`<div class="snap-row"><span>先月比</span><strong class="${diff>=0?'positive':'negative'}">${diff>=0?'+':''}${fmt(diff)}</strong></div>`:'';
    const gainRow=snap.investment>0?`<div class="snap-row"><span>投資含み損益</span><strong class="${invGain>=0?'positive':'negative'}">${invGain>=0?'+':''}${fmt(invGain)}</strong></div>`:'';
    el('snap-modal-body').innerHTML=`
        <div class="snap-row"><span>総資産</span><strong>${fmt(snap.total)}</strong></div>
        ${diffRow}
        <div class="snap-row"><span>投資資産</span><span>${fmt(snap.investment)}</span></div>
        ${gainRow}
        <div class="snap-row"><span>iDeCo</span><span>${fmt(snap.idecoTotal||0)}</span></div>
        <div class="snap-row"><span>現金・預金</span><span>${fmt(snap.cash)}</span></div>`;
    el('snap-modal-title').textContent=`${month} の記録を保存しました`;
    modal.style.display='flex';
}

let _compareBase=null;
function openSnapCompare(month){
    if(!_compareBase){_compareBase=month;toast(`${month} を比較元に設定。次に比較先の月を選んでください`,'info');renderHistoryTable();return;}
    if(_compareBase===month){_compareBase=null;renderHistoryTable();toast('比較をキャンセルしました');return;}
    const a=D.snapshots.find(s=>s.month===_compareBase);
    const b=D.snapshots.find(s=>s.month===month);
    _compareBase=null;if(!a||!b){renderHistoryTable();return;}
    const [older,newer]=a.month<b.month?[a,b]:[b,a];
    const scdH=getScdHolding();
    const diffFmt=(v,base)=>{const d=v-base;return`<span class="${d>=0?'positive':'negative'}">${d>=0?'+':''}${fmt(d)}</span>`;};
    const rows=[
        ['総資産',fmt(older.total),fmt(newer.total),diffFmt(newer.total,older.total)],
        ['投資資産',fmt(older.investment),fmt(newer.investment),diffFmt(newer.investment,older.investment)],
        ['iDeCo',fmt(older.idecoTotal||0),fmt(newer.idecoTotal||0),diffFmt(newer.idecoTotal||0,older.idecoTotal||0)],
        ['現金',fmt(older.cash),fmt(newer.cash),diffFmt(newer.cash,older.cash)],
    ];
    if(scdH){rows.push(['SCHD元本',fmt(older.holdingValues?.[scdH.id]?.principal||0),fmt(newer.holdingValues?.[scdH.id]?.principal||0),diffFmt(newer.holdingValues?.[scdH.id]?.principal||0,older.holdingValues?.[scdH.id]?.principal||0)]);}
    const modal=el('snap-compare-modal');
    el('snap-compare-title').textContent=`${older.month} → ${newer.month} 比較`;
    el('snap-compare-body').innerHTML=`<table style="width:100%;font-size:13px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:6px 4px;border-bottom:1px solid var(--border)">項目</th><th style="text-align:right;padding:6px 4px;border-bottom:1px solid var(--border)">${older.month}</th><th style="text-align:right;padding:6px 4px;border-bottom:1px solid var(--border)">${newer.month}</th><th style="text-align:right;padding:6px 4px;border-bottom:1px solid var(--border)">差分</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="padding:5px 4px">${r[0]}</td><td style="text-align:right;padding:5px 4px">${r[1]}</td><td style="text-align:right;padding:5px 4px">${r[2]}</td><td style="text-align:right;padding:5px 4px">${r[3]}</td></tr>`).join('')}</tbody></table>${older.note||newer.note?`<div style="margin-top:12px;font-size:12px;color:var(--muted)">${older.note?`${older.month}: ${older.note}`:''}${older.note&&newer.note?'<br>':''}${newer.note?`${newer.month}: ${newer.note}`:''}</div>`:''}`;
    modal.style.display='flex';
    renderHistoryTable();
}
function renderHistoryTable(){
    const snaps=D.snapshots.slice().sort((a,b)=>b.month.localeCompare(a.month));
    const scdH=getScdHolding();
    el('rec-history').innerHTML=!snaps.length?'<tr><td colspan="8" class="empty">記録がありません</td></tr>':snaps.map(s=>{const isBase=_compareBase===s.month;return`<tr${isBase?' style="background:var(--primary-light)"':''}><td>${s.month}</td><td style="text-align:right">${fmt(s.total)}</td><td style="text-align:right">${fmt(s.investment)}</td><td style="text-align:right">${fmt(s.idecoTotal||0)}</td><td style="text-align:right">${fmt(s.cash)}</td><td style="text-align:right">${fmt(scdH?s.holdingValues?.[scdH.id]?.principal||0:0)}</td><td style="max-width:120px;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.note||''}</td><td><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="openSnapCompare('${s.month}')">${isBase?'比較中...':'比較'}</button><button class="btn btn-s btn-sm" onclick="loadSnap('${s.month}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteSnap('${s.month}')">削除</button></div></td></tr>`;}).join('');
    renderHistorySelect();
}

function deleteSnap(month){customConfirm(month+' の記録を削除しますか？',()=>{D.snapshots=D.snapshots.filter(s=>s.month!==month);persist();renderDashboard();renderHistoryTable();});}

function loadSnap(month){
    const s=D.snapshots.find(s=>s.month===month);if(!s)return;
    el('rec-month').value=month;
    D.bankAccounts.forEach(b=>{const e=el(`rb-${b.id}`);if(e)e.value=s.bankValues?.[b.id]||'';});
    D.creditCards.forEach(cd=>{const e=el(`rc-${cd.id}`);if(e)e.value=s.cardValues?.[cd.id]||'';});
    D.holdings.forEach(h=>{const hv=s.holdingValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    D.idecoHoldings.forEach(h=>{const hv=s.idecoValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    const apEl=el('rec-ideco-actual-pri');if(apEl)apEl.value=s.idecoActualPrincipal||'';
    (D.pointAccounts||[]).forEach(p=>{const e=el('rp-'+p.id);if(e)e.value=s.pointValues?.[p.id]||'';});
    el('rec-seichou').value=s.nisa?.seichouUsed||'';el('rec-tsumitate').value=s.nisa?.tsumitateUsed||'';el('rec-lifetime').value=s.nisa?.lifetimeUsed||'';el('rec-seichou-lifetime').value=s.nisa?.seichouLifetimeUsed||'';
    const noteEl=el('rec-note');if(noteEl)noteEl.value=s.note||'';
    switchTab('record');clearUnsaved();
}

// ===== 設定タブ =====
const _DASH_SECTIONS=[
    {id:'sec-schd',label:'SCHD ストリップ'},
    {id:'sec-nisa',label:'NISA 枠'},
    {id:'sec-portfolio',label:'ポートフォリオ'},
    {id:'sec-trend',label:'資産推移チャート'},
    {id:'sec-detail',label:'詳細分析'},
    {id:'sec-sim',label:'資産シミュレーション'},
    {id:'sec-reinvest',label:'再投資シミュレーション'},
    {id:'sec-div-cal',label:'配当カレンダー'},
    {id:'sec-div-sim',label:'配当シミュレーション'},
    {id:'sec-ideco-sim',label:'iDeCoシミュレーション'},
    {id:'sec-fire',label:'FIRE達成シミュ'},
    {id:'sec-drawdown',label:'FIRE取崩しシミュ'},
    {id:'sec-tax',label:'税金概算'},
];
function renderHiddenSectionSettings(){
    const cont=el('s-hidden-sections');if(!cont)return;
    const hidden=D.settings.hiddenSections||[];
    cont.innerHTML=_DASH_SECTIONS.map(s=>`<label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="hs-${s.id}"${hidden.includes(s.id)?' checked':''}> ${s.label}</label>`).join('');
}
function saveHiddenSections(){
    D.settings.hiddenSections=_DASH_SECTIONS.filter(s=>el('hs-'+s.id)?.checked).map(s=>s.id);
    persist();renderDashboard();
    toast('表示設定を保存しました','success');
}
function renderSettings(){
    el('s-target').value=D.settings.scdTarget||10000000;
    el('s-ideco-monthly').value=D.settings.idecoMonthlyTotal||'';
    el('s-ideco-start').value=D.settings.idecoStartMonth||'';
    const usdEl=el('s-usd-jpy');if(usdEl)usdEl.value=D.settings.usdJpy||150;
    const scdSel=el('s-scd-holding');
    if(scdSel)scdSel.innerHTML=D.holdings.map(h=>`<option value="${h.id}"${h.id===D.settings.scdHoldingId?' selected':''}>${h.name}</option>`).join('')||'<option value="">銘柄なし</option>';
    renderBanksTable();renderCardsTable();renderPointsTable();renderBrokersTable();renderAccTypesTable();renderAssetTypesTable();renderHoldingsTable();renderIdecoTable();renderCsvYearSel();renderTargetAllocInputs();renderHiddenSectionSettings();
}
function saveBasic(){
    D.settings.scdTarget=Number(el('s-target').value)||10000000;
    D.settings.idecoMonthlyTotal=Number(el('s-ideco-monthly').value)||0;
    D.settings.idecoStartMonth=el('s-ideco-start').value||'';
    const usdEl=el('s-usd-jpy');if(usdEl)D.settings.usdJpy=Number(usdEl.value)||150;
    const scdSel=el('s-scd-holding');
    if(scdSel&&scdSel.value)D.settings.scdHoldingId=scdSel.value;
    D.settings.targetAllocation={};
    Object.keys(getAssetTypes()).forEach(id=>{const v=Number(el('ta-'+id)?.value)||0;if(v>0)D.settings.targetAllocation[id]=v;});
    const _totalAlloc=Object.values(D.settings.targetAllocation).reduce((a,v)=>a+v,0);
    if(_totalAlloc>100){toast('目標配分の合計が'+_totalAlloc.toFixed(1)+'%です（100%を超えています）','error');return;}
    persist();renderDashboard();
    const btn=el('btn-save-basic');btn.textContent='✓ 保存しました';btn.classList.add('btn-saved');
    setTimeout(()=>{btn.textContent='保存';btn.classList.remove('btn-saved');},2000);
}
function renderTargetAllocInputs(){const c=el('s-target-alloc');if(!c)return;c.innerHTML=Object.entries(getAssetTypes()).map(([id,t])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="min-width:80px;font-size:13px;">${t.label}</span><input type="number" class="hi" style="width:70px;" id="ta-${id}" value="${D.settings.targetAllocation?.[id]||''}" placeholder="0" min="0" max="100"><span style="font-size:12px;color:var(--muted);">%</span></div>`).join('');}

// 銀行口座
function renderBanksTable(){el('s-banks-table').innerHTML=D.bankAccounts.length===0?'<tr><td colspan="3" class="empty">口座なし</td></tr>':D.bankAccounts.map(b=>`<tr draggable="true" data-id="${b.id}" data-group="bank" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${b.name}</div></td><td style="color:var(--muted)">${b.note||''}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editBank('${b.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteBank('${b.id}')">削除</button></div></td></tr>`).join('');}
function _panelOpen(id){el(id).classList.add('open');el('settings-backdrop').classList.add('active');}
function _panelClose(id){el(id).classList.remove('open');el('settings-backdrop').classList.remove('active');}
function openBankPanel(r=true){if(r){el('s-bank-id').value='';el('s-bank-name').value='';el('s-bank-note').value='';el('s-bank-panel-title').textContent='銀行口座を追加';}_panelOpen('s-bank-panel');}
function closeBankPanel(){_panelClose('s-bank-panel');el('s-bank-id').value='';}
function editBank(id){const b=D.bankAccounts.find(b=>b.id===id);if(!b)return;el('s-bank-id').value=b.id;el('s-bank-name').value=b.name;el('s-bank-note').value=b.note||'';el('s-bank-panel-title').textContent='銀行口座を編集';openBankPanel(false);}
function saveBank(){const name=el('s-bank-name').value.trim();if(!name){toast('口座名を入力してください','error');return;}const id=el('s-bank-id').value;if(id){const b=D.bankAccounts.find(b=>b.id===id);if(b){b.name=name;b.note=el('s-bank-note').value.trim();}}else{const nb={id:uid(),name,note:el('s-bank-note').value.trim(),order:D.bankAccounts.length};D.bankAccounts.push(nb);if(!D.current.bankValues[nb.id])D.current.bankValues[nb.id]=0;}persist();closeBankPanel();renderBanksTable();renderDashboard();renderBankInputs();}
function deleteBank(id){const b=D.bankAccounts.find(b=>b.id===id);if(!b)return;customConfirm('「'+b.name+'」を削除しますか？',()=>{D.bankAccounts=D.bankAccounts.filter(b=>b.id!==id);persist();renderBanksTable();renderDashboard();renderBankInputs();});}

// ポイント口座
function renderPointsTable(){if(!D.pointAccounts)D.pointAccounts=[];el('s-points-table').innerHTML=D.pointAccounts.length===0?'<tr><td colspan="4" class="empty">ポイント口座なし</td></tr>':D.pointAccounts.map(p=>`<tr draggable="true" data-id="${p.id}" data-group="point" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${p.name}</div></td><td style="color:var(--muted)">${p.note||''}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editPoint('${p.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deletePoint('${p.id}')">削除</button></div></td></tr>`).join('');}
function openPointPanel(r=true){if(r){el('s-point-id').value='';el('s-point-name').value='';el('s-point-note').value='';el('s-point-panel-title').textContent='ポイント口座を追加';}_panelOpen('s-point-panel');}
function closePointPanel(){_panelClose('s-point-panel');el('s-point-id').value='';}
function editPoint(id){if(!D.pointAccounts)D.pointAccounts=[];const p=D.pointAccounts.find(p=>p.id===id);if(!p)return;el('s-point-id').value=p.id;el('s-point-name').value=p.name;el('s-point-note').value=p.note||'';el('s-point-panel-title').textContent='ポイント口座を編集';openPointPanel(false);}
function savePoint(){const name=el('s-point-name').value.trim();if(!name){toast('ポイント名を入力してください','error');return;}if(!D.pointAccounts)D.pointAccounts=[];const id=el('s-point-id').value;if(id){const p=D.pointAccounts.find(p=>p.id===id);if(p){p.name=name;p.note=el('s-point-note').value.trim();}}else{const np={id:uid(),name,note:el('s-point-note').value.trim(),order:D.pointAccounts.length};D.pointAccounts.push(np);if(!D.current.pointValues)D.current.pointValues={};D.current.pointValues[np.id]=0;}persist();closePointPanel();renderPointsTable();renderDashboard();renderPointInputs();}
function deletePoint(id){if(!D.pointAccounts)return;const p=D.pointAccounts.find(p=>p.id===id);if(!p)return;customConfirm('「'+p.name+'」を削除しますか？',()=>{D.pointAccounts=D.pointAccounts.filter(p=>p.id!==id);persist();renderPointsTable();renderDashboard();renderPointInputs();});}

// 証券会社
function renderBrokersTable(){el('s-brokers-table').innerHTML=(D.brokers||[]).length===0?'<tr><td colspan="2" class="empty">証券会社なし</td></tr>':(D.brokers||[]).map(b=>`<tr draggable="true" data-id="${b.id}" data-group="broker" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${b.name}</div></td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editBroker('${b.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteBroker('${b.id}')">削除</button></div></td></tr>`).join('');}
function openBrokerPanel(r=true){if(r){el('s-broker-id').value='';el('s-broker-name').value='';el('s-broker-panel-title').textContent='証券会社を追加';}_panelOpen('s-broker-panel');}
function closeBrokerPanel(){_panelClose('s-broker-panel');el('s-broker-id').value='';}
function editBroker(id){const b=(D.brokers||[]).find(b=>b.id===id);if(!b)return;el('s-broker-id').value=b.id;el('s-broker-name').value=b.name;el('s-broker-panel-title').textContent='証券会社を編集';openBrokerPanel(false);}
function saveBroker(){const name=el('s-broker-name').value.trim();if(!name){toast('証券会社名を入力してください','error');return;}if(!D.brokers)D.brokers=[];const id=el('s-broker-id').value;if(id){const b=D.brokers.find(b=>b.id===id);if(b)b.name=name;}else{D.brokers.push({id:uid(),name,order:D.brokers.length});}persist();closeBrokerPanel();renderBrokersTable();}
function deleteBroker(id){const b=(D.brokers||[]).find(b=>b.id===id);if(!b)return;if(D.holdings.some(h=>h.brokerId===id)){toast('この証券会社を使用している銘柄があります。先に銘柄の証券会社を変更してください。','error');return;}customConfirm('「'+b.name+'」を削除しますか？',()=>{D.brokers=D.brokers.filter(b=>b.id!==id);persist();renderBrokersTable();});}

// クレジットカード
function renderCardsTable(){_buildCardBankOptions('');el('s-cards-table').innerHTML=D.creditCards.length===0?'<tr><td colspan="4" class="empty">カードなし</td></tr>':D.creditCards.map(cd=>{const bName=cd.bankId?(D.bankAccounts.find(b=>b.id===cd.bankId)?.name||''):'';return`<tr draggable="true" data-id="${cd.id}" data-group="card" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${cd.name}</div></td><td style="color:var(--muted)">${cd.note||''}</td><td style="color:var(--muted)">${bName}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editCard('${cd.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteCard('${cd.id}')">削除</button></div></td></tr>`;}).join('');}
function _buildCardBankOptions(val){const s=el('s-card-bank');if(!s)return;s.innerHTML='<option value="">未設定</option>'+D.bankAccounts.map(b=>`<option value="${b.id}">${b.name}${b.note?`（${b.note}）`:''}</option>`).join('');s.value=val||'';}
function openCardPanel(r=true){if(r){el('s-card-id').value='';el('s-card-name').value='';el('s-card-note').value='';el('s-card-panel-title').textContent='カードを追加';_buildCardBankOptions('');}_panelOpen('s-card-panel');}
function closeCardPanel(){_panelClose('s-card-panel');el('s-card-id').value='';}
function editCard(id){const cd=D.creditCards.find(cd=>cd.id===id);if(!cd)return;el('s-card-id').value=cd.id;el('s-card-name').value=cd.name;el('s-card-note').value=cd.note||'';_buildCardBankOptions(cd.bankId||'');el('s-card-panel-title').textContent='カードを編集';openCardPanel(false);}
function saveCard(){const name=el('s-card-name').value.trim();if(!name){toast('カード名を入力してください','error');return;}const id=el('s-card-id').value;const bankId=el('s-card-bank')?.value||'';if(id){const cd=D.creditCards.find(cd=>cd.id===id);if(cd){cd.name=name;cd.note=el('s-card-note').value.trim();cd.bankId=bankId;}}else{const nc={id:uid(),name,note:el('s-card-note').value.trim(),bankId,order:D.creditCards.length};D.creditCards.push(nc);if(!D.current.cardValues[nc.id])D.current.cardValues[nc.id]=0;}persist();closeCardPanel();renderCardsTable();renderCardInputs();}
function deleteCard(id){const cd=D.creditCards.find(cd=>cd.id===id);if(!cd)return;customConfirm('「'+cd.name+'」を削除しますか？',()=>{D.creditCards=D.creditCards.filter(cd=>cd.id!==id);persist();renderCardsTable();renderCardInputs();});}

// 保有銘柄
function renderHoldingsTable(){const brokerMap=Object.fromEntries((D.brokers||[]).map(b=>[b.id,b.name]));el('s-holdings-table').innerHTML=D.holdings.length===0?'<tr><td colspan="8" class="empty">銘柄なし</td></tr>':D.holdings.map(h=>{const sps=h.spotList||[],spTot=spotTotal(h),spDone=sps.filter(s=>s.done).length;const spCell=spTot>0?`${fmt(spTot)}<span style="color:var(--muted);font-size:11px;margin-left:3px;">✅${spDone}/${sps.length}</span>`:'--';const bname=h.brokerId&&brokerMap[h.brokerId]?`<span style="font-size:12px;color:var(--muted);">${brokerMap[h.brokerId]}</span>`:'<span style="color:var(--muted);font-size:11px;">--</span>';return`<tr draggable="true" data-id="${h.id}" data-group="regular" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${h.name}</div></td><td>${acBadge(h.account)}</span></td><td>${atBadge(h.assetType)}</td><td>${bname}</td><td style="text-align:right">${h.monthlyAmount>0?fmt(h.monthlyAmount)+'/月':'--'}</td><td style="text-align:right">${spCell}</td><td style="text-align:right">${h.dividendYield||0}%</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editHolding('${h.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteHolding('${h.id}')">削除</button></div></td></tr>`;}).join('');}
function addSpotRow(s){s=s||{id:uid(),amount:'',done:false};const row=document.createElement('div');row.className='spot-row';if(s.done)row.classList.add('spot-done-row');row.dataset.id=s.id;row.innerHTML=`<span class="spot-yen">¥</span><input type="number" class="spot-amount" value="${s.amount||''}" placeholder="金額" min="0"><label class="spot-check"><input type="checkbox"${s.done?' checked':''} onchange="this.closest('.spot-row').classList.toggle('spot-done-row',this.checked)"><span>済</span></label><button type="button" class="btn btn-d btn-sm spot-del" aria-label="スポットを削除" onclick="this.closest('.spot-row').remove()">×</button>`;el('s-h-spot-list').appendChild(row);}
function renderSpotListPanel(spots){const list=el('s-h-spot-list');list.innerHTML='';(spots||[]).forEach(s=>addSpotRow(s));}
function getSpotListFromPanel(){return[...el('s-h-spot-list').querySelectorAll('.spot-row')].map(row=>({id:row.dataset.id||uid(),amount:Number(row.querySelector('.spot-amount').value)||0,done:row.querySelector('input[type=checkbox]').checked})).filter(s=>s.amount>0);}
function getDivMonthsFromPanel(){return[...el('s-h-div-months').querySelectorAll('input[type=checkbox]:checked')].map(cb=>Number(cb.value));}
function setDivMonthsOnPanel(months){el('s-h-div-months').querySelectorAll('input[type=checkbox]').forEach(cb=>{cb.checked=months.includes(Number(cb.value));});}
function openHoldingPanel(r=true){if(r){el('s-holding-id').value='';el('s-h-name').value='';el('s-h-monthly').value='';el('s-h-yield').value='';renderSpotListPanel([]);el('s-holding-panel-title').textContent='銘柄を追加';buildAccountOptions('s-h-account','nisa-growth');buildAssetTypeOptions('s-h-type','fund');buildBrokerOptions('s-h-broker','');const cur=el('s-h-currency');if(cur)cur.value='jpy';setDivMonthsOnPanel([]);}_panelOpen('s-holding-panel');}
function closeHoldingPanel(){_panelClose('s-holding-panel');el('s-holding-id').value='';}
function editHolding(id){const h=D.holdings.find(h=>h.id===id);if(!h)return;el('s-holding-id').value=h.id;el('s-h-name').value=h.name;buildAccountOptions('s-h-account',h.account);buildAssetTypeOptions('s-h-type',h.assetType);buildBrokerOptions('s-h-broker',h.brokerId||'');el('s-h-monthly').value=h.monthlyAmount||'';el('s-h-yield').value=h.dividendYield||'';renderSpotListPanel(h.spotList||[]);const cur=el('s-h-currency');if(cur)cur.value=h.currency||'jpy';setDivMonthsOnPanel(h.dividendMonths||[]);el('s-holding-panel-title').textContent='銘柄を編集';openHoldingPanel(false);}
function saveHolding(){const name=el('s-h-name').value.trim();if(!name){toast('銘柄名を入力してください','error');return;}const id=el('s-holding-id').value;const currency=el('s-h-currency')?.value||'jpy';const data={name,account:el('s-h-account').value,assetType:el('s-h-type').value,brokerId:el('s-h-broker')?.value||'',monthlyAmount:Number(el('s-h-monthly').value)||0,spotList:getSpotListFromPanel(),dividendYield:parseFloat(el('s-h-yield').value)||0,currency,dividendMonths:getDivMonthsFromPanel()};if(id){const h=D.holdings.find(h=>h.id===id);if(h)Object.assign(h,data);}else{const nh={id:uid(),...data,order:D.holdings.length};D.holdings.push(nh);if(!D.current.holdingValues[nh.id])D.current.holdingValues[nh.id]={value:0,principal:0};}persist();closeHoldingPanel();renderHoldingsTable();renderHoldingInputs();renderDashboard();}
function deleteHolding(id){const h=D.holdings.find(h=>h.id===id);if(!h)return;customConfirm('「'+h.name+'」を削除しますか？',()=>{D.holdings=D.holdings.filter(h=>h.id!==id);persist();renderHoldingsTable();renderHoldingInputs();renderDashboard();});}

// iDeCo
function renderIdecoTable(){el('s-ideco-table').innerHTML=D.idecoHoldings.length===0?'<tr><td colspan="6" class="empty">銘柄なし</td></tr>':D.idecoHoldings.map(h=>`<tr draggable="true" data-id="${h.id}" data-group="ideco" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td><div class="td-name">${h.name}</div></td><td>${atBadge(h.assetType)}</td><td style="text-align:right">${h.monthlyAmount>0?h.monthlyAmount+'%':'--'}</td><td style="text-align:right">${h.dividendYield||0}%</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editIdeco('${h.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteIdeco('${h.id}')">削除</button></div></td></tr>`).join('');}
function openIdecoPanel(r=true){if(r){el('s-ideco-id').value='';el('s-i-name').value='';el('s-i-monthly').value='';el('s-i-yield').value='';el('s-ideco-panel-title').textContent='iDeCo銘柄を追加';buildAssetTypeOptions('s-i-type','fund');}_panelOpen('s-ideco-panel');}
function closeIdecoPanel(){_panelClose('s-ideco-panel');el('s-ideco-id').value='';}
function editIdeco(id){const h=D.idecoHoldings.find(h=>h.id===id);if(!h)return;el('s-ideco-id').value=h.id;el('s-i-name').value=h.name;buildAssetTypeOptions('s-i-type',h.assetType);el('s-i-monthly').value=h.monthlyAmount||'';el('s-i-yield').value=h.dividendYield||'';el('s-ideco-panel-title').textContent='iDeCo銘柄を編集';openIdecoPanel(false);}
function saveIdeco(){const name=el('s-i-name').value.trim();if(!name){toast('銘柄名を入力してください','error');return;}const id=el('s-ideco-id').value;const data={name,assetType:el('s-i-type').value,monthlyAmount:Number(el('s-i-monthly').value)||0,dividendYield:parseFloat(el('s-i-yield').value)||0};if(id){const h=D.idecoHoldings.find(h=>h.id===id);if(h)Object.assign(h,data);}else{const nh={id:uid(),...data,order:D.idecoHoldings.length};D.idecoHoldings.push(nh);if(!D.current.idecoValues[nh.id])D.current.idecoValues[nh.id]={value:0,principal:0};}persist();closeIdecoPanel();renderIdecoTable();renderIdecoInputs();renderDashboard();}
function deleteIdeco(id){const h=D.idecoHoldings.find(h=>h.id===id);if(!h)return;customConfirm('「'+h.name+'」を削除しますか？',()=>{D.idecoHoldings=D.idecoHoldings.filter(h=>h.id!==id);persist();renderIdecoTable();renderIdecoInputs();renderDashboard();});}

// 口座種別
function renderAccTypesTable(){
    const accs=getAccounts();
    const order=D.accountTypeOrder||[...Object.keys(BUILT_IN_ACCOUNTS),...(D.customAccounts||[]).map(a=>a.id)];
    const byId={...Object.fromEntries(Object.keys(BUILT_IN_ACCOUNTS).map(id=>[id,{id,...accs[id],builtIn:true}])),...Object.fromEntries((D.customAccounts||[]).map(a=>[a.id,{...a,builtIn:false}]))};
    const all=order.map(id=>byId[id]).filter(Boolean);
    el('s-acctypes-table').innerHTML=all.map(a=>{
        const drag='draggable="true" data-id="'+a.id+'" data-group="acctype" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"';
        const taxBadge=a.taxFree?'<span class="badge b-green" style="font-size:10px;">非課税</span>':'';
        return`<tr ${drag}><td class="drag-handle">⠿</td><td><span class="dot" style="background:${a.color}"></span>${a.label} ${taxBadge}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editAccType('${a.id}',${a.builtIn})">編集</button>${a.builtIn?'':'<button class="btn btn-d btn-sm" onclick="deleteAccType(\''+a.id+'\')">削除</button>'}</div></td></tr>`;
    }).join('');
}
function randomAccColor(){const sel=el('s-acctype-color');const opts=[...sel.options];const usedColors=new Set(Object.values(getAccounts()).map(a=>a.color));const curId=el('s-acctype-id').value;if(curId){const cur=getAccounts()[curId];if(cur)usedColors.delete(cur.color);}const pool=opts.filter(o=>!usedColors.has(o.value.split('|')[0]));sel.value=(pool.length?pool:opts)[Math.floor(Math.random()*((pool.length?pool:opts).length))].value;}
function openAccTypePanel(r=true){if(r){el('s-acctype-id').value='';el('s-acctype-name').value='';el('s-acctype-color').value='#5b8fa8|b-blue';el('s-acctype-taxfree').checked=false;el('s-acctype-panel-title').textContent='口座種別を追加';}_panelOpen('s-acctype-panel');}
function closeAccTypePanel(){_panelClose('s-acctype-panel');}
function editAccType(id,builtIn=false){
    const accs=getAccounts();const a=accs[id];if(!a)return;
    el('s-acctype-id').value=id;el('s-acctype-builtin').value=builtIn?'1':'';
    el('s-acctype-name').value=a.label;el('s-acctype-color').value=`${a.color}|${a.badge}`;
    el('s-acctype-taxfree').checked=!!a.taxFree;
    el('s-acctype-panel-title').textContent='口座種別を編集';openAccTypePanel(false);
}
function saveAccType(){const name=el('s-acctype-name').value.trim();if(!name){toast('種別名を入力してください','error');return;}const[color,badge]=el('s-acctype-color').value.split('|');const taxFree=el('s-acctype-taxfree').checked;if(!D.customAccounts)D.customAccounts=[];const id=el('s-acctype-id').value;const isBuiltIn=el('s-acctype-builtin').value==='1';if(isBuiltIn){if(!D.accountTypeOverrides)D.accountTypeOverrides={};D.accountTypeOverrides[id]={label:name,color,badge,taxFree};}else if(id){const a=D.customAccounts.find(a=>a.id===id);if(a){a.label=name;a.color=color;a.badge=badge;a.taxFree=taxFree;}}else{const newId=uid();D.customAccounts.push({id:newId,label:name,color,badge,taxFree});if(!D.accountTypeOrder)D.accountTypeOrder=[...Object.keys(BUILT_IN_ACCOUNTS),...D.customAccounts.map(a=>a.id)];else D.accountTypeOrder.push(newId);}persist();closeAccTypePanel();renderAccTypesTable();}
function deleteAccType(id){const a=(D.customAccounts||[]).find(a=>a.id===id);if(!a)return;if(D.holdings.some(h=>h.account===id)){toast('この口座種別を使用している銘柄があります。先に銘柄の口座を変更してください。','error');return;}customConfirm('「'+a.label+'」を削除しますか？',()=>{D.customAccounts=D.customAccounts.filter(a=>a.id!==id);D.accountTypeOrder=(D.accountTypeOrder||[]).filter(oid=>oid!==id);persist();renderAccTypesTable();});}

// 銘柄種別
function renderAssetTypesTable(){
    const types=getAssetTypes();
    const order=D.assetTypeOrder||[...Object.keys(BUILT_IN_ASSET_TYPES),...(D.customAssetTypes||[]).map(t=>t.id)];
    const byId={...Object.fromEntries(Object.keys(BUILT_IN_ASSET_TYPES).map(id=>[id,{id,...types[id],builtIn:true}])),...Object.fromEntries((D.customAssetTypes||[]).map(t=>[t.id,{...t,...types[t.id],builtIn:false}]))};
    const all=order.map(id=>byId[id]).filter(Boolean);
    el('s-assettypes-table').innerHTML=all.map(t=>{
        const drag='draggable="true" data-id="'+t.id+'" data-group="assettype" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"';
        return`<tr ${drag}><td class="drag-handle">⠿</td><td><span class="dot" style="background:${t.color||'#9ca3af'}"></span>${t.label}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editAssetType('${t.id}',${t.builtIn})">編集</button>${t.builtIn?'':'<button class="btn btn-d btn-sm" onclick="deleteAssetType(\''+t.id+'\')">削除</button>'}</div></td></tr>`;
    }).join('');
}
function randomAssetColor(){const sel=el('s-assettype-color');const opts=[...sel.options];const usedColors=new Set(Object.values(getAssetTypes()).map(t=>t.color));const curId=el('s-assettype-id').value;if(curId){const cur=getAssetTypes()[curId];if(cur)usedColors.delete(cur.color);}const pool=opts.filter(o=>!usedColors.has(o.value.split('|')[0]));sel.value=(pool.length?pool:opts)[Math.floor(Math.random()*((pool.length?pool:opts).length))].value;}
function openAssetTypePanel(r=true){if(r){el('s-assettype-id').value='';el('s-assettype-name').value='';el('s-assettype-color').value='#5b8fa8|b-blue';el('s-assettype-builtin').value='';el('s-assettype-panel-title').textContent='銘柄種別を追加';}_panelOpen('s-assettype-panel');}
function closeAssetTypePanel(){_panelClose('s-assettype-panel');}
function editAssetType(id,builtIn=false){const types=getAssetTypes();const t=types[id];if(!t)return;el('s-assettype-id').value=id;el('s-assettype-builtin').value=builtIn?'1':'';el('s-assettype-name').value=t.label;const colorSel=el('s-assettype-color');if(colorSel)colorSel.value=`${t.color||'#5b8fa8'}|${t.badge||'b-blue'}`;el('s-assettype-panel-title').textContent='銘柄種別を編集';openAssetTypePanel(false);}
function saveAssetType(){const name=el('s-assettype-name').value.trim();if(!name){toast('種別名を入力してください','error');return;}const colorSel=el('s-assettype-color');const[color,badge]=colorSel?colorSel.value.split('|'):['#5b8fa8','b-blue'];if(!D.customAssetTypes)D.customAssetTypes=[];const id=el('s-assettype-id').value;const isBuiltIn=el('s-assettype-builtin').value==='1';if(isBuiltIn){if(!D.assetTypeOverrides)D.assetTypeOverrides={};D.assetTypeOverrides[id]={label:name,color,badge};}else if(id){const t=D.customAssetTypes.find(t=>t.id===id);if(t){t.label=name;t.color=color;t.badge=badge;}}else{const newId=uid();D.customAssetTypes.push({id:newId,label:name,badge,color});if(!D.assetTypeOrder)D.assetTypeOrder=[...Object.keys(BUILT_IN_ASSET_TYPES),...D.customAssetTypes.map(t=>t.id)];else D.assetTypeOrder.push(newId);}persist();closeAssetTypePanel();renderAssetTypesTable();}
function deleteAssetType(id){const t=(D.customAssetTypes||[]).find(t=>t.id===id);if(!t)return;if([...D.holdings,...D.idecoHoldings].some(h=>h.assetType===id)){toast('この銘柄種別を使用している銘柄があります。先に銘柄の種別を変更してください。','error');return;}customConfirm('「'+t.label+'」を削除しますか？',()=>{D.customAssetTypes=D.customAssetTypes.filter(t=>t.id!==id);D.assetTypeOrder=(D.assetTypeOrder||[]).filter(oid=>oid!==id);persist();renderAssetTypesTable();});}

// ===== ドラッグ&ドロップ =====
let dragId=null,dragGroup=null;
function dragStart(e){dragId=e.currentTarget.dataset.id;dragGroup=e.currentTarget.dataset.group;e.dataTransfer.effectAllowed='move';e.currentTarget.classList.add('dragging');}
function dragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function dragEnd(e){e.currentTarget.classList.remove('dragging');}
function drop(e){e.preventDefault();e.currentTarget.classList.remove('drag-over');const tid=e.currentTarget.dataset.id,tg=e.currentTarget.dataset.group;if(!dragId||dragId===tid||dragGroup!==tg)return;if(dragGroup==='acctype'){if(!D.accountTypeOrder)D.accountTypeOrder=[...Object.keys(BUILT_IN_ACCOUNTS),...(D.customAccounts||[]).map(a=>a.id)];const si=D.accountTypeOrder.indexOf(dragId),ti=D.accountTypeOrder.indexOf(tid);if(si===-1||ti===-1){dragId=null;dragGroup=null;return;}const[item]=D.accountTypeOrder.splice(si,1);D.accountTypeOrder.splice(ti,0,item);persist();renderAccTypesTable();dragId=null;dragGroup=null;return;}if(dragGroup==='assettype'){if(!D.assetTypeOrder)D.assetTypeOrder=[...Object.keys(BUILT_IN_ASSET_TYPES),...(D.customAssetTypes||[]).map(t=>t.id)];const si=D.assetTypeOrder.indexOf(dragId),ti=D.assetTypeOrder.indexOf(tid);if(si===-1||ti===-1){dragId=null;dragGroup=null;return;}const[item]=D.assetTypeOrder.splice(si,1);D.assetTypeOrder.splice(ti,0,item);persist();renderAssetTypesTable();dragId=null;dragGroup=null;return;}const arr=dragGroup==='ideco'?D.idecoHoldings:dragGroup==='bank'?D.bankAccounts:dragGroup==='card'?D.creditCards:dragGroup==='broker'?(D.brokers||[]):dragGroup==='point'?(D.pointAccounts||[]):D.holdings;const si=arr.findIndex(h=>h.id===dragId),ti=arr.findIndex(h=>h.id===tid);if(si===-1||ti===-1)return;const[item]=arr.splice(si,1);arr.splice(ti,0,item);persist();if(dragGroup==='ideco'){renderIdecoTable();renderIdecoInputs();}else if(dragGroup==='bank'){renderBanksTable();renderBankInputs();}else if(dragGroup==='card'){renderCardsTable();renderCardInputs();}else if(dragGroup==='broker'){renderBrokersTable();}else if(dragGroup==='assettype'){renderAssetTypesTable();}else if(dragGroup==='point'){renderPointsTable();renderPointInputs();}else{renderHoldingsTable();renderHoldingInputs();}dragId=null;dragGroup=null;}

// ===== データ管理 =====
const today=()=>new Date().toISOString().slice(0,10);

// 全体バックアップ
function _flashBtn(id){const b=el(id);if(!b)return;const t=b.textContent;b.textContent='✓ 完了';b.classList.add('btn-saved');setTimeout(()=>{b.textContent=t;b.classList.remove('btn-saved');},2000);}
async function _triggerExport(blob,filename,btnId){
    // iOS Safari はa.download非対応 → Web Share API（ファイル共有）を優先使用
    const file=new File([blob],filename,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
        try{await navigator.share({files:[file]});if(btnId)_flashBtn(btnId);return;}catch(e){if(e.name==='AbortError')return;}
    }
    // デスクトップ / フォールバック
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
    if(btnId)_flashBtn(btnId);
}
function exportAll(){const b=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});_triggerExport(b,`asset-backup-${today()}.json`,'btn-export-all');}
function importAll(e){const f=(e.target||e.currentTarget).files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const parsed=JSON.parse(ev.target.result);if(!parsed||!parsed.settings||!Array.isArray(parsed.holdings)){toast('ファイルの形式が正しくありません（必須フィールドが見つかりません）','error');return;}D=parsed;persist();renderSettings();renderDashboard();renderRecordTab();toast('インポート完了しました','success');}catch{toast('ファイルの形式が正しくありません','error');}};r.onerror=()=>toast('ファイルの読み込みに失敗しました','error');r.readAsText(f);}

// 設定のみ（記録は保持）
function exportSettings(){
    const s={settings:D.settings,bankAccounts:D.bankAccounts,creditCards:D.creditCards,holdings:D.holdings,idecoHoldings:D.idecoHoldings,customAccounts:D.customAccounts||[],customAssetTypes:D.customAssetTypes||[],accountTypeOverrides:D.accountTypeOverrides||{},assetTypeOverrides:D.assetTypeOverrides||{},current:D.current};
    const b=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});_triggerExport(b,`asset-settings-${today()}.json`,'btn-export-settings');
}
function importSettings(e){const f=(e.target||e.currentTarget).files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const s=JSON.parse(ev.target.result);D={...s,snapshots:D.snapshots};persist();renderSettings();renderDashboard();renderRecordTab();toast('設定をインポートしました（記録は変更されていません）','success');}catch{toast('ファイルの形式が正しくありません','error');}};r.onerror=()=>toast('ファイルの読み込みに失敗しました','error');r.readAsText(f);}

// 楽天証券CSV インポート
const _RAKUTEN_ACC_MAP={'特定':'specific','一般':'specific','旧NISA':'old-nisa','つみたてNISA':'old-nisa','NISA成長投資枠':'nisa-growth','NISAつみたて投資枠':'nisa-tsumitate'};
const _RAKUTEN_TYPE_MAP={'国内株式':'domestic-stock','米国株式':'us-stock','投資信託':'fund','中国株式':'other','アセアン株式':'other','外国株式':'other'};
function _parseCsvLine(line){const cols=[];let i=0;while(i<line.length){if(line[i]==='"'){i++;let val='';while(i<line.length){if(line[i]==='"'){if(line[i+1]==='"'){val+='"';i+=2;}else{i++;break;}}else{val+=line[i++];}}if(i<line.length&&line[i]===',')i++;cols.push(val);}else{let j=line.indexOf(',',i);if(j===-1)j=line.length;cols.push(line.slice(i,j));i=j+1;}}return cols;}
function _parseJpNum(s){return Number((s||'').replace(/[¥,+\s]/g,''))||0;}
function _parseRakutenRows(text){const lines=text.split(/\r?\n/);const di=lines.findIndex(l=>l.includes('保有商品詳細'));if(di===-1)throw new Error('保有商品詳細セクションが見つかりません');let hi=-1;for(let i=di;i<Math.min(di+10,lines.length);i++){const c=_parseCsvLine(lines[i]);if(c[0]==='種別'){hi=i;break;}}if(hi===-1)throw new Error('ヘッダー行が見つかりません');const rows=[];for(let i=hi+1;i<lines.length;i++){const line=lines[i].trim();if(!line)break;const c=_parseCsvLine(line);const cat=c[0];if(!cat||!_RAKUTEN_TYPE_MAP[cat])continue;const value=_parseJpNum(c[14]);if(!value)continue;const gain=_parseJpNum(c[16]);rows.push({cat,name:c[2],accountStr:c[3],account:_RAKUTEN_ACC_MAP[c[3]]||'specific',assetType:_RAKUTEN_TYPE_MAP[cat],value,principal:value-gain});}let usdJpy=null;const fi=lines.findIndex(l=>l.includes('参考為替レート'));if(fi!==-1){for(let i=fi+1;i<Math.min(fi+15,lines.length);i++){const c=_parseCsvLine(lines[i]);if(c[0]==='米ドル'){usdJpy=parseFloat(c[1])||null;break;}}}return{rows,usdJpy};}
function _applyRakutenRows({rows,usdJpy}){if(!rows.length){toast('保有商品が見つかりませんでした','error');return;}const rakutenBroker=(D.brokers||[]).find(b=>b.name==='楽天証券');const rakutenBrokerId=rakutenBroker?.id||'';const matched=[],toAdd=[];rows.forEach(row=>{const h=D.holdings.find(h=>{if(h.account!==row.account)return false;return h.name===row.name||row.name.includes(h.name)||h.name.includes(row.name);});if(h)matched.push({h,row});else toAdd.push(row);});const matchedIds=new Set(matched.map(({h})=>h.id));const toDelete=D.holdings.filter(h=>!matchedIds.has(h.id)&&(!h.brokerId||h.brokerId===rakutenBrokerId));if(!matched.length&&!toAdd.length&&!toDelete.length&&!usdJpy){toast('処理対象の銘柄がありません','error');return;}const accs=getAccounts();let msg='【楽天証券CSV インポート確認】\n\n';if(usdJpy){msg+=`💱 USD/JPY: ${D.settings.usdJpy||150} → ${usdJpy}\n\n`;}if(matched.length){msg+='✅ 更新: '+matched.length+'件\n';matched.forEach(({h,row})=>{const old=D.current.holdingValues[h.id]?.value||0;msg+=`  ${h.name}: ${fmt(old)} → ${fmt(row.value)}\n`;});}if(toAdd.length){msg+='\n➕ 新規追加: '+toAdd.length+'件\n';toAdd.forEach(row=>msg+=`  ${row.name}（${row.accountStr}）\n`);msg+='  ※ 月次積立額・利回りは後で設定できます\n';}if(toDelete.length){msg+='\n🗑️ 削除（CSVに存在しない銘柄）: '+toDelete.length+'件\n';toDelete.forEach(h=>{const v=D.current.holdingValues[h.id]?.value||0;msg+=`  ${h.name}（${accs[h.account]?.label||h.account}）: ${fmt(v)}\n`;});}msg+='\n更新・追加・削除してよろしいですか？';const _safeHtml=msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');customConfirm(_safeHtml,()=>{if(usdJpy){D.settings.usdJpy=usdJpy;const uel=el('s-usd-jpy');if(uel)uel.value=usdJpy;}matched.forEach(({h,row})=>{D.current.holdingValues[h.id]={value:row.value,principal:row.principal};});toAdd.forEach(row=>{const nh={id:uid(),name:row.name,account:row.account,assetType:row.assetType,brokerId:rakutenBrokerId,monthlyAmount:0,spotList:[],dividendYield:0,dividendMonths:[],order:D.holdings.length};D.holdings.push(nh);D.current.holdingValues[nh.id]={value:row.value,principal:row.principal};});toDelete.forEach(h=>{D.holdings=D.holdings.filter(hh=>hh.id!==h.id);delete D.current.holdingValues[h.id];});persist();if(toAdd.length||toDelete.length)renderSettings();renderDashboard();renderRecordTab();const parts=[];if(usdJpy)parts.push('USD/JPY更新');if(matched.length)parts.push(matched.length+'件更新');if(toAdd.length)parts.push(toAdd.length+'件追加');if(toDelete.length)parts.push(toDelete.length+'件削除');toast(parts.join('・')+'しました','success');},{okLabel:'更新する',okClass:'btn-p',html:true});}
function importRakuten(e){const f=e.target.files[0];if(!f)return;e.target.value='';const r=new FileReader();r.onload=ev=>{try{const buf=ev.target.result;let result=null,lastErr=null;for(const enc of['shift-jis','utf-8']){try{const text=new TextDecoder(enc).decode(buf);result=_parseRakutenRows(text);break;}catch(e){lastErr=e;}}if(!result)throw lastErr;_applyRakutenRows(result);}catch(err){toast('CSVの読み込みに失敗しました: '+err.message,'error');}};r.onerror=()=>toast('ファイルの読み込みに失敗しました','error');r.readAsArrayBuffer(f);}

// CSV エクスポート
function _csvRow(arr){return arr.map(v=>{const s=String(v??'');return(s.includes(',')||s.includes('"'))?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');}
function _exportCsv(snaps,filename){
    const scdH=getScdHolding();
    const header=['月','総資産','投資','iDeCo','現金','SCHD元本'];
    const rows=snaps.map(s=>[s.month,Math.round(s.total||0),Math.round(s.investment||0),Math.round(s.idecoTotal||0),Math.round(s.cash||0),Math.round(scdH?s.holdingValues?.[scdH.id]?.principal||0:0)]);
    const csv='﻿'+[header,...rows].map(r=>_csvRow(r)).join('\n');
    const b=new Blob([csv],{type:'text/csv;charset=utf-8'});_triggerExport(b,filename,'btn-export-csv');
}
function exportCsvSelected(){
    const val=el('csv-year-sel').value;if(!val)return;
    const snaps=(val==='all'?D.snapshots.slice():D.snapshots.filter(s=>s.month.startsWith(val))).sort((a,b)=>a.month.localeCompare(b.month));
    if(!snaps.length){toast('記録がありません','error');return;}
    _exportCsv(snaps,val==='all'?'asset-records-all.csv':`asset-records-${val}.csv`);
}
function renderCsvYearSel(){
    const sel=el('csv-year-sel');if(!sel)return;
    const years=[...new Set(D.snapshots.map(s=>s.month.slice(0,4)))].sort((a,b)=>b.localeCompare(a));
    sel.innerHTML=years.length?'<option value="all">全期間</option>'+years.map(y=>`<option value="${y}">${y}年</option>`).join(''):'<option value="">記録なし</option>';
}

// ===== クイックナビ =====
function qScroll(id){
    const target=document.getElementById(id);
    if(!target)return;
    const offset=160;
    window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-offset,behavior:'smooth'});
}

// ===== テーブルフィルター =====
function filterTable(tbodyId,query){
    const q=query.trim().toLowerCase();
    [...document.querySelectorAll(`#${tbodyId} tr`)].forEach(row=>{
        row.style.display=(!q||row.textContent.toLowerCase().includes(q))?'':'none';
    });
}

// ===== 過去月セレクト =====
function renderHistorySelect(){
    const sel=el('rec-past-select');
    if(!sel)return;
    const snaps=D.snapshots.slice().sort((a,b)=>b.month.localeCompare(a.month));
    sel.innerHTML='<option value="">過去月を編集...</option>'+snaps.map(s=>`<option value="${s.month}">${s.month}</option>`).join('');
}

// ===== Excel風テーブルフィルター =====
const XF={};

function xfBind(tableId,tbodyId,opts){
    const tbody=el(tbodyId);if(!tbody)return;
    const prev=XF[tableId]||{sortCol:null,sortDir:'asc',filters:{}};
    XF[tableId]={
        tbodyId,
        rows:[...tbody.querySelectorAll('tr')].map(tr=>({
            tr,
            cells:[...tr.querySelectorAll('td')].map(td=>({
                raw:td.dataset.raw!==undefined?td.dataset.raw:td.textContent.trim(),
                text:td.textContent.trim()
            }))
        })),
        sortCol:prev.sortCol,
        sortDir:prev.sortDir,
        filters:prev.filters,
        afterFilter:opts?.afterFilter||null,
    };
    xfApply(tableId);
    xfUpdateBtnState(tableId);
}

function xfOpen(tableId,colIdx,btn){
    xfCloseAll();
    const s=XF[tableId];if(!s)return;
    const values=[...new Set(s.rows.map(r=>r.cells[colIdx]?.text||''))].filter(v=>v).sort((a,b)=>{const an=parseFloat(a.replace(/[¥,+%]/g,''));const bn=parseFloat(b.replace(/[¥,+%]/g,''));return(!isNaN(an)&&!isNaN(bn))?an-bn:a.localeCompare(b,'ja');});
    const af=s.filters[colIdx]||null;
    const dd=document.createElement('div');
    dd.className='xf-dropdown';
    dd.innerHTML=`
        <div class="xf-sort-btns">
            <button class="${s.sortCol===colIdx&&s.sortDir==='asc'?'xf-sort-active':''}" onclick="xfSort('${tableId}',${colIdx},'asc',this)">↑ 昇順</button>
            <button class="${s.sortCol===colIdx&&s.sortDir==='desc'?'xf-sort-active':''}" onclick="xfSort('${tableId}',${colIdx},'desc',this)">↓ 降順</button>
        </div>
        <div class="xf-sep"></div>
        <div class="xf-scroll">
            <label class="xf-row"><input type="checkbox" ${!af?'checked':''} onchange="xfToggleAll('${tableId}',${colIdx},this)">（すべて選択）</label>
            ${values.map(v=>`<label class="xf-row"><input type="checkbox" value="${v.replace(/"/g,'&quot;')}" ${!af||af.has(v)?'checked':''} onchange="xfApplyFilter('${tableId}',${colIdx},this)">${v}</label>`).join('')}
        </div>
        <div class="xf-actions"><button class="btn btn-s btn-sm" onclick="xfApplyAndClose('${tableId}')">閉じる</button></div>`;
    const rect=btn.getBoundingClientRect();
    dd.style.position='fixed';
    dd.style.top=(rect.bottom+2)+'px';
    dd.style.left=Math.min(rect.left,window.innerWidth-230)+'px';
    document.body.appendChild(dd);
    btn._xfOpen=true;
    setTimeout(()=>document.addEventListener('click',_xfOutside,{once:true}),0);
}

function _xfOutside(e){
    if(!e.target.closest('.xf-dropdown')&&!e.target.closest('.xf-btn'))xfCloseAll();
    else setTimeout(()=>document.addEventListener('click',_xfOutside,{once:true}),0);
}

function xfCloseAll(){
    document.querySelectorAll('.xf-dropdown').forEach(d=>d.remove());
    document.querySelectorAll('.xf-btn').forEach(b=>delete b._xfOpen);
}

function xfToggleAll(tableId,colIdx,cb){
    const dd=cb.closest('.xf-dropdown');
    dd.querySelectorAll('input[value]').forEach(c=>c.checked=cb.checked);
    if(cb.checked)delete XF[tableId].filters[colIdx];
    else XF[tableId].filters[colIdx]=new Set();
}

function xfApplyFilter(tableId,colIdx,cb){
    const dd=cb.closest('.xf-dropdown');
    const allCbs=[...dd.querySelectorAll('input[value]')];
    const checked=allCbs.filter(c=>c.checked).map(c=>c.value);
    const allCb=dd.querySelector('input:not([value])');
    if(checked.length===allCbs.length){delete XF[tableId].filters[colIdx];if(allCb)allCb.checked=true;}
    else{XF[tableId].filters[colIdx]=new Set(checked);if(allCb)allCb.checked=false;}
}

function xfSort(tableId,colIdx,dir,btn){
    const s=XF[tableId];if(!s)return;
    s.sortCol=colIdx;s.sortDir=dir;
    const dd=btn.closest('.xf-dropdown');
    if(dd)dd.querySelectorAll('.xf-sort-btns button').forEach((b,i)=>b.classList.toggle('xf-sort-active',(i===0&&dir==='asc')||(i===1&&dir==='desc')));
}

function xfApplyAndClose(tableId){xfApply(tableId);xfUpdateBtnState(tableId);xfCloseAll();}

function xfApply(tableId){
    const s=XF[tableId];if(!s)return;
    const tbody=el(s.tbodyId);if(!tbody)return;
    // フィルター
    s.rows.forEach(r=>{
        const vis=Object.entries(s.filters).every(([ci,fset])=>!fset||fset.size===0||fset.has(r.cells[ci]?.text||''));
        r.tr.style.display=vis?'':'none';
    });
    // ソート
    if(s.sortCol!==null){
        const vis=s.rows.filter(r=>r.tr.style.display!=='none');
        vis.sort((a,b)=>{
            const av=a.cells[s.sortCol]?.raw||'',bv=b.cells[s.sortCol]?.raw||'';
            const an=parseFloat(av.replace(/[¥,+%]/g,'')),bn=parseFloat(bv.replace(/[¥,+%]/g,''));
            if(!isNaN(an)&&!isNaN(bn))return s.sortDir==='asc'?an-bn:bn-an;
            return s.sortDir==='asc'?av.localeCompare(bv,'ja'):bv.localeCompare(av,'ja');
        });
        vis.forEach(r=>tbody.appendChild(r.tr));
    }
    if(s.afterFilter)s.afterFilter(s);
}

function xfUpdateBtnState(tableId){
    const s=XF[tableId];if(!s)return;
    document.querySelectorAll(`.xf-btn[data-xf-table="${tableId}"]`).forEach(btn=>{
        const colIdx=parseInt(btn.dataset.xfCol);
        const hasFilter=!!(s.filters[colIdx]&&s.filters[colIdx].size>0);
        const hasSort=s.sortCol===colIdx;
        btn.classList.toggle('xf-active',hasFilter||hasSort);
    });
}

// ===== 分析レポート =====
function showAssetReport(){
    renderAssetReport();
    const m=el('report-modal');
    if(m){m.style.display='';document.body.style.overflow='hidden';}
}
function closeAssetReport(){
    const m=el('report-modal');
    if(m){m.style.display='none';document.body.style.overflow='';}
}
function renderAssetReport(){
    const c=D.current;
    const{cash,inv,ideco,total}=calcTotals();
    const totalInv=inv+ideco;
    const accs=getAccounts();

    // KPI
    const invPri=D.holdings.reduce((a,h)=>a+holdingJpy(h).principal,0);
    const idecoPri=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.principal||0),0);
    const totalPri=invPri+idecoPri;
    const totalGain=totalPri>0?totalInv-totalPri:null;
    const totalGainRate=totalPri>0?(totalGain/totalPri*100):null;
    const cashRatio=total>0?(cash/total*100):0;
    const invRatio=total>0?(totalInv/total*100):0;

    // NISA（ダッシュボードと同じ計算式: monthlyAmount × 経過月数 + spotDone）
    const mo=new Date().getMonth()+1;
    const seichouUsed=D.holdings.filter(h=>h.account==='nisa-growth').reduce((a,h)=>a+(h.monthlyAmount||0)*mo+spotDone(h),0);
    const tsumitateUsed=D.holdings.filter(h=>h.account==='nisa-tsumitate').reduce((a,h)=>a+(h.monthlyAmount||0)*mo,0);
    const seichouMax=2400000;const tsumitateMax=1200000;
    const seichouRem=Math.max(0,seichouMax-seichouUsed);

    // 月次積立
    const monthlyInvest=D.holdings.reduce((a,h)=>a+(h.monthlyAmount||0),0)+(D.settings.idecoMonthlyTotal||0);

    // 配当
    let annualDivNisa=0,annualDivTaxable=0;
    D.holdings.forEach(h=>{const val=holdingJpy(h).value;const annual=val*(h.dividendYield||0)/100;if(accs[h.account]?.taxFree)annualDivNisa+=annual;else annualDivTaxable+=annual;});
    D.idecoHoldings.forEach(h=>{annualDivNisa+=(c.idecoValues[h.id]?.value||0)*(h.dividendYield||0)/100;});
    const annualDivNet=annualDivNisa+(annualDivTaxable*(1-TAX_RATE));
    const monthlyDivNet=annualDivNet/12;

    // 口座別内訳
    const byAcc={};
    D.holdings.forEach(h=>{byAcc[h.account]=(byAcc[h.account]||0)+holdingJpy(h).value;});
    D.idecoHoldings.forEach(h=>{byAcc['ideco']=(byAcc['ideco']||0)+(c.idecoValues[h.id]?.value||0);});

    // 銘柄別（ソート済み）
    const allH=[
        ...D.holdings.map(h=>({name:h.name,value:holdingJpy(h).value})),
        ...D.idecoHoldings.map(h=>({name:h.name,value:c.idecoValues[h.id]?.value||0})),
    ].filter(h=>h.value>0).sort((a,b)=>b.value-a.value);
    const topHolding=allH[0];
    const topRatio=totalInv>0&&topHolding?(topHolding.value/totalInv*100):0;

    // 特定口座の含み益（潜在税リスク）
    let specificGain=0;
    D.holdings.forEach(h=>{if(!accs[h.account]?.taxFree){const{value,principal}=holdingJpy(h);if(value>principal)specificGain+=value-principal;}});

    // スナップ推移（直近6件）
    const snaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    const rec=snaps.slice(-6);
    let monthlyGrowth=null;
    if(rec.length>=2){const months=rec.length-1;monthlyGrowth=(rec[rec.length-1].total-rec[0].total)/months;}

    // インサイト生成
    const insights=[];
    if(total>0){
        if(cashRatio>40)insights.push({type:'warn',msg:`現金比率が ${cashRatio.toFixed(0)}% と高めです。余剰資金のNISA・iDeCo活用を検討してください。`});
        else if(cashRatio<5)insights.push({type:'warn',msg:`現金比率が ${cashRatio.toFixed(0)}% と低めです。生活防衛資金（3〜6ヶ月分）の確保を確認してください。`});
        else insights.push({type:'good',msg:`現金比率 ${cashRatio.toFixed(0)}% はバランスが取れています。`});
    }
    if(seichouUsed===0&&total>0)insights.push({type:'warn',msg:`NISA成長投資枠（年間240万円）が今年まだ未使用です。非課税メリットを活用してください。`});
    else if(seichouRem>seichouMax*0.5&&seichouUsed>0)insights.push({type:'warn',msg:`NISA成長投資枠の ${((seichouUsed/seichouMax)*100).toFixed(0)}% を使用中。残り ${fmt(seichouRem)} があります。年内の追加投資を検討しましょう。`});
    else if(seichouUsed>0)insights.push({type:'good',msg:`NISA成長投資枠を ${((seichouUsed/seichouMax)*100).toFixed(0)}% 活用中（残 ${fmt(seichouRem)}）。`});
    if(topRatio>60&&topHolding)insights.push({type:'warn',msg:`「${topHolding.name}」が投資資産の ${topRatio.toFixed(0)}% を占めています。集中リスクに注意が必要です。`});
    else if(topRatio>40&&topHolding)insights.push({type:'info',msg:`「${topHolding.name}」が投資資産の ${topRatio.toFixed(0)}% を占めています。分散状況を定期的に確認しましょう。`});
    if(specificGain>0)insights.push({type:'info',msg:`特定口座の含み益合計: ${fmt(specificGain)} → 売却時の潜在税: 約${fmt(specificGain*TAX_RATE)}`});
    if(monthlyDivNet>=10000)insights.push({type:'good',msg:`推定月間手取り配当: ${fmt(monthlyDivNet)}（年間 ${fmt(annualDivNet)}）。配当再投資で複利効果を高めましょう。`});
    else if(annualDivNet>0)insights.push({type:'good',msg:`推定年間手取り配当: ${fmt(annualDivNet)}（月平均 ${fmt(monthlyDivNet)}）`});
    if(totalGainRate!==null&&totalGainRate>10)insights.push({type:'good',msg:`投資資産全体の含み益: +${totalGainRate.toFixed(1)}%（+${fmt(totalGain)}）と好調です。`});
    else if(totalGainRate!==null&&totalGainRate<-10)insights.push({type:'warn',msg:`投資資産全体の含み損: ${totalGainRate.toFixed(1)}%（${fmt(totalGain)}）。長期投資継続が有効です。`});
    if(monthlyGrowth!==null&&monthlyGrowth>0)insights.push({type:'good',msg:`直近${rec.length-1}ヶ月の平均月次増加額: ${fmt(monthlyGrowth)}`});

    // レポートHTML生成
    const now=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
    el('report-date').textContent=now+'時点';
    const iCls={good:'report-insight-good',warn:'report-insight-warn',info:'report-insight-info',danger:'report-insight-danger'};
    const iClr={good:'#16a34a',warn:'#ca8a04',info:'#2563eb',danger:'#dc2626'};
    const iIc={good:'✓',warn:'⚠',info:'ℹ',danger:'✕'};

    el('report-body').innerHTML=`
<div class="g4 mb" style="gap:12px;">
    <div class="card card-sm"><div class="clabel">総資産</div><div class="cval">${fmt(total)}</div></div>
    <div class="card card-sm"><div class="clabel">投資資産</div><div class="cval">${fmt(totalInv)}</div><div class="csub">総資産の ${invRatio.toFixed(1)}%</div></div>
    <div class="card card-sm"><div class="clabel">投資含み損益</div><div class="cval ${(totalGain||0)>=0?'positive':'negative'}">${totalGain!==null?((totalGain>=0?'+':'')+fmt(totalGain)):'--'}</div><div class="csub">${totalGainRate!==null?((totalGainRate>=0?'+':'')+totalGainRate.toFixed(2)+'%'):'--'}</div></div>
    <div class="card card-sm"><div class="clabel">推定月間配当（手取）</div><div class="cval">${fmt(monthlyDivNet)}</div><div class="csub">年間 ${fmt(annualDivNet)}</div></div>
</div>
<div class="g3 mb" style="gap:12px;">
    <div class="card card-sm"><div class="clabel">現金比率</div><div class="cval">${cashRatio.toFixed(1)}%</div><div class="pb" style="margin-top:6px;height:6px;"><div class="pb-fill fill-blue" style="width:${Math.min(cashRatio,100)}%"></div></div></div>
    <div class="card card-sm"><div class="clabel">NISA成長枠（今年）</div><div class="cval">${((seichouUsed/seichouMax)*100).toFixed(0)}%</div><div class="pb" style="margin-top:6px;height:6px;"><div class="pb-fill fill-orange" style="width:${Math.min(seichouUsed/seichouMax*100,100)}%"></div></div><div class="csub" style="margin-top:4px;">残 ${fmt(seichouRem)}</div></div>
    <div class="card card-sm"><div class="clabel">月次積立合計</div><div class="cval">${fmt(monthlyInvest)}</div><div class="csub">/月</div></div>
</div>
<div style="margin-bottom:18px;">
    <div class="report-section-title">口座別内訳</div>
    <div class="report-bars">${Object.entries(byAcc).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>{const label=k==='ideco'?'iDeCo':(accs[k]?.label||k);const color=k==='ideco'?IDECO_COLOR:(accs[k]?.color||'#9ca3af');const r=totalInv>0?(v/totalInv*100):0;return`<div class="report-bar-row"><div class="report-bar-label">${label}</div><div class="report-bar-track"><div class="report-bar-fill" style="width:${r.toFixed(1)}%;background:${color}"></div></div><div class="report-bar-val">${r.toFixed(1)}%<span style="color:var(--muted);margin-left:5px;font-size:11px;">${fmt(v)}</span></div></div>`;}).join('')}</div>
</div>
${allH.length?`<div style="margin-bottom:18px;"><div class="report-section-title">銘柄別比率（上位8件）</div><div class="report-bars">${allH.slice(0,8).map(h=>{const r=totalInv>0?(h.value/totalInv*100):0;return`<div class="report-bar-row"><div class="report-bar-label" title="${h.name}">${h.name.length>12?h.name.slice(0,12)+'…':h.name}</div><div class="report-bar-track"><div class="report-bar-fill" style="width:${r.toFixed(1)}%;background:#5b8fa8"></div></div><div class="report-bar-val">${r.toFixed(1)}%<span style="color:var(--muted);margin-left:5px;font-size:11px;">${fmt(h.value)}</span></div></div>`;}).join('')}</div></div>`:''}
${insights.length?`<div><div class="report-section-title">インサイト・提言</div><div style="display:flex;flex-direction:column;gap:8px;">${insights.map(i=>`<div class="report-insight ${iCls[i.type]}"><span style="color:${iClr[i.type]};font-weight:700;flex-shrink:0;line-height:1.5;">${iIc[i.type]}</span><span>${i.msg}</span></div>`).join('')}</div></div>`:''}
    `;
}

// ===== PDF 印刷 =====
function printReport(){
    const{cash,inv,ideco,total}=calcTotals();
    const hdr=el('print-header');if(!hdr)return;
    const now=new Date().toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
    hdr.innerHTML=`<div class="print-hdr-title"><span>資産形成ダッシュボード</span><span class="print-hdr-date">${now} 出力</span></div><div class="print-kpi"><div class="print-kpi-item"><div class="print-kpi-label">総資産</div><div class="print-kpi-val">${fmt(total)}</div></div><div class="print-kpi-item"><div class="print-kpi-label">投資資産</div><div class="print-kpi-val">${fmt(inv)}</div></div><div class="print-kpi-item"><div class="print-kpi-label">iDeCo</div><div class="print-kpi-val">${fmt(ideco)}</div></div><div class="print-kpi-item"><div class="print-kpi-label">現金・預金</div><div class="print-kpi-val">${fmt(cash)}</div></div></div>`;
    window.print();
}

// ===== クイックナビ スクロール連動 =====
function toggleQnavSim(e){e.stopPropagation();const dd=el('qnav-sim-dropdown');const isOpen=dd.classList.toggle('open');if(isOpen){setTimeout(()=>document.addEventListener('click',function h(ev){if(!el('qnav-sim-group')?.contains(ev.target)){dd.classList.remove('open');}document.removeEventListener('click',h);},{once:true}),0);}}
function initQnavHighlight(){
    const simIds=new Set(['sec-sim','sec-reinvest','sec-div-cal','sec-div-sim','sec-ideco-sim','sec-fire','sec-drawdown','sec-tax']);
    const ids=['sec-summary','sec-schd','sec-nisa','sec-portfolio','sec-trend','sec-detail','sec-sim','sec-reinvest','sec-div-cal','sec-div-sim','sec-ideco-sim','sec-fire','sec-drawdown','sec-tax'];
    const pills={};
    document.querySelectorAll('.qnav-pill[data-scroll]').forEach(b=>pills[b.dataset.scroll]=b);
    document.querySelectorAll('.qnav-drop-item[data-scroll]').forEach(b=>{pills[b.dataset.scroll]=b;b.addEventListener('click',()=>{el('qnav-sim-dropdown')?.classList.remove('open');qScroll(b.dataset.scroll);});});
    const update=()=>{
        let active=ids[0];
        ids.forEach(id=>{const e=document.getElementById(id);if(e&&e.getBoundingClientRect().top<=200)active=id;});
        document.querySelectorAll('.qnav-pill,.qnav-drop-item').forEach(b=>b.classList.remove('qnav-active'));
        el('qnav-sim-btn')?.classList.remove('qnav-group-active');
        if(pills[active])pills[active].classList.add('qnav-active');
        if(simIds.has(active))el('qnav-sim-btn')?.classList.add('qnav-group-active');
    };
    window.addEventListener('scroll',update,{passive:true});
    update();
}

// ===== タブ切り替え =====
const TABS=['dashboard','record','settings'];
function _doSwitchTab(name){TABS.forEach(t=>el(`tab-${t}`).classList.toggle('active',t===name));document.querySelectorAll('.main-nav button').forEach((b,i)=>b.classList.toggle('active',TABS[i]===name));const qnav=el('dash-qnav');if(qnav)qnav.style.display=name==='dashboard'?'flex':'none';if(name==='dashboard')renderDashboard();if(name==='record')renderRecordTab();if(name==='settings')renderSettings();}
function switchTab(name){
    if(name!=='record'&&_unsaved){
        customConfirm('保存されていない変更があります。このまま移動しますか？',()=>{clearUnsaved();_doSwitchTab(name);},{okLabel:'移動する',okClass:'btn-p'});
        return;
    }
    _doSwitchTab(name);
}

function switchSubTab(group,name){
    document.querySelectorAll(`[id^="${group}-"]`).forEach(e=>{if(e.classList.contains('sub-content'))e.classList.toggle('active',e.id===`${group}-${name}`);});
    const nav=group==='rec'?document.querySelector('#tab-record .sub-nav'):document.querySelector('#tab-settings .sub-nav');
    if(nav)nav.querySelectorAll('button').forEach((b,i)=>{
        const names=group==='rec'?['banks','holdings']:['holdings','accounts','basic'];
        b.classList.toggle('active',names[i]===name);
    });
}

// ===== 初期化 (B-2) =====
function initTabEvents(){
    document.querySelectorAll('.main-nav button[data-tab]').forEach(btn=>{btn.addEventListener('click',()=>switchTab(btn.dataset.tab));});
    document.querySelectorAll('.qnav-pill[data-scroll]').forEach(btn=>{btn.addEventListener('click',()=>qScroll(btn.dataset.scroll));});
    document.querySelectorAll('#rec-sub-nav button[data-subtab]').forEach(btn=>{btn.addEventListener('click',()=>{const[g,n]=btn.dataset.subtab.split('-');switchSubTab(g,n);});});
    document.querySelectorAll('#set-sub-nav button[data-subtab]').forEach(btn=>{btn.addEventListener('click',()=>{const[g,n]=btn.dataset.subtab.split('-');switchSubTab(g,n);});});
}
function initRecordEvents(){
    el('rec-month').addEventListener('change',markUnsaved);
    el('rec-past-select').addEventListener('change',function(){const val=this.value;if(!val)return;this.value='';if(_unsaved){customConfirm('保存されていない変更があります。読み込みますか？',()=>{loadSnap(val);},{okLabel:'読み込む',okClass:'btn-p'});return;}loadSnap(val);});
    el('btn-save-snapshot').addEventListener('click',saveSnapshot);
    el('btn-to-holdings').addEventListener('click',()=>{switchTab('settings');switchSubTab('set','holdings');});
    el('btn-to-ideco').addEventListener('click',()=>{switchTab('settings');switchSubTab('set','holdings');});
    el('btn-auto-nisa').addEventListener('click',autoFillNisa);
    el('btn-auto-ideco').addEventListener('click',()=>{const est=calcIdecoEstimatedPri();if(!est){toast('基本設定でiDeCo開始月と月次拠出合計を設定してください','error');return;}el('rec-ideco-actual-pri').value=est;markUnsaved();});
    ['rec-seichou','rec-tsumitate','rec-lifetime','rec-seichou-lifetime'].forEach(id=>el(id).addEventListener('input',markUnsaved));
    document.querySelectorAll('.xf-btn[data-xf-table]').forEach(btn=>{btn.addEventListener('click',()=>xfOpen(btn.dataset.xfTable,parseInt(btn.dataset.xfCol),btn));});
    el('btn-run-sim').addEventListener('click',renderSCHDReinvest);
    el('sim-holding-sel').addEventListener('change',function(){_populateReinvestFromHolding(this.value);});
    ['fire-monthly','fire-rate','fire-return','fire-contrib','fire-inflation'].forEach(id=>el(id)?.addEventListener('input',renderFire));
    el('btn-run-ideco-sim').addEventListener('click',renderIdecoSim);
    el('ideco-sim-method').addEventListener('change',renderIdecoSim);
    el('btn-run-drawdown').addEventListener('click',renderDrawdown);
}
function initSettingsEvents(){
    el('btn-open-holding').addEventListener('click',openHoldingPanel);
    el('btn-save-holding').addEventListener('click',saveHolding);
    el('btn-close-holding').addEventListener('click',closeHoldingPanel);
    el('btn-open-ideco').addEventListener('click',openIdecoPanel);
    el('btn-save-ideco').addEventListener('click',saveIdeco);
    el('btn-close-ideco').addEventListener('click',closeIdecoPanel);
    el('btn-open-broker').addEventListener('click',openBrokerPanel);
    el('btn-save-broker').addEventListener('click',saveBroker);
    el('btn-close-broker').addEventListener('click',closeBrokerPanel);
    el('btn-open-bank').addEventListener('click',openBankPanel);
    el('btn-save-bank').addEventListener('click',saveBank);
    el('btn-close-bank').addEventListener('click',closeBankPanel);
    el('btn-open-point').addEventListener('click',openPointPanel);
    el('btn-save-point').addEventListener('click',savePoint);
    el('btn-close-point').addEventListener('click',closePointPanel);
    el('btn-open-card').addEventListener('click',openCardPanel);
    el('btn-save-card').addEventListener('click',saveCard);
    el('btn-close-card').addEventListener('click',closeCardPanel);
    el('btn-open-acctype').addEventListener('click',openAccTypePanel);
    el('btn-save-acctype').addEventListener('click',saveAccType);
    el('btn-close-acctype').addEventListener('click',closeAccTypePanel);
    el('btn-open-assettype').addEventListener('click',openAssetTypePanel);
    el('btn-save-assettype').addEventListener('click',saveAssetType);
    el('btn-close-assettype').addEventListener('click',closeAssetTypePanel);
    el('btn-save-basic').addEventListener('click',saveBasic);
    el('btn-export-all').addEventListener('click',exportAll);
    el('btn-import-all-trigger').addEventListener('click',()=>el('imp-all').click());
    el('imp-all').addEventListener('change',importAll);
    el('btn-export-settings').addEventListener('click',exportSettings);
    el('btn-import-settings-trigger').addEventListener('click',()=>el('imp-settings').click());
    el('imp-settings').addEventListener('change',importSettings);
    el('btn-export-csv').addEventListener('click',exportCsvSelected);
    el('btn-import-rakuten-trigger').addEventListener('click',()=>el('imp-rakuten').click());
    el('imp-rakuten').addEventListener('change',importRakuten);
}
function init(){
    const now=new Date();
    el('rec-month').value=formatMonth(now);
    updateTodayDate();
    const vb=el('app-version-badge');if(vb)vb.textContent=APP_VERSION;
    applyTheme(localStorage.getItem('asset-theme')==='dark');
    const qnav=el('dash-qnav');if(qnav)qnav.style.display='flex';
    el('settings-backdrop').addEventListener('click',()=>{document.querySelectorAll('.add-panel.open').forEach(p=>p.classList.remove('open'));el('settings-backdrop').classList.remove('active');});
    document.addEventListener('keydown',e=>{
        if(e.ctrlKey&&e.key==='s'){e.preventDefault();saveSnapshot();return;}
        if(e.key!=='Escape')return;
        const helpM=el('help-modal');
        if(helpM&&helpM.style.display!=='none'){closeHelp();return;}
        const confirmM=el('confirm-modal');
        if(confirmM&&confirmM.style.display!=='none'){confirmM.style.display='none';return;}
        const compareM=el('snap-compare-modal');
        if(compareM&&compareM.style.display!=='none'){compareM.style.display='none';return;}
        const reportM=el('report-modal');
        if(reportM&&reportM.style.display!=='none'){closeAssetReport();return;}
        const modal=el('snap-modal');
        if(modal&&modal.style.display!=='none'){modal.style.display='none';return;}
        const open=document.querySelector('.add-panel.open');
        if(open){open.classList.remove('open');el('settings-backdrop').classList.remove('active');}
    });
    initTabEvents();
    initRecordEvents();
    initSettingsEvents();
    initQnavHighlight();
    renderDashboard();
    renderRecordTab();
    // 通知初期化
    _renderNotifStatus();
    if('Notification' in window&&Notification.permission==='granted')_registerPeriodicSync();
}
init();
