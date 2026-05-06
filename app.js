// ===== 定数 =====
const BUILT_IN_ACCOUNTS={
    'nisa-growth':    {label:'NISA成長投資',color:'#2563eb',badge:'b-blue'},
    'nisa-tsumitate': {label:'NISA積立',    color:'#7c3aed',badge:'b-purple'},
    'specific':       {label:'特定口座',     color:'#0891b2',badge:'b-teal'},
    'old-nisa':       {label:'旧NISA',       color:'#dc2626',badge:'b-red'},
};
const IDECO_COLOR='#059669';
const BUILT_IN_ASSET_TYPES={
    'fund':           {label:'投資信託',badge:'b-gray'},
    'domestic-stock': {label:'国内株式',badge:'b-green'},
    'us-stock':       {label:'米国株式',badge:'b-orange'},
    'other':          {label:'その他',  badge:'b-gray'},
};
function getAccounts(){const r={...BUILT_IN_ACCOUNTS};Object.entries(D.accountTypeOverrides||{}).forEach(([id,v])=>{if(r[id])r[id]={...r[id],...v};});(D.customAccounts||[]).forEach(a=>{r[a.id]={label:a.label,color:a.color,badge:a.badge};});return r;}
function getAssetTypes(){const r={...BUILT_IN_ASSET_TYPES};(D.customAssetTypes||[]).forEach(t=>{r[t.id]={label:t.label,badge:t.badge||'b-gray'};});return r;}

function getScdHolding(){const id=D.settings.scdHoldingId;return(id&&D.holdings.find(h=>h.id===id))||D.holdings[0];}

function makeDefault(){
    return {
        settings:{scdTarget:10000000,scdHoldingId:'h-schd'},
        bankAccounts:[
            {id:'bank-1',name:'楽天銀行',              note:'メイン',       order:0},
            {id:'bank-2',name:'あおぞら銀行 BANK支店', note:'現金バッファ', order:1},
            {id:'bank-3',name:'GMOあおぞら銀行',       note:'給与振込',     order:2},
        ],
        creditCards:[{id:'card-1',name:'楽天カード',note:'メインカード',order:0}],
        holdings:[
            {id:'h-schd',  name:'楽天SCHD',                        account:'nisa-growth',    assetType:'fund',monthlyAmount:100000,spotAnnual:1200000,dividendYield:3.5,order:0},
            {id:'h-sp500', name:'eMAXIS Slim 米国株式(S&P500)',     account:'nisa-tsumitate', assetType:'fund',monthlyAmount: 50000,spotAnnual:      0,dividendYield:0.2,order:1},
            {id:'h-orukan',name:'eMAXIS Slim 全世界株式(オルカン)',  account:'nisa-tsumitate', assetType:'fund',monthlyAmount: 50000,spotAnnual:      0,dividendYield:0.2,order:2},
        ],
        idecoHoldings:[],
        customAccounts:[],
        customAssetTypes:[],
        accountTypeOverrides:{},
        current:{
            bankValues:   {'bank-1':0,'bank-2':0,'bank-3':0},
            cardValues:   {'card-1':0},
            holdingValues:{'h-schd':{value:2687199,principal:2687199},'h-sp500':{value:0,principal:0},'h-orukan':{value:0,principal:0}},
            idecoValues:  {},
            nisa:{year:new Date().getFullYear(),seichouUsed:0,tsumitateUsed:0,lifetimeUsed:0,seichouLifetimeUsed:0},
        },
        snapshots:[],
    };
}

function load(){
    try{
        const r=localStorage.getItem('asset-v3');
        if(r){const d=JSON.parse(r);if(!d.current.nisa.seichouLifetimeUsed)d.current.nisa.seichouLifetimeUsed=d.current.nisa.lifetimeUsed||0;if(!d.settings.scdHoldingId)d.settings.scdHoldingId='h-schd';return d;}
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

function persist(){localStorage.setItem('asset-v3',JSON.stringify(D));localStorage.setItem('asset-v3-ts',new Date().toISOString());updateTs();}
let D=load();

// ===== ユーティリティ =====
const fmt=n=>'¥'+Math.round(n||0).toLocaleString('ja-JP');
const pct=(v,m)=>m>0?Math.min(100,(v/m)*100):0;
const el=id=>document.getElementById(id);
const uid=()=>'x'+Date.now()+Math.random().toString(36).slice(2,5);
function fmtMonths(months){const y=Math.floor(months/12),m=months%12;if(y===0)return`${m}ヶ月`;if(m===0)return`${y}年`;return`${y}年${m}ヶ月`;}
function updateTs(){const ts=localStorage.getItem('asset-v3-ts');if(!ts)return;const d=new Date(ts);const p=n=>String(n).padStart(2,'0');el('last-updated').textContent=`最終更新: ${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
function calcTotals(){const c=D.current;const cash=Object.values(c.bankValues).reduce((a,v)=>a+v,0);const inv=D.holdings.reduce((a,h)=>a+(c.holdingValues[h.id]?.value||0),0);const ideco=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.value||0),0);return{cash,inv,ideco,total:cash+inv+ideco};}
function acBadge(acc){const a=getAccounts()[acc];return a?`<span class="badge ${a.badge}">${a.label}`:'';}
function atBadge(type){const t=getAssetTypes()[type];return t?`<span class="badge ${t.badge}">${t.label}</span>`:'';}
function buildAccountOptions(selId,val){el(selId).innerHTML=Object.entries(getAccounts()).map(([k,v])=>`<option value="${k}"${val===k?' selected':''}>${v.label}</option>`).join('');}
function buildAssetTypeOptions(selId,val){el(selId).innerHTML=Object.entries(getAssetTypes()).map(([k,v])=>`<option value="${k}"${val===k?' selected':''}>${v.label}</option>`).join('');}
function gainHtml(val,pri,size='11px'){if(!pri)return'';const g=val-pri,r=(g/pri*100),cls=g>=0?'positive':'negative',sign=g>=0?'+':'';return`<span class="${cls}" style="font-size:${size}">${sign}${fmt(g)}</span><span style="color:var(--muted);font-size:${size};margin-left:4px;">(${sign}${r.toFixed(2)}%)</span>`;}

// ===== NISA バー =====
function renderNisaBar(prefix,used,max){const p=pct(used,max);el(`ns-${prefix}-bar`).style.width=p+'%';el(`ns-${prefix}-used`).textContent=fmt(used);el(`ns-${prefix}-pct`).textContent=p.toFixed(1)+'%';el(`ns-${prefix}-rem`).textContent=fmt(max-used);}

// ===== ダッシュボード =====
let chartPortfolio=null;

function renderDashboard(){
    const c=D.current;
    const{cash,inv,ideco,total}=calcTotals();
    const invPri=D.holdings.reduce((a,h)=>a+(c.holdingValues[h.id]?.principal||0),0);
    const idecoPri=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.principal||0),0);
    const totalPri=invPri+idecoPri;

    el('db-total').textContent=fmt(total);
    el('db-total-gain').innerHTML=gainHtml(inv+ideco,totalPri,'14px');
    const snaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    if(snaps.length>=1){const diff=total-snaps[snaps.length-1].total;const mEl=el('db-month-diff');mEl.textContent=(diff>=0?'+':'')+fmt(diff);mEl.style.color=diff>=0?'rgba(255,255,255,.95)':'#fca5a5';}

    el('db-inv').textContent=fmt(inv);
    el('db-ideco').textContent=fmt(ideco);
    el('db-cash').textContent=fmt(cash);
    el('db-inv-gain').innerHTML=gainHtml(inv,invPri);
    el('db-ideco-gain').innerHTML=gainHtml(ideco,idecoPri);

    // 現金内訳（カード内）
    el('db-bank-mini').innerHTML=D.bankAccounts.map(b=>`<div class="bank-mini-row"><span>${b.name}${b.note?` (${b.note})`:''}</span><span>${fmt(c.bankValues[b.id]||0)}</span></div>`).join('');

    // SCHD ストリップ
    const scdH=getScdHolding();
    const scdV=scdH?(c.holdingValues[scdH.id]||{}):{};
    const principal=scdV.principal||0,target=D.settings.scdTarget||10000000;
    const p=pct(principal,target);
    el('ss-val').textContent=fmt(principal);el('ss-meta').textContent=`/ ${fmt(target)}`;el('ss-pct').textContent=p.toFixed(1)+'%';el('ss-rem').textContent=`残り ${fmt(Math.max(0,target-principal))}`;el('ss-bar').style.width=p+'%';
    if(scdH){const rate=(scdH.monthlyAmount||0)+(scdH.spotAnnual||0)/12,rem=target-principal;if(rem>0&&rate>0){const months=Math.ceil(rem/rate);const eta=new Date();eta.setMonth(eta.getMonth()+months);el('ss-eta').textContent=`${eta.getFullYear()}年${eta.getMonth()+1}月（${fmtMonths(months)}）`;}else el('ss-eta').textContent=rem<=0?'達成済み':'--';}

    // NISA（principals から自動計算）
    const now=new Date();
    const mo=now.getMonth()+1; // 経過月数
    const seichouAnnual  =D.holdings.filter(h=>h.account==='nisa-growth'   ).reduce((a,h)=>a+(h.monthlyAmount||0)*mo+(h.spotAnnual||0),0);
    const tsumitateAnnual=D.holdings.filter(h=>h.account==='nisa-tsumitate').reduce((a,h)=>a+(h.monthlyAmount||0)*mo,0);
    const seichouLifetime=D.holdings.filter(h=>h.account==='nisa-growth'   ).reduce((a,h)=>a+(c.holdingValues[h.id]?.principal||0),0);
    const totalLifetime  =D.holdings.filter(h=>h.account==='nisa-growth'||h.account==='nisa-tsumitate').reduce((a,h)=>a+(c.holdingValues[h.id]?.principal||0),0);
    el('db-nisa-year').textContent=now.getFullYear();
    renderNisaBar('s', seichouAnnual,   2400000);
    renderNisaBar('t', tsumitateAnnual, 1200000);
    renderNisaBar('l', totalLifetime,   18000000);
    renderNisaBar('sl',seichouLifetime, 12000000);

    renderPortfolio(inv+ideco);
    renderAnalysisData();
    renderSCHDReinvest();
    renderDividendSim();
    renderTrendChart();
    updateTs();
}

function renderPortfolio(totalInv){
    const c=D.current;
    const items=[
        ...D.holdings.map(h=>({name:h.name,account:h.account,assetType:h.assetType,value:c.holdingValues[h.id]?.value||0,color:getAccounts()[h.account]?.color||'#9ca3af'})),
        ...D.idecoHoldings.map(h=>({name:h.name,account:'ideco',assetType:h.assetType,value:c.idecoValues[h.id]?.value||0,color:IDECO_COLOR})),
    ].filter(i=>i.value>0);
    const tbody=el('db-ptable');
    if(!items.length){tbody.innerHTML='<tr><td colspan="3" class="empty">記録タブからデータを入力してください</td></tr>';if(chartPortfolio){chartPortfolio.destroy();chartPortfolio=null;}return;}
    tbody.innerHTML=items.map(i=>{const r=totalInv>0?((i.value/totalInv)*100).toFixed(1):'0.0';const accLabel=i.account==='ideco'?'<span class="badge b-green">iDeCo</span>':acBadge(i.account)+'</span>';return`<tr><td><span class="dot" style="background:${i.color}"></span>${i.name}</td><td>${accLabel}</td><td style="text-align:right">${r}%</td></tr>`;}).join('');
    const ctx=el('portfolio-chart').getContext('2d');
    if(chartPortfolio)chartPortfolio.destroy();
    chartPortfolio=new Chart(ctx,{type:'doughnut',data:{labels:items.map(i=>i.name),datasets:[{data:items.map(i=>i.value),backgroundColor:items.map(i=>i.color),borderWidth:2,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${fmt(c.raw)}  (${((c.raw/totalInv)*100).toFixed(1)}%)`}}}}});
}

function renderAnalysisData(){
    const c=D.current;
    const scdH=getScdHolding();
    const scdV=scdH?(c.holdingValues[scdH.id]||{}):{};
    const target=D.settings.scdTarget||10000000;
    el('sim-cur').textContent=fmt(scdV.principal||0);el('sim-m').textContent=scdH?fmt(scdH.monthlyAmount)+'/月':'--';el('sim-sp').textContent=scdH?fmt(scdH.spotAnnual)+'/年':'--';
    const rem=Math.max(0,target-(scdV.principal||0));el('sim-rem').textContent=fmt(rem);
    if(scdH){const rate=(scdH.monthlyAmount||0)+(scdH.spotAnnual||0)/12;if(rem>0&&rate>0){const months=Math.ceil(rem/rate);const eta=new Date();eta.setMonth(eta.getMonth()+months);el('sim-eta').textContent=`${eta.getFullYear()}年${eta.getMonth()+1}月`;el('sim-months').textContent=fmtMonths(months);}else{el('sim-eta').textContent=rem<=0?'達成済み':'--';el('sim-months').textContent='--';}}

    const{inv,ideco}=calcTotals();const totalInv=inv+ideco;
    const allH=[
        ...D.holdings.map(h=>({...h,hv:c.holdingValues[h.id]||{},acLabel:acBadge(h.account)+'</span>',accKey:h.account,isIdeco:false})),
        ...D.idecoHoldings.map(h=>({...h,hv:c.idecoValues[h.id]||{},acLabel:'<span class="badge b-green">iDeCo</span>',accKey:'ideco',isIdeco:true})),
    ];
    const totalVal=allH.reduce((a,h)=>a+(h.hv.value||0),0);
    const totalPri=allH.reduce((a,h)=>a+(h.hv.principal||0),0);
    const totalGain=totalPri>0?totalVal-totalPri:null;
    el('an-total-val').textContent=fmt(totalVal);el('an-total-pri').textContent=fmt(totalPri);
    if(totalGain!==null){const rate=(totalGain/totalPri*100);el('an-total-gain').innerHTML=`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${fmt(totalGain)}</span>`;el('an-total-gain-r').innerHTML=`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${rate.toFixed(2)}%</span>`;}

    const byAcc={},byType={};
    allH.forEach(h=>{if(!byAcc[h.accKey])byAcc[h.accKey]={val:0,pri:0,label:h.acLabel};byAcc[h.accKey].val+=h.hv.value||0;byAcc[h.accKey].pri+=h.hv.principal||0;if(!byType[h.assetType])byType[h.assetType]={val:0,pri:0};byType[h.assetType].val+=h.hv.value||0;byType[h.assetType].pri+=h.hv.principal||0;});
    const accOrder=[...Object.keys(BUILT_IN_ACCOUNTS),'ideco'];
    function breakdownRow(label,d,totalVal,totalGain){const g=d.pri>0?d.val-d.pri:null;const gr=d.pri>0?(d.val-d.pri)/d.pri*100:null;const r=totalVal>0?((d.val/totalVal)*100).toFixed(1):'0.0';const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gr!==null?`<span class="${gr>=0?'positive':'negative'}">${gr>=0?'+':''}${gr.toFixed(2)}%</span>`:'--';return`<tr><td>${label}</td><td style="text-align:right">${fmt(d.val)}</td><td style="text-align:right">${gHtml}</td><td style="text-align:right">${grHtml}</td><td style="text-align:right">${r}%</td></tr>`;}
    const totalGainRate=totalPri>0?(totalGain/totalPri*100):null;
    const accFooter=`<tr style="border-top:2px solid var(--border);font-weight:700"><td>合計</td><td style="text-align:right">${fmt(totalVal)}</td><td style="text-align:right">${totalGain!==null?`<span class="${totalGain>=0?'positive':'negative'}">${totalGain>=0?'+':''}${fmt(totalGain)}</span>`:'--'}</td><td style="text-align:right">${totalGainRate!==null?`<span class="${totalGainRate>=0?'positive':'negative'}">${totalGainRate>=0?'+':''}${totalGainRate.toFixed(2)}%</span>`:'--'}</td><td></td></tr>`;
    el('an-by-account').innerHTML=Object.entries(byAcc).sort((a,b)=>accOrder.indexOf(a[0])-accOrder.indexOf(b[0])).filter(([,d])=>d.val>0).map(([,d])=>breakdownRow(d.label,d,totalVal,totalGain)).join('')+accFooter;
    const typeOrder=[...Object.keys(BUILT_IN_ASSET_TYPES)];
    el('an-by-type').innerHTML=Object.entries(byType).sort((a,b)=>{const ai=typeOrder.indexOf(a[0]),bi=typeOrder.indexOf(b[0]);return(ai<0?999:ai)-(bi<0?999:bi);}).filter(([,d])=>d.val>0).map(([k,d])=>breakdownRow(atBadge(k),d,totalVal,totalGain)).join('')+accFooter;
    const updateAnHoldingsFoot=(s)=>{const vis=s.rows.filter(r=>r.tr.style.display!=='none');const tot=(ci)=>vis.reduce((a,r)=>a+(parseFloat(r.cells[ci]?.raw)||0),0);const v=tot(3),p=tot(4),g=p>0?v-p:null,gr=p>0?(v-p)/p*100:null;const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gr!==null?`<span class="${gr>=0?'positive':'negative'}">${gr>=0?'+':''}${gr.toFixed(2)}%</span>`:'--';el('an-holdings-foot').innerHTML=`<tr style="border-top:2px solid var(--border);font-weight:700"><td colspan="3">合計</td><td style="text-align:right">${fmt(v)}</td><td style="text-align:right">${p>0?fmt(p):'--'}</td><td style="text-align:right">${gHtml}</td><td style="text-align:right">${grHtml}</td><td></td></tr>`;};
    el('an-holdings').innerHTML=!allH.length?'<tr><td colspan="8" class="empty">データなし</td></tr>':allH.map(h=>{const v=h.hv.value||0,p=h.hv.principal||0,g=p>0?v-p:null,gRate=p>0?(v-p)/p*100:null;const r=totalInv>0?((v/totalInv)*100).toFixed(1):'0.0';const gHtml=g!==null?`<span class="${g>=0?'positive':'negative'}">${g>=0?'+':''}${fmt(g)}</span>`:'--';const grHtml=gRate!==null?`<span class="${gRate>=0?'positive':'negative'}">${gRate>=0?'+':''}${gRate.toFixed(2)}%</span>`:'--';const accText=h.accKey==='ideco'?'iDeCo':(getAccounts()[h.accKey]?.label||h.accKey);const atText=getAssetTypes()[h.assetType]?.label||h.assetType;return`<tr><td>${h.name}</td><td data-raw="${accText}">${h.acLabel}</td><td data-raw="${atText}">${atBadge(h.assetType)}</td><td data-raw="${v}" style="text-align:right">${fmt(v)}</td><td data-raw="${p}" style="text-align:right">${p>0?fmt(p):'--'}</td><td data-raw="${g??''}" style="text-align:right">${gHtml}</td><td data-raw="${gRate??''}" style="text-align:right">${grHtml}</td><td data-raw="${r}" style="text-align:right">${r}%</td></tr>`;}).join('');
    xfBind('an-holdings','an-holdings',{afterFilter:updateAnHoldingsFoot});
}

function renderSCHDReinvest(){
    const scdH=getScdHolding();
    const scdV=scdH?(D.current.holdingValues[scdH.id]||{}):{};
    const inputVal=parseFloat(el('schd-start-val')?.value)||0;
    const startVal=inputVal>0?inputVal:(scdV.value||0);
    const y=parseFloat(el('schd-yield-sim')?.value||3.5)/100;
    const years=parseInt(el('schd-years-sel')?.value||10);
    const rows=[];let val=startVal,cumDiv=0;
    for(let yr=1;yr<=years;yr++){const div=val*y;cumDiv+=div;val+=div;rows.push({yr,val,div,cumDiv});}
    el('schd-reinvest-body').innerHTML=rows.map(r=>`<tr>
        <td>${r.yr}年目</td>
        <td style="text-align:right">${fmt(r.val)}</td>
        <td style="text-align:right;color:var(--success);font-weight:600">${fmt(r.div)}</td>
        <td style="text-align:right;color:var(--muted)">${fmt(r.div/12)}</td>
        <td style="text-align:right">${fmt(r.cumDiv)}</td>
    </tr>`).join('');
}

function renderDividendSim(){
    const c=D.current;
    // 配当利回りが設定されている銘柄のみ対象
    const allH=[
        ...D.holdings.filter(h=>(h.dividendYield||0)>0).map(h=>({...h,hv:c.holdingValues[h.id]||{},isIdeco:false})),
        ...D.idecoHoldings.filter(h=>(h.dividendYield||0)>0).map(h=>({...h,hv:c.idecoValues[h.id]||{},isIdeco:true})),
    ];
    let totalBefore=0,totalAfter=0;
    const rows=allH.map(h=>{
        const v=h.hv.value||0;
        const y=(h.dividendYield||0)/100;
        const before=v*y;
        const isNisa=h.account==='nisa-growth'||h.account==='nisa-tsumitate'||h.account==='old-nisa';
        const taxRate=isNisa||h.isIdeco?0:0.20315;
        const after=before*(1-taxRate);
        totalBefore+=before;totalAfter+=after;
        const accText=h.isIdeco?'iDeCo':(getAccounts()[h.account]?.label||h.account);
        const accLabel=h.isIdeco?'<span class="badge b-green">iDeCo</span>':acBadge(h.account)+'</span>';
        const taxText=isNisa||h.isIdeco?'非課税':'課税';
        const taxLabel=isNisa||h.isIdeco?'<span class="div-tax-free">非課税</span>':'<span class="div-tax">課税</span>';
        const yieldStr=(y*100).toFixed(2)+'%';
        return`<tr>
            <td>${h.name}</td>
            <td data-raw="${accText}">${accLabel}</td>
            <td data-raw="${taxText}">${taxLabel}</td>
            <td data-raw="${v}" style="text-align:right">${fmt(v)}</td>
            <td data-raw="${(y*100).toFixed(2)}" style="text-align:right">${yieldStr}</td>
            <td data-raw="${Math.round(before)}" style="text-align:right">${fmt(before)}</td>
            <td data-raw="${Math.round(after)}" style="text-align:right">${fmt(after)}</td>
            <td data-raw="${Math.round(after/12)}" style="text-align:right">${fmt(after/12)}</td>
        </tr>`;
    });
    el('div-sim-body').innerHTML=rows.join('');
    const updateDivSimFoot=(s)=>{
        const vis=s.rows.filter(r=>r.tr.style.display!=='none');
        const tot=(ci)=>vis.reduce((a,r)=>a+(parseFloat(r.cells[ci]?.raw)||0),0);
        const b=tot(5),a=tot(6);
        el('div-sim-foot').innerHTML=`<tr style="border-top:2px solid var(--border);font-weight:700"><td colspan="5">合計</td><td style="text-align:right">${fmt(b)}</td><td style="text-align:right">${fmt(a)}</td><td style="text-align:right">${fmt(a/12)}</td></tr>`;
    };
    xfBind('div-sim','div-sim-body',{afterFilter:updateDivSimFoot});
}

let chartTrend=null;
function renderTrendChart(){
    const snaps=D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month));
    const ctx=el('trend-chart').getContext('2d');
    if(chartTrend)chartTrend.destroy();
    if(!snaps.length){ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.fillStyle='#94a3b8';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('記録を追加すると表示されます',ctx.canvas.width/2,140);return;}
    chartTrend=new Chart(ctx,{type:'line',data:{labels:snaps.map(s=>s.month),datasets:[{label:'総資産',data:snaps.map(s=>s.total),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',fill:true,tension:.3,pointRadius:4},{label:'投資',data:snaps.map(s=>s.investment),borderColor:'#7c3aed',borderDash:[5,5],fill:false,tension:.3,pointRadius:4},{label:'iDeCo',data:snaps.map(s=>s.idecoTotal||0),borderColor:'#059669',borderDash:[3,3],fill:false,tension:.3,pointRadius:4},{label:'現金',data:snaps.map(s=>s.cash),borderColor:'#0891b2',borderDash:[2,4],fill:false,tension:.3,pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'top',labels:{font:{size:11},boxWidth:11}}},scales:{y:{ticks:{callback:v=>(v/10000).toFixed(0)+'万円'}}}}});
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
    alert(`${now.getFullYear()}年${monthsElapsed}月分（${monthsElapsed}ヶ月）の積立額で推計しました。スポット投資がある場合は手動で加算してください。`);
}

// ===== 記録タブ =====
let _unsaved=false;
function markUnsaved(){_unsaved=true;el('rec-unsaved').style.display='';}
function clearUnsaved(){_unsaved=false;el('rec-unsaved').style.display='none';}

function renderRecordTab(){renderBankInputs();renderCardInputs();renderHoldingInputs();renderIdecoInputs();renderHistoryTable();}

function renderBankInputs(){
    const c=D.current;
    const grid=el('rec-banks-grid');grid.className=`g${Math.min(4,D.bankAccounts.length)}`;
    grid.innerHTML=D.bankAccounts.map(b=>`<div class="fg"><label>${b.name}${b.note?`（${b.note}）`:''} (円)</label><input type="number" class="hi" id="rb-${b.id}" value="${c.bankValues[b.id]||''}" placeholder="0" oninput="markUnsaved()"></div>`).join('');
}
function renderCardInputs(){
    const c=D.current;el('rec-cards-section').style.display=D.creditCards.length>0?'':'none';
    const grid=el('rec-cards-grid');grid.className=`g${Math.min(4,D.creditCards.length)}`;
    grid.innerHTML=D.creditCards.map(cd=>`<div class="fg"><label>${cd.name}${cd.note?`（${cd.note}）`:''} (円)</label><input type="number" class="hi" id="rc-${cd.id}" value="${c.cardValues[cd.id]||''}" placeholder="0" oninput="markUnsaved()"></div>`).join('');
}

function prevSnap(){return D.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month)).pop();}

function holdingRow(h,hv,prevHv,showAccount){
    const cur=hv?.value||0,prev=prevHv?.value||0,diff=prevHv?cur-prev:null;
    const diffHtml=diff!==null?`<span class="${diff>=0?'positive':'negative'}">${diff>=0?'+':''}${fmt(diff)}</span>`:'<span class="neutral">--</span>';
    const accCell=showAccount?`<td>${acBadge(h.account)}</span></td>`:'';
    return`<tr draggable="true" data-id="${h.id}" data-group="${showAccount?'regular':'ideco'}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)">
        <td class="drag-handle">⠿</td><td>${h.name}</td>${accCell}
        <td>${atBadge(h.assetType)}</td>
        <td class="itd"><input class="hi" type="number" id="hv-${h.id}" value="${hv?.value||''}" placeholder="0" oninput="markUnsaved()"></td>
        <td class="itd"><input class="hi" type="number" id="hp-${h.id}" value="${hv?.principal||''}" placeholder="0" oninput="markUnsaved()"></td>
        <td style="text-align:right">${diffHtml}</td></tr>`;
}
function renderHoldingInputs(){const c=D.current,prev=prevSnap();el('rec-holdings-body').innerHTML=D.holdings.length===0?'<tr><td colspan="7" class="empty">銘柄が登録されていません</td></tr>':D.holdings.map(h=>holdingRow(h,c.holdingValues[h.id],prev?.holdingValues?.[h.id],true)).join('');}
function renderIdecoInputs(){const c=D.current,prev=prevSnap();el('rec-ideco-body').innerHTML=D.idecoHoldings.length===0?'<tr><td colspan="6" class="empty">iDeCo銘柄が登録されていません</td></tr>':D.idecoHoldings.map(h=>holdingRow(h,c.idecoValues[h.id],prev?.idecoValues?.[h.id],false)).join('');}

function saveSnapshot(){
    const month=el('rec-month').value;if(!month){alert('記録月を選択してください');return;}
    const c=D.current;
    D.bankAccounts.forEach(b=>c.bankValues[b.id]=Number(el(`rb-${b.id}`)?.value)||0);
    D.creditCards.forEach(cd=>c.cardValues[cd.id]=Number(el(`rc-${cd.id}`)?.value)||0);
    D.holdings.forEach(h=>{const v=Number(el(`hv-${h.id}`)?.value)||0,p=Number(el(`hp-${h.id}`)?.value)||0;c.holdingValues[h.id]={value:v,principal:p||c.holdingValues[h.id]?.principal||0};});
    D.idecoHoldings.forEach(h=>{const v=Number(el(`hv-${h.id}`)?.value)||0,p=Number(el(`hp-${h.id}`)?.value)||0;c.idecoValues[h.id]={value:v,principal:p||c.idecoValues[h.id]?.principal||0};});
    c.nisa.seichouUsed=Number(el('rec-seichou').value)||0;c.nisa.tsumitateUsed=Number(el('rec-tsumitate').value)||0;c.nisa.lifetimeUsed=Number(el('rec-lifetime').value)||0;c.nisa.seichouLifetimeUsed=Number(el('rec-seichou-lifetime').value)||0;
    const cash=Object.values(c.bankValues).reduce((a,v)=>a+v,0);
    const inv=D.holdings.reduce((a,h)=>a+(c.holdingValues[h.id]?.value||0),0);
    const ideco=D.idecoHoldings.reduce((a,h)=>a+(c.idecoValues[h.id]?.value||0),0);
    const snap={month,bankValues:{...c.bankValues},cardValues:{...c.cardValues},holdingValues:JSON.parse(JSON.stringify(c.holdingValues)),idecoValues:JSON.parse(JSON.stringify(c.idecoValues)),nisa:{...c.nisa},cash,investment:inv,idecoTotal:ideco,total:cash+inv+ideco};
    const idx=D.snapshots.findIndex(s=>s.month===month);
    if(idx>=0)D.snapshots[idx]=snap;else D.snapshots.push(snap);
    persist();clearUnsaved();renderDashboard();renderHistoryTable();renderHoldingInputs();renderIdecoInputs();
    alert(`${month} の記録を保存しました`);
}

function renderHistoryTable(){
    const snaps=D.snapshots.slice().sort((a,b)=>b.month.localeCompare(a.month));
    const scdH=getScdHolding();
    el('rec-history').innerHTML=!snaps.length?'<tr><td colspan="7" class="empty">記録がありません</td></tr>':snaps.map(s=>`<tr><td>${s.month}</td><td style="text-align:right">${fmt(s.total)}</td><td style="text-align:right">${fmt(s.investment)}</td><td style="text-align:right">${fmt(s.idecoTotal||0)}</td><td style="text-align:right">${fmt(s.cash)}</td><td style="text-align:right">${fmt(scdH?s.holdingValues?.[scdH.id]?.principal||0:0)}</td><td><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="loadSnap('${s.month}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteSnap('${s.month}')">削除</button></div></td></tr>`).join('');
    renderHistorySelect();
}

function deleteSnap(month){if(!confirm(`${month} の記録を削除しますか？`))return;D.snapshots=D.snapshots.filter(s=>s.month!==month);persist();renderDashboard();renderHistoryTable();}

function loadSnap(month){
    const s=D.snapshots.find(s=>s.month===month);if(!s)return;
    el('rec-month').value=month;
    D.bankAccounts.forEach(b=>{const e=el(`rb-${b.id}`);if(e)e.value=s.bankValues?.[b.id]||'';});
    D.creditCards.forEach(cd=>{const e=el(`rc-${cd.id}`);if(e)e.value=s.cardValues?.[cd.id]||'';});
    D.holdings.forEach(h=>{const hv=s.holdingValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    D.idecoHoldings.forEach(h=>{const hv=s.idecoValues?.[h.id];const ev=el(`hv-${h.id}`);if(ev)ev.value=hv?.value||'';const ep=el(`hp-${h.id}`);if(ep)ep.value=hv?.principal||'';});
    el('rec-seichou').value=s.nisa?.seichouUsed||'';el('rec-tsumitate').value=s.nisa?.tsumitateUsed||'';el('rec-lifetime').value=s.nisa?.lifetimeUsed||'';el('rec-seichou-lifetime').value=s.nisa?.seichouLifetimeUsed||'';
    switchTab('record');clearUnsaved();
}

// ===== 設定タブ =====
function renderSettings(){
    el('s-target').value=D.settings.scdTarget||10000000;
    const scdSel=el('s-scd-holding');
    if(scdSel)scdSel.innerHTML=D.holdings.map(h=>`<option value="${h.id}"${h.id===D.settings.scdHoldingId?' selected':''}>${h.name}</option>`).join('')||'<option value="">銘柄なし</option>';
    renderBanksTable();renderCardsTable();renderAccTypesTable();renderAssetTypesTable();renderHoldingsTable();renderIdecoTable();renderCsvYearSel();
}
function saveBasic(){
    D.settings.scdTarget=Number(el('s-target').value)||10000000;
    const scdSel=el('s-scd-holding');
    if(scdSel&&scdSel.value)D.settings.scdHoldingId=scdSel.value;
    persist();renderDashboard();alert('保存しました');
}

// 銀行口座
function renderBanksTable(){el('s-banks-table').innerHTML=D.bankAccounts.length===0?'<tr><td colspan="3" class="empty">口座なし</td></tr>':D.bankAccounts.map(b=>`<tr draggable="true" data-id="${b.id}" data-group="bank" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td>${b.name}</td><td style="color:var(--muted)">${b.note||''}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editBank('${b.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteBank('${b.id}')">削除</button></div></td></tr>`).join('');}
function openBankPanel(r=true){if(r){el('s-bank-id').value='';el('s-bank-name').value='';el('s-bank-note').value='';el('s-bank-panel-title').textContent='銀行口座を追加';}el('s-bank-panel').classList.add('open');}
function closeBankPanel(){el('s-bank-panel').classList.remove('open');el('s-bank-id').value='';}
function editBank(id){const b=D.bankAccounts.find(b=>b.id===id);if(!b)return;el('s-bank-id').value=b.id;el('s-bank-name').value=b.name;el('s-bank-note').value=b.note||'';el('s-bank-panel-title').textContent='銀行口座を編集';openBankPanel(false);}
function saveBank(){const name=el('s-bank-name').value.trim();if(!name){alert('口座名を入力してください');return;}const id=el('s-bank-id').value;if(id){const b=D.bankAccounts.find(b=>b.id===id);if(b){b.name=name;b.note=el('s-bank-note').value.trim();}}else{const nb={id:uid(),name,note:el('s-bank-note').value.trim(),order:D.bankAccounts.length};D.bankAccounts.push(nb);if(!D.current.bankValues[nb.id])D.current.bankValues[nb.id]=0;}persist();closeBankPanel();renderBanksTable();renderDashboard();renderBankInputs();}
function deleteBank(id){const b=D.bankAccounts.find(b=>b.id===id);if(!b)return;if(!confirm(`「${b.name}」を削除しますか？`))return;D.bankAccounts=D.bankAccounts.filter(b=>b.id!==id);persist();renderBanksTable();renderDashboard();renderBankInputs();}

// クレジットカード
function renderCardsTable(){el('s-cards-table').innerHTML=D.creditCards.length===0?'<tr><td colspan="3" class="empty">カードなし</td></tr>':D.creditCards.map(cd=>`<tr draggable="true" data-id="${cd.id}" data-group="card" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td>${cd.name}</td><td style="color:var(--muted)">${cd.note||''}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editCard('${cd.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteCard('${cd.id}')">削除</button></div></td></tr>`).join('');}
function openCardPanel(r=true){if(r){el('s-card-id').value='';el('s-card-name').value='';el('s-card-note').value='';el('s-card-panel-title').textContent='カードを追加';}el('s-card-panel').classList.add('open');}
function closeCardPanel(){el('s-card-panel').classList.remove('open');el('s-card-id').value='';}
function editCard(id){const cd=D.creditCards.find(cd=>cd.id===id);if(!cd)return;el('s-card-id').value=cd.id;el('s-card-name').value=cd.name;el('s-card-note').value=cd.note||'';el('s-card-panel-title').textContent='カードを編集';openCardPanel(false);}
function saveCard(){const name=el('s-card-name').value.trim();if(!name){alert('カード名を入力してください');return;}const id=el('s-card-id').value;if(id){const cd=D.creditCards.find(cd=>cd.id===id);if(cd){cd.name=name;cd.note=el('s-card-note').value.trim();}}else{const nc={id:uid(),name,note:el('s-card-note').value.trim(),order:D.creditCards.length};D.creditCards.push(nc);if(!D.current.cardValues[nc.id])D.current.cardValues[nc.id]=0;}persist();closeCardPanel();renderCardsTable();renderCardInputs();}
function deleteCard(id){const cd=D.creditCards.find(cd=>cd.id===id);if(!cd)return;if(!confirm(`「${cd.name}」を削除しますか？`))return;D.creditCards=D.creditCards.filter(cd=>cd.id!==id);persist();renderCardsTable();renderCardInputs();}

// 保有銘柄
function renderHoldingsTable(){el('s-holdings-table').innerHTML=D.holdings.length===0?'<tr><td colspan="7" class="empty">銘柄なし</td></tr>':D.holdings.map(h=>`<tr draggable="true" data-id="${h.id}" data-group="regular" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td>${h.name}</td><td>${acBadge(h.account)}</span></td><td>${atBadge(h.assetType)}</td><td style="text-align:right">${h.monthlyAmount>0?fmt(h.monthlyAmount)+'/月':'--'}</td><td style="text-align:right">${h.dividendYield||0}%</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editHolding('${h.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteHolding('${h.id}')">削除</button></div></td></tr>`).join('');}
function openHoldingPanel(r=true){if(r){el('s-holding-id').value='';el('s-h-name').value='';el('s-h-monthly').value='';el('s-h-spot').value='';el('s-h-yield').value='';el('s-holding-panel-title').textContent='銘柄を追加';buildAccountOptions('s-h-account','nisa-growth');buildAssetTypeOptions('s-h-type','fund');}el('s-holding-panel').classList.add('open');}
function closeHoldingPanel(){el('s-holding-panel').classList.remove('open');el('s-holding-id').value='';}
function editHolding(id){const h=D.holdings.find(h=>h.id===id);if(!h)return;el('s-holding-id').value=h.id;el('s-h-name').value=h.name;buildAccountOptions('s-h-account',h.account);buildAssetTypeOptions('s-h-type',h.assetType);el('s-h-monthly').value=h.monthlyAmount||'';el('s-h-spot').value=h.spotAnnual||'';el('s-h-yield').value=h.dividendYield||'';el('s-holding-panel-title').textContent='銘柄を編集';openHoldingPanel(false);}
function saveHolding(){const name=el('s-h-name').value.trim();if(!name){alert('銘柄名を入力してください');return;}const id=el('s-holding-id').value;const data={name,account:el('s-h-account').value,assetType:el('s-h-type').value,monthlyAmount:Number(el('s-h-monthly').value)||0,spotAnnual:Number(el('s-h-spot').value)||0,dividendYield:parseFloat(el('s-h-yield').value)||0};if(id){const h=D.holdings.find(h=>h.id===id);if(h)Object.assign(h,data);}else{const nh={id:uid(),...data,order:D.holdings.length};D.holdings.push(nh);if(!D.current.holdingValues[nh.id])D.current.holdingValues[nh.id]={value:0,principal:0};}persist();closeHoldingPanel();renderHoldingsTable();renderHoldingInputs();renderDashboard();}
function deleteHolding(id){const h=D.holdings.find(h=>h.id===id);if(!h)return;if(!confirm(`「${h.name}」を削除しますか？`))return;D.holdings=D.holdings.filter(h=>h.id!==id);persist();renderHoldingsTable();renderHoldingInputs();renderDashboard();}

// iDeCo
function renderIdecoTable(){el('s-ideco-table').innerHTML=D.idecoHoldings.length===0?'<tr><td colspan="6" class="empty">銘柄なし</td></tr>':D.idecoHoldings.map(h=>`<tr draggable="true" data-id="${h.id}" data-group="ideco" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"><td class="drag-handle">⠿</td><td>${h.name}</td><td>${atBadge(h.assetType)}</td><td style="text-align:right">${h.monthlyAmount>0?fmt(h.monthlyAmount)+'/月':'--'}</td><td style="text-align:right">${h.dividendYield||0}%</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editIdeco('${h.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteIdeco('${h.id}')">削除</button></div></td></tr>`).join('');}
function openIdecoPanel(r=true){if(r){el('s-ideco-id').value='';el('s-i-name').value='';el('s-i-monthly').value='';el('s-i-yield').value='';el('s-ideco-panel-title').textContent='iDeCo銘柄を追加';buildAssetTypeOptions('s-i-type','fund');}el('s-ideco-panel').classList.add('open');}
function closeIdecoPanel(){el('s-ideco-panel').classList.remove('open');el('s-ideco-id').value='';}
function editIdeco(id){const h=D.idecoHoldings.find(h=>h.id===id);if(!h)return;el('s-ideco-id').value=h.id;el('s-i-name').value=h.name;buildAssetTypeOptions('s-i-type',h.assetType);el('s-i-monthly').value=h.monthlyAmount||'';el('s-i-yield').value=h.dividendYield||'';el('s-ideco-panel-title').textContent='iDeCo銘柄を編集';openIdecoPanel(false);}
function saveIdeco(){const name=el('s-i-name').value.trim();if(!name){alert('銘柄名を入力してください');return;}const id=el('s-ideco-id').value;const data={name,assetType:el('s-i-type').value,monthlyAmount:Number(el('s-i-monthly').value)||0,dividendYield:parseFloat(el('s-i-yield').value)||0};if(id){const h=D.idecoHoldings.find(h=>h.id===id);if(h)Object.assign(h,data);}else{const nh={id:uid(),...data,order:D.idecoHoldings.length};D.idecoHoldings.push(nh);if(!D.current.idecoValues[nh.id])D.current.idecoValues[nh.id]={value:0,principal:0};}persist();closeIdecoPanel();renderIdecoTable();renderIdecoInputs();renderDashboard();}
function deleteIdeco(id){const h=D.idecoHoldings.find(h=>h.id===id);if(!h)return;if(!confirm(`「${h.name}」を削除しますか？`))return;D.idecoHoldings=D.idecoHoldings.filter(h=>h.id!==id);persist();renderIdecoTable();renderIdecoInputs();renderDashboard();}

// 口座種別
function renderAccTypesTable(){
    const accs=getAccounts();
    const all=[...Object.entries(BUILT_IN_ACCOUNTS).map(([id])=>({id,...accs[id],builtIn:true})),...(D.customAccounts||[]).map(a=>({...a,builtIn:false}))];
    el('s-acctypes-table').innerHTML=all.map(a=>{
        const drag=a.builtIn?'':'draggable="true" data-id="'+a.id+'" data-group="acctype" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"';
        const handle=a.builtIn?'<td style="width:36px;color:var(--muted);text-align:center;font-size:11px;">―</td>':'<td class="drag-handle">⠿</td>';
        return`<tr ${drag}>${handle}<td><span class="dot" style="background:${a.color}"></span>${a.label}</td><td style="text-align:right"><div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editAccType('${a.id}',${a.builtIn})">編集</button>${a.builtIn?'':'<button class="btn btn-d btn-sm" onclick="deleteAccType(\''+a.id+'\')">削除</button>'}</div></td></tr>`;
    }).join('');
}
function openAccTypePanel(r=true){if(r){el('s-acctype-id').value='';el('s-acctype-name').value='';el('s-acctype-color').value='#2563eb|b-blue';el('s-acctype-panel-title').textContent='口座種別を追加';}el('s-acctype-panel').classList.add('open');}
function closeAccTypePanel(){el('s-acctype-panel').classList.remove('open');}
function editAccType(id,builtIn=false){
    const accs=getAccounts();const a=accs[id];if(!a)return;
    el('s-acctype-id').value=id;el('s-acctype-builtin').value=builtIn?'1':'';
    el('s-acctype-name').value=a.label;el('s-acctype-color').value=`${a.color}|${a.badge}`;
    el('s-acctype-panel-title').textContent='口座種別を編集';openAccTypePanel(false);
}
function saveAccType(){const name=el('s-acctype-name').value.trim();if(!name){alert('種別名を入力してください');return;}const[color,badge]=el('s-acctype-color').value.split('|');if(!D.customAccounts)D.customAccounts=[];const id=el('s-acctype-id').value;const isBuiltIn=el('s-acctype-builtin').value==='1';if(isBuiltIn){if(!D.accountTypeOverrides)D.accountTypeOverrides={};D.accountTypeOverrides[id]={label:name,color,badge};}else if(id){const a=D.customAccounts.find(a=>a.id===id);if(a){a.label=name;a.color=color;a.badge=badge;}}else{D.customAccounts.push({id:uid(),label:name,color,badge});}persist();closeAccTypePanel();renderAccTypesTable();}
function deleteAccType(id){const a=(D.customAccounts||[]).find(a=>a.id===id);if(!a)return;if(D.holdings.some(h=>h.account===id)){alert('この口座種別を使用している銘柄があります。先に銘柄の口座を変更してください。');return;}if(!confirm(`「${a.label}」を削除しますか？`))return;D.customAccounts=D.customAccounts.filter(a=>a.id!==id);persist();renderAccTypesTable();}

// 銘柄種別
function renderAssetTypesTable(){
    const all=[...Object.entries(BUILT_IN_ASSET_TYPES).map(([id,t])=>({id,...t,builtIn:true})),...(D.customAssetTypes||[]).map(t=>({...t,builtIn:false}))];
    el('s-assettypes-table').innerHTML=all.map(t=>{
        const drag=t.builtIn?'':'draggable="true" data-id="'+t.id+'" data-group="assettype" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondragleave="dragLeave(event)" ondrop="drop(event)" ondragend="dragEnd(event)"';
        const handle=t.builtIn?'<td style="width:36px;color:var(--muted);text-align:center;font-size:11px;">―</td>':'<td class="drag-handle">⠿</td>';
        return`<tr ${drag}>${handle}<td>${t.label}</td><td style="text-align:right">${t.builtIn?'<span style="font-size:11px;color:var(--muted)">組み込み</span>':`<div class="flex-gap" style="justify-content:flex-end"><button class="btn btn-s btn-sm" onclick="editAssetType('${t.id}')">編集</button><button class="btn btn-d btn-sm" onclick="deleteAssetType('${t.id}')">削除</button></div>`}</td></tr>`;
    }).join('');
}
function openAssetTypePanel(r=true){if(r){el('s-assettype-id').value='';el('s-assettype-name').value='';el('s-assettype-panel-title').textContent='銘柄種別を追加';}el('s-assettype-panel').classList.add('open');}
function closeAssetTypePanel(){el('s-assettype-panel').classList.remove('open');}
function editAssetType(id){const t=(D.customAssetTypes||[]).find(t=>t.id===id);if(!t)return;el('s-assettype-id').value=t.id;el('s-assettype-name').value=t.label;el('s-assettype-panel-title').textContent='銘柄種別を編集';openAssetTypePanel(false);}
function saveAssetType(){const name=el('s-assettype-name').value.trim();if(!name){alert('種別名を入力してください');return;}if(!D.customAssetTypes)D.customAssetTypes=[];const id=el('s-assettype-id').value;if(id){const t=D.customAssetTypes.find(t=>t.id===id);if(t)t.label=name;}else{D.customAssetTypes.push({id:uid(),label:name,badge:'b-gray'});}persist();closeAssetTypePanel();renderAssetTypesTable();}
function deleteAssetType(id){const t=(D.customAssetTypes||[]).find(t=>t.id===id);if(!t)return;if([...D.holdings,...D.idecoHoldings].some(h=>h.assetType===id)){alert('この銘柄種別を使用している銘柄があります。先に銘柄の種別を変更してください。');return;}if(!confirm(`「${t.label}」を削除しますか？`))return;D.customAssetTypes=D.customAssetTypes.filter(t=>t.id!==id);persist();renderAssetTypesTable();}

// ===== ドラッグ&ドロップ =====
let dragId=null,dragGroup=null;
function dragStart(e){dragId=e.currentTarget.dataset.id;dragGroup=e.currentTarget.dataset.group;e.dataTransfer.effectAllowed='move';e.currentTarget.classList.add('dragging');}
function dragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function dragLeave(e){e.currentTarget.classList.remove('drag-over');}
function dragEnd(e){e.currentTarget.classList.remove('dragging');}
function drop(e){e.preventDefault();e.currentTarget.classList.remove('drag-over');const tid=e.currentTarget.dataset.id,tg=e.currentTarget.dataset.group;if(!dragId||dragId===tid||dragGroup!==tg)return;const arr=dragGroup==='ideco'?D.idecoHoldings:dragGroup==='bank'?D.bankAccounts:dragGroup==='card'?D.creditCards:dragGroup==='acctype'?D.customAccounts:dragGroup==='assettype'?D.customAssetTypes:D.holdings;const si=arr.findIndex(h=>h.id===dragId),ti=arr.findIndex(h=>h.id===tid);if(si===-1||ti===-1)return;const[item]=arr.splice(si,1);arr.splice(ti,0,item);persist();if(dragGroup==='ideco'){renderIdecoTable();renderIdecoInputs();}else if(dragGroup==='bank'){renderBanksTable();renderBankInputs();}else if(dragGroup==='card'){renderCardsTable();renderCardInputs();}else if(dragGroup==='acctype'){renderAccTypesTable();}else if(dragGroup==='assettype'){renderAssetTypesTable();}else{renderHoldingsTable();renderHoldingInputs();}dragId=null;dragGroup=null;}

// ===== データ管理 =====
const today=()=>new Date().toISOString().slice(0,10);

// 全体バックアップ
function exportAll(){const b=new Blob([JSON.stringify(D,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`asset-backup-${today()}.json`;a.click();}
function importAll(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{D=JSON.parse(ev.target.result);persist();renderSettings();renderDashboard();renderRecordTab();alert('インポート完了しました');}catch{alert('ファイルの形式が正しくありません');}};r.readAsText(f);}

// 設定のみ（記録は保持）
function exportSettings(){
    const s={settings:D.settings,bankAccounts:D.bankAccounts,creditCards:D.creditCards,holdings:D.holdings,idecoHoldings:D.idecoHoldings,customAccounts:D.customAccounts||[],customAssetTypes:D.customAssetTypes||[],current:D.current};
    const b=new Blob([JSON.stringify(s,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`asset-settings-${today()}.json`;a.click();
}
function importSettings(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const s=JSON.parse(ev.target.result);D={...s,snapshots:D.snapshots};persist();renderSettings();renderDashboard();renderRecordTab();alert('設定をインポートしました（記録は変更されていません）');}catch{alert('ファイルの形式が正しくありません');}};r.readAsText(f);}

// CSV エクスポート
function _csvRow(arr){return arr.map(v=>{const s=String(v??'');return(s.includes(',')||s.includes('"'))?'"'+s.replace(/"/g,'""')+'"':s;}).join(',');}
function _exportCsv(snaps,filename){
    const scdH=getScdHolding();
    const header=['月','総資産','投資','iDeCo','現金','SCHD元本'];
    const rows=snaps.map(s=>[s.month,Math.round(s.total||0),Math.round(s.investment||0),Math.round(s.idecoTotal||0),Math.round(s.cash||0),Math.round(scdH?s.holdingValues?.[scdH.id]?.principal||0:0)]);
    const csv='﻿'+[header,...rows].map(r=>_csvRow(r)).join('\n');
    const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;a.click();
}
function exportCsvSelected(){
    const val=el('csv-year-sel').value;if(!val)return;
    const snaps=(val==='all'?D.snapshots.slice():D.snapshots.filter(s=>s.month.startsWith(val))).sort((a,b)=>a.month.localeCompare(b.month));
    if(!snaps.length){alert('記録がありません');return;}
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
    // onclick="xfOpen('div-sim',3,this)" から colIdx を正規表現で取得
    const re=new RegExp(`xfOpen\\('${tableId}',(\\d+),`);
    document.querySelectorAll('.xf-btn').forEach(btn=>{
        const m=btn.getAttribute('onclick').match(re);
        if(!m)return;
        const colIdx=parseInt(m[1]);
        const hasFilter=!!(s.filters[colIdx]&&s.filters[colIdx].size>0);
        const hasSort=s.sortCol===colIdx;
        btn.classList.toggle('xf-active',hasFilter||hasSort);
    });
}

// ===== タブ切り替え =====
const TABS=['dashboard','record','settings'];
function switchTab(name){
    TABS.forEach(t=>el(`tab-${t}`).classList.toggle('active',t===name));
    document.querySelectorAll('.main-nav button').forEach((b,i)=>b.classList.toggle('active',TABS[i]===name));
    const qnav=el('dash-qnav');
    if(qnav)qnav.style.display=name==='dashboard'?'flex':'none';
    if(name==='dashboard')renderDashboard();
    if(name==='record')   renderRecordTab();
    if(name==='settings') renderSettings();
}

function switchSubTab(group,name){
    document.querySelectorAll(`[id^="${group}-"]`).forEach(e=>{if(e.classList.contains('sub-content'))e.classList.toggle('active',e.id===`${group}-${name}`);});
    const nav=group==='rec'?document.querySelector('#tab-record .sub-nav'):document.querySelector('#tab-settings .sub-nav');
    if(nav)nav.querySelectorAll('button').forEach((b,i)=>{
        const names=group==='rec'?['banks','holdings']:['holdings','accounts','basic'];
        b.classList.toggle('active',names[i]===name);
    });
}

// ===== 初期化 =====
function init(){
    const now=new Date();
    el('rec-month').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const qnav=el('dash-qnav');
    if(qnav)qnav.style.display='flex'; // ダッシュボードが初期表示なので即表示
    renderDashboard();
    renderRecordTab();
}
init();
