import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Card,
  Breadcrumb,
  Table,
  Alert,
  ProgressBar,
} from "react-bootstrap";
import { FaCogs, FaList } from "react-icons/fa";
import './Calculation.css'; // <--- IMPORT THE CSS FILE HERE

// —— Catalogs ——
const EFFICIENCY_CATALOG = [
  { label: "Bộ truyền bánh răng trụ", covered: [0.96, 0.98], open: [0.94, 0.97] },
  { label: "Bộ truyền bánh răng côn", covered: [0.95, 0.97], open: [0.93, 0.96] },
  { label: "Bộ truyền xích",       covered: [0.92, 0.96], open: [0.90, 0.94] },
  { label: "Một cặp ổ lăn",       covered: [0.97, 0.99], open: [0.97, 0.99] },
];
const TRANSMISSION_CATALOG = [
  { label: "Hộp giảm tốc côn-trụ 2 cấp", range: [8, 20] },
  { label: "Truyền động xích",            range: [3, 6] },
];
// Task3 catalogs
const BEVEL_MATERIAL_CATALOG = [
  { label: "Thép 40XH", HB_range: [200, 350] },
  { label: "Thép 50X",  HB_range: [180, 330] },
];
const SPUR_MATERIAL_CATALOG = [...BEVEL_MATERIAL_CATALOG];

const STEP_TITLES = [
  "Nhập liệu",
  "Hiệu suất",
  "Tỉ số truyền",
  "K và ψ",
  "Bảng đặc tính",
  "Thiết kế bánh răng côn",
  "Thiết kế bánh răng trụ",
  "Thiết kế xích",
];
const totalSteps = STEP_TITLES.length;

export default function Calculation() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") || "default";
  const lsKey = `calc-${code}`;

  // Task1 inputs
  const [P, setP] = useState(0);
  const [n, setN] = useState(0);
  const [L, setL] = useState(0);

  // step & results
  const [step, setStep] = useState(1);
  const [results, setResults] = useState([]);

  // Task2 states
  const [effRows, setEffRows] = useState([]);
  const [trRows, setTrRows] = useState([]);
  const [Kbe, setKbe] = useState(0.27);
  const [cK, setCK] = useState(1.05);
  const [psiBa, setPsiBa] = useState(0.3);
  const [psiBd, setPsiBd] = useState(0.6);
  const [u1, setU1] = useState(null);
  const [u2, setU2] = useState(null);
  const [characteristic, setCharacteristic] = useState({ fields: [], rows: [] });

  // Task3.1 states
  const [bevelMat1, setBevelMat1] = useState(null);
  const [bevelMat2, setBevelMat2] = useState(null);
  const [HB1, setHB1] = useState(0);
  const [HB2, setHB2] = useState(0);

  // Task3.2 states
  const [spurMat1, setSpurMat1] = useState(null);
  const [spurMat2, setSpurMat2] = useState(null);

  // Task3.3 states
  const [chainZ1, setChainZ1] = useState(null);
  const [chainZ2, setChainZ2] = useState(null);

  // init
  useEffect(() => {
    setEffRows(initEffRows());
    setTrRows(initTrRows());
    const saved = JSON.parse(localStorage.getItem(lsKey) || "{}");
    if (saved.P) setP(saved.P);
    if (saved.n) setN(saved.n);
    if (saved.L) setL(saved.L);
    if (saved.step) setStep(saved.step);
    if (saved.results) setResults(saved.results);
  }, []);
  useEffect(() => {
    localStorage.setItem(lsKey, JSON.stringify({ P, n, L, step, results }));
  }, [P, n, L, step, results]);

  function initEffRows() {
    return EFFICIENCY_CATALOG.map(c => ({ label: c.label, covered: c.covered, open: c.open, value: ((c.open[0]+c.open[1])/2).toFixed(3) }));
  }
  function initTrRows() {
    return TRANSMISSION_CATALOG.map(c => ({ label: c.label, range: c.range, value: ((c.range[0]+c.range[1])/2).toFixed(1) }));
  }
  function upsertResult(name, data) {
    setResults(prev => { const i = prev.findIndex(r=>r.name===name); if(i>=0){ const a=[...prev]; a[i]={name,data}; return a;} return [...prev,{name,data}]; });
  }

  // Task2.1
  function calcStep2Eff() {
    let η=1;
    effRows.forEach(r=>{ let v=+r.value; if(r.label.includes('ổ lăn')) v**=3; η*=v; upsertResult(r.label,v.toFixed(3)); });
    upsertResult('η hệ',η.toFixed(3));
    upsertResult('P_ct',(η>0?(P/η).toFixed(3):'∞'));
  }
  // Task2.2
  function calcStep3Ratio(){ let u=1; trRows.forEach(r=>{ u*=+r.value; upsertResult(r.label,r.value); }); upsertResult('u_ch',u.toFixed(3)); upsertResult('n_sb',(n*u).toFixed(3)); }
  // Task2.3
  function solveKpsiEq(){ const uH=+trRows[0].value; const λ=2.25*psiBd/((1-Kbe)*Kbe); let lo=1e-3,hi=1e3,m; for(let i=0;i<50;i++){m=(lo+hi)/2; const f=λ*cK*m**3/(4*uH**2*(uH+m))-1; if(f>0) hi=m; else lo=m;} setU1(m); setU2(uH/m); upsertResult('u1',m.toFixed(3)); upsertResult('u2',(uH/m).toFixed(3)); }
  // Task2.4
  function buildCharacteristic(){ const e=[...effRows].map(r=>+r.value); e[3]**=3; const [ebrtru,ebrcon,ex,_,]=e; const PIII=P/(ex*e[3]); const PII=PIII/(ebrtru*e[3]); const PI=PII/(ebrcon*e[3]); const motor=1500; const nI=motor,nII=u1?nI/u1:0,nIII=u2?nII/u2:0; const q=(p,r)=>r?`${Math.round(9.55e6*p/r)}`:'0'; const fields=['Trục','P','n','T']; const rows=[['I',PIII.toFixed(3),nI,q(PIII,nI)],['II',PII.toFixed(3),nII,q(PII,nII)],['III',PIII.toFixed(3),nIII,q(PIII,nIII)],['Tải',P.toFixed(3),n,q(P,n)]]; setCharacteristic({fields,rows}); rows.forEach(r=>upsertResult(r[0],`P=${r[1]} n=${r[2]} T=${r[3]}`)); }

  // Task3.1
  function handleBevelDesign(){ if(!bevelMat1||!bevelMat2){ alert('Chọn 2 vật liệu'); return;} if(HB1<HB2+10){alert('HB1 phải ≥ HB2+10');return;} const σH1=2*HB1+70; const σH2=2*HB2+70; const σF1=1.8*HB1; const σF2=1.8*HB2; const NHO1=30*HB1**2.4; const NHO2=30*HB2**2.4; const NHE1=60*L*300*8*2*1500; const NHE2=NHE1/(u1||1); const KHL1=Math.pow(NHO1/NHE1,1/6); const KHL2=Math.pow(NHO2/NHE2,1/6); upsertResult('σH_lim1',σH1.toFixed(1)); upsertResult('σH_lim2',σH2.toFixed(1)); upsertResult('KHL1',KHL1.toFixed(3)); upsertResult('KHL2',KHL2.toFixed(3)); }
  // Task3.2
  function handleSpurDesign(){ if(!spurMat1||!spurMat2){alert('Chọn vật liệu trụ');return;} upsertResult('spur',`${spurMat1.label},${spurMat2.label}`); }
  // Task3.3
  function handleChainDesign(){ const uX=+trRows[1].value; const z1=29-2*uX|0; const z2=Math.round(z1*uX); setChainZ1(z1); setChainZ2(z2); upsertResult('chain z1',z1); upsertResult('chain z2',z2); }

  const next=()=>{ if(step===2)calcStep2Eff(); if(step===3)calcStep3Ratio(); if(step===4)solveKpsiEq(); if(step===5)buildCharacteristic(); if(step===6)handleBevelDesign(); if(step===7)handleSpurDesign(); if(step===8)handleChainDesign(); setStep(s=>Math.min(totalSteps,s+1)); };
  const prev=()=>setStep(s=>Math.max(1,s-1));

  const renderContent=()=>{
    switch(step){
      case 1: return <Form onSubmit={e=>{e.preventDefault();next();}}><Row><Col md={4}><Form.Label>P (kW)</Form.Label><Form.Control type="number" min={0} step="0.01" value={P} onChange={e=>setP(+e.target.value)} required/></Col><Col md={4}><Form.Label>n (v/p)</Form.Label><Form.Control type="number" min={0} step="0.01" value={n} onChange={e=>setN(+e.target.value)} required/></Col><Col md={4}><Form.Label>L (năm)</Form.Label><Form.Control type="number" min={0} step="0.01" value={L} onChange={e=>setL(+e.target.value)} required/></Col></Row></Form>;
      case 2: return <Table bordered size="sm"><tbody>{effRows.map((r,i)=><tr key={i}><td>{r.label}</td><td>{r.covered[0]}–{r.covered[1]}</td><td>{r.open[0]}–{r.open[1]}</td><td><Form.Range min={r.open[0]} max={r.open[1]} step={0.001} value={r.value} onChange={e=>{const v=e.target.value;setEffRows(a=>{a[i].value=v;return[...a]});}}/>{r.value}</td></tr>)}</tbody></Table>;
      case 3: return <Table bordered size="sm"><tbody>{trRows.map((r,i)=><tr key={i}><td>{r.label}</td><td>{r.range[0]}–{r.range[1]}</td><td><Form.Range min={r.range[0]} max={r.range[1]} step={0.1} value={r.value} onChange={e=>{const v=e.target.value;setTrRows(a=>{a[i].value=v;return[...a]});}}/>{r.value}</td></tr>)}</tbody></Table>;
      case 4: return <Row><Col md={3}><Form.Label>K_be</Form.Label><Form.Control type="number" min={0.25} max={0.3} step={0.01} value={Kbe} onChange={e=>setKbe(+e.target.value)}/></Col><Col md={3}><Form.Label>c_K</Form.Label><Form.Control type="number" min={1} max={1.1} step={0.01} value={cK} onChange={e=>setCK(+e.target.value)}/></Col><Col md={3}><Form.Label>ψ_ba</Form.Label><Form.Control type="number" step={0.01} value={psiBa} onChange={e=>setPsiBa(+e.target.value)}/></Col><Col md={3}><Form.Label>ψ_bdmax</Form.Label><Form.Control type="number" step={0.01} value={psiBd} onChange={e=>setPsiBd(+e.target.value)}/></Col>{u1&&u2&&<Col md={12}><Alert>u1={u1.toFixed(3)}, u2={u2.toFixed(3)}</Alert></Col>}</Row>;
      case 5: return <Table bordered size="sm"><thead><tr>{characteristic.fields.map(f=><th key={f}>{f}</th>)}</tr></thead><tbody>{characteristic.rows.map((r,i)=><tr key={i}>{characteristic.fields.map((f,j)=><td key={j}>{r[j]}</td>)}</tr>)}</tbody></Table>;
      case 6: return <div><h5>3.1 Thiết kế bánh răng côn</h5><Row><Col><Form.Label>Vật liệu dẫn</Form.Label><Form.Select onChange={e=>setBevelMat1(BEVEL_MATERIAL_CATALOG.find(m=>m.label===e.target.value))}><option/>{BEVEL_MATERIAL_CATALOG.map(m=><option key={m.label}>{m.label}</option>)}</Form.Select></Col><Col><Form.Label>Vật liệu bị dẫn</Form.Label><Form.Select onChange={e=>setBevelMat2(BEVEL_MATERIAL_CATALOG.find(m=>m.label===e.target.value))}><option/>{BEVEL_MATERIAL_CATALOG.map(m=><option key={m.label}>{m.label}</option>)}</Form.Select></Col><Col><Form.Label>HB1</Form.Label><Form.Control type="number" min={bevelMat1?.HB_range[0]} max={bevelMat1?.HB_range[1]} value={HB1} onChange={e=>setHB1(+e.target.value)}/></Col><Col><Form.Label>HB2</Form.Label><Form.Control type="number" min={bevelMat2?.HB_range[0]} max={bevelMat2?.HB_range[1]} value={HB2} onChange={e=>setHB2(+e.target.value)}/></Col></Row></div>;
      case 7: return <div><h5>3.2 Thiết kế bánh răng trụ</h5><Row><Col><Form.Label>Vật liệu dẫn</Form.Label><Form.Select onChange={e=>setSpurMat1(SPUR_MATERIAL_CATALOG.find(m=>m.label===e.target.value))}><option/>{SPUR_MATERIAL_CATALOG.map(m=><option key={m.label}>{m.label}</option>)}</Form.Select></Col><Col><Form.Label>Vật liệu bị dẫn</Form.Label><Form.Select onChange={e=>setSpurMat2(SPUR_MATERIAL_CATALOG.find(m=>m.label===e.target.value))}><option/>{SPUR_MATERIAL_CATALOG.map(m=><option key={m.label}>{m.label}</option>)}</Form.Select></Col></Row></div>;
      case 8: return <div><h5>3.3 Thiết kế xích</h5><Row><Col><Form.Label>u_x</Form.Label><Form.Control readOnly value={trRows[1]?.value}/></Col><Col><Form.Label>z1</Form.Label><Form.Control readOnly value={chainZ1}/></Col><Col><Form.Label>z2</Form.Label><Form.Control readOnly value={chainZ2}/></Col></Row></div>;
      default: return null;
    }
  };

  return (
    <Container className="py-4">
      <Breadcrumb>{STEP_TITLES.map((t,i)=><Breadcrumb.Item key={i} active={i+1===step}>{i+1}. {t}</Breadcrumb.Item>)}</Breadcrumb>
      <ProgressBar now={(step/totalSteps)*100} label={`${step}/${totalSteps}`} className="mb-3" />
      <Card className="mb-4 shadow-sm"><Card.Header><FaCogs /> Bước {step}: {STEP_TITLES[step-1]}</Card.Header><Card.Body>{renderContent()}</Card.Body><Card.Footer className="d-flex justify-content-between"><Button variant="outline-secondary" disabled={step===1} onClick={prev}>◀ Trước</Button><Button variant="primary" onClick={next}>{step===totalSteps?'Hoàn tất':'Tiếp ▶'}</Button></Card.Footer></Card>
      <Card className="shadow-sm"><Card.Header><FaList /> Kết quả</Card.Header><Card.Body style={{maxHeight:'300px',overflowY:'auto'}}>{results.length>0?results.map(r=><div key={r.name}><strong>{r.name}</strong>: {r.data}</div>):<Alert variant="light">Chưa có kết quả</Alert>}</Card.Body></Card>
    </Container>
  );
}
