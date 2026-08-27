// 합격 확률 예측 로직
// DATA는 data.js에서 정의됨 (이 파일보다 먼저 로드되어야 함)

// ---- 통계 함수 ----
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// ---- DOM 요소 캐싱 ----
const el = {
  jobSelect: document.getElementById('jobSelect'),
  s_kor: document.getElementById('s_kor'),
  s_eng: document.getElementById('s_eng'),
  s_m1: document.getElementById('s_m1'),
  s_m2: document.getElementById('s_m2'),
  hangul_grade: document.getElementById('hangul_grade'),
  bonus: document.getElementById('bonus'),
  lbl_m1: document.getElementById('lbl_m1'),
  lbl_m2: document.getElementById('lbl_m2'),
  jobMeta: document.getElementById('jobMeta'),
  resultBody: document.getElementById('resultBody'),
};

// ---- 직렬 셀렉트 박스 초기화 ----
function populateJobSelect() {
  DATA.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${d.name}  ·  직군:${d.jikgun}`;
    el.jobSelect.appendChild(opt);
  });
}

// ---- 판정 문구 ----
function verdictOf(prob, fail, gradeOk) {
  if (fail) return '과락 — 불합격';
  if (!gradeOk) return '한능검 자격 미충족';
  if (prob >= 0.7) return '합격 유력';
  if (prob >= 0.4) return '경합권';
  return '불합격 유력';
}

// ---- 입력값 읽기 ----
function readInputs() {
  return {
    kor: parseFloat(el.s_kor.value) || 0,
    eng: parseFloat(el.s_eng.value) || 0,
    m1: parseFloat(el.s_m1.value) || 0,
    m2: parseFloat(el.s_m2.value) || 0,
    grade: parseFloat(el.hangul_grade.value) || 99,
    bonus: parseFloat(el.bonus.value) || 0,
  };
}

// ---- 합격 확률 계산 ----
function calculate(job, inputs) {
  const subjects = [inputs.kor, inputs.eng, inputs.m1, inputs.m2];
  const fail = subjects.some(s => s < 40);
  const gradeOk = inputs.grade <= job.hanguksa;

  const rawAvg = subjects.reduce((a, b) => a + b, 0) / 4;
  const bonusAvg = rawAvg * (1 + inputs.bonus / 100);
  const margin = bonusAvg - job.mean;
  const std = job.std > 0 ? job.std : 0.001;

  let prob = normalCDF(margin / std);
  if (fail || !gradeOk) prob = 0;

  return { fail, gradeOk, rawAvg, bonusAvg, margin, prob };
}

// ---- 화면 렌더링 ----
function renderJobMeta(job) {
  el.lbl_m1.textContent = job.m1;
  el.lbl_m2.textContent = job.m2;
  el.jobMeta.innerHTML =
    `<b>${job.name}</b> · 전공: ${job.m1} / ${job.m2} · 요구 한능검: ${job.hanguksa}급 이내<br>` +
    `2027 예측 커트라인 <b>${job.mean.toFixed(3)}</b>점 · 표준편차 <b>${job.std.toFixed(3)}</b>`;
}

function renderResult(job, result) {
  const { fail, gradeOk, rawAvg, bonusAvg, margin, prob } = result;
  const label = verdictOf(prob, fail, gradeOk);
  const pct = (prob * 100).toFixed(1);

  el.resultBody.innerHTML = `
    <div class="verdict-row">
      <div class="verdict-pct">${pct}%</div>
      <div>
        <div class="verdict-text">${label}</div>
        <div class="verdict-sub">합격 확률 (정규분포 누적확률 기준)</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    </div>
    <table class="result-table">
      <tr><td>과락 과목 (40점 미만)</td><td>${fail ? '있음' : '없음'} <span class="flag ${fail ? 'bad' : 'ok'}">${fail ? '✗' : '✓'}</span></td></tr>
      <tr><td>한능검 자격 충족 여부</td><td>${gradeOk ? '충족' : '미충족'} <span class="flag ${gradeOk ? 'ok' : 'bad'}">${gradeOk ? '✓' : '✗'}</span></td></tr>
      <tr><td>① 원점수 평균</td><td>${rawAvg.toFixed(2)}</td></tr>
      <tr><td>② 가산점 반영 평균</td><td>${bonusAvg.toFixed(2)}</td></tr>
      <tr><td>③ 2027 예측 커트라인</td><td>${job.mean.toFixed(3)}</td></tr>
      <tr><td>④ 예측 표준편차</td><td>${job.std.toFixed(3)}</td></tr>
      <tr><td>⑤ 커트라인 대비 여유점수 (②−③)</td><td>${margin.toFixed(3)}</td></tr>
      <tr class="total"><td>⑥ 합격 확률</td><td>${pct}%</td></tr>
    </table>
  `;
}

function render() {
  const job = DATA[el.jobSelect.value];
  renderJobMeta(job);
  const inputs = readInputs();
  const result = calculate(job, inputs);
  renderResult(job, result);
}

// ---- 초기화 ----
function init() {
  populateJobSelect();
  const watchedIds = ['jobSelect', 's_kor', 's_eng', 's_m1', 's_m2', 'hangul_grade', 'bonus'];
  watchedIds.forEach(id => document.getElementById(id).addEventListener('input', render));
  render();
}

init();
