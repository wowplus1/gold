// Sample Data Generator
const generateMockData = () => {
  const data = [];
  let idCounter = 1;
  const types = ["18K", "14K", "순금"];
  const prefixes = ["커플링", "목걸이", "팔찌", "귀걸이", "펜던트", "반지", "브로치", "티아라"];
  const months = [2, 3, 4];
  
  months.forEach(month => {
    for(let i=0; i<100; i++) {
      const gType = types[Math.floor(Math.random() * types.length)];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      
      // Randomize weights
      const expW = parseFloat((Math.random() * 80 + 10).toFixed(2));
      const iniW = parseFloat((expW + (Math.random() * 2 - 1)).toFixed(2));
      const cstW = parseFloat((iniW * (1 - Math.random() * 0.03)).toFixed(2));
      const crfW = parseFloat((cstW * (1 - Math.random() * 0.02)).toFixed(2));
      const finW = parseFloat((crfW * (1 - Math.random() * 0.01)).toFixed(2));
      
      // Randomize dates (Feb, Mar, Apr 2026)
      const day = Math.floor(Math.random() * 28) + 1;
      const startD = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const endDay = day + Math.floor(Math.random() * 5) + 1;
      let endMonth = month;
      let actualEndDay = endDay;
      if (actualEndDay > 28) {
        actualEndDay -= 28;
        endMonth++;
      }
      const endD = `2026-${String(endMonth).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;

      data.push({
        id: idCounter++,
        name: `${month}월 ${prefix} 디자인-${i+1}`,
        goldType: gType,
        expectedWeight: expW,
        initialWeight: iniW,
        casting: cstW,
        crafting: crfW,
        final: finW,
        startDate: startD,
        endDate: endD,
        timestamp: new Date(startD).toISOString()
      });
    }
  });
  
  // Sort descending by date
  return data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
};

// Backend Server Support
const API_URL = 'https://script.google.com/macros/s/AKfycbwRa6_lGuqrUS6i8j8Ksrpe1afRpk5ILpAAfzt9Ro_rbLM-FBV11HkjcwpeULtlKJIYGg/exec';
let ledgerData = [];

const loadData = async () => {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (data && data.length > 0) {
      ledgerData = data;
    } else {
      ledgerData = generateMockData();
      saveData(); // Save mock data to backend initially
    }
    renderMainData();
  } catch (error) {
    console.error('Server is not running. Falling back to local/mock.', error);
    ledgerData = generateMockData();
    renderMainData();
  }
};

const saveData = async () => {
  try {
    // Send data to Google Sheets via POST action=bulk
    // For large arrays, sending via JSON body in POST is required
    await fetch(`${API_URL}?action=bulk`, {
      method: 'POST',
      body: JSON.stringify(ledgerData)
    });
  } catch (error) {
    console.error('Failed to save to server', error);
  }
};

// Initiate Load
loadData();

let editingId = null;

// DOM Elements
const form = document.getElementById('loss-form');
const ledgerBody = document.getElementById('ledger-body');

// Input fields
const inputStartDate = document.getElementById('startDate');
const inputEndDate = document.getElementById('endDate');
const inputName = document.getElementById('designName');
const inputGoldType = document.getElementById('goldType');
const inputExpected = document.getElementById('expectedWeight');
const inputInitial = document.getElementById('initialWeight');
const inputCasting = document.getElementById('castingWeight');
const inputCrafting = document.getElementById('craftingWeight');
const inputFinal = document.getElementById('polishingWeight');

// Preview elements
const previewLoss = document.getElementById('preview-loss');
const previewHeri = document.getElementById('preview-heri');

// View and Pagination State
let mainPage = 1;
const mainPageSize = 20;

let statsPage = 1;
let statsPageSize = 20;

let filterStartDate = '';
let filterEndDate = '';
let filterDateType = 'startDate';

// View Toggles
const viewMain = document.getElementById('view-main');
const viewStats = document.getElementById('view-stats');
const navToggleButton = document.getElementById('nav-toggle-view');
const navToggleText = document.getElementById('nav-toggle-text');

navToggleButton.addEventListener('click', () => {
  if (viewMain.style.display === 'none') {
    // Switch to Main View
    viewStats.style.display = 'none';
    viewMain.style.display = 'block';
    navToggleText.textContent = '통계 페이지';
    renderMainData();
  } else {
    // Switch to Stats View
    viewMain.style.display = 'none';
    viewStats.style.display = 'block';
    navToggleText.textContent = '메인으로 돌아가기';
    updateStatsView();
  }
});
// Format helpers
const formatNum = (num) => Number(num).toFixed(2);

// Calculate Loss and Heri
const calculateMetrics = (initial, final) => {
  if (!initial || !final || initial <= 0) return { loss: 0, heri: 0 };
  const loss = initial - final;
  const heri = (loss / initial) * 100;
  return { loss, heri };
};

// Event Listeners for real-time preview
const updatePreview = () => {
  const initial = parseFloat(inputInitial.value);
  const final = parseFloat(inputFinal.value);
  
  if (initial && final) {
    const { loss, heri } = calculateMetrics(initial, final);
    previewLoss.textContent = `${formatNum(loss)} g`;
    previewHeri.textContent = `${formatNum(heri)}%`;
    
    if (heri > 5) {
      previewHeri.style.color = 'var(--danger-text)';
      previewLoss.style.color = 'var(--danger-text)';
    } else {
      previewHeri.style.color = '#1D4ED8';
      previewLoss.style.color = '#1D4ED8';
    }
  } else {
    previewLoss.textContent = '0.00 g';
    previewHeri.textContent = '0.00%';
    previewHeri.style.color = '#1D4ED8';
    previewLoss.style.color = '#1D4ED8';
  }
};

['input', 'change'].forEach(evt => {
  inputInitial.addEventListener(evt, updatePreview);
  inputFinal.addEventListener(evt, updatePreview);
});

// Add or Update entry
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (editingId) {
    const index = ledgerData.findIndex(item => item.id === editingId);
    if (index !== -1) {
      ledgerData[index] = {
        ...ledgerData[index],
        startDate: inputStartDate.value,
        endDate: inputEndDate.value,
        name: inputName.value,
        goldType: inputGoldType.value,
        expectedWeight: parseFloat(inputExpected.value),
        initialWeight: parseFloat(inputInitial.value),
        casting: parseFloat(inputCasting.value),
        crafting: parseFloat(inputCrafting.value),
        final: parseFloat(inputFinal.value),
      };
    }
    editingId = null;
    
    // Reset button
    const btn = form.querySelector('.btn-primary');
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add to Ledger`;
  } else {
    const newItem = {
      id: Date.now(),
      startDate: inputStartDate.value,
      endDate: inputEndDate.value,
      name: inputName.value,
      goldType: inputGoldType.value,
      expectedWeight: parseFloat(inputExpected.value),
      initialWeight: parseFloat(inputInitial.value),
      casting: parseFloat(inputCasting.value),
      crafting: parseFloat(inputCrafting.value),
      final: parseFloat(inputFinal.value),
      timestamp: new Date().toISOString()
    };
    
    ledgerData.unshift(newItem);
  }
  
  saveData();
  renderMainData();
  
  // Reset form
  form.reset();
  inputStartDate.value = new Date().toISOString().slice(0, 10);
  updatePreview();
  
  // Provide visual feedback
  const btn = form.querySelector('.btn-primary');
  const originalText = btn.innerHTML;
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg> 완료!`;
  btn.style.backgroundColor = '#16A34A'; // Green
  
  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.style.backgroundColor = '';
  }, 2000);
});

// Edit entry
const editEntry = (id) => {
  const item = ledgerData.find(item => item.id === id);
  if (!item) return;
  
  // 만약 통계 화면에서 수정 버튼을 눌렀다면 메인 입력 화면으로 강제 이동
  if (viewStats.style.display === 'block') {
    viewStats.style.display = 'none';
    viewMain.style.display = 'block';
    document.getElementById('nav-toggle-text').textContent = '통계 페이지';
    renderMainData(); // 메인 화면 테이블 최신화
  }
  
  editingId = id;
  inputStartDate.value = item.startDate || '';
  inputEndDate.value = item.endDate || '';
  inputName.value = item.name;
  inputGoldType.value = item.goldType;
  inputExpected.value = item.expectedWeight;
  inputInitial.value = item.initialWeight;
  inputCasting.value = item.casting;
  inputCrafting.value = item.crafting;
  inputFinal.value = item.final;
  
  updatePreview();
  
  // Update button
  const btn = form.querySelector('.btn-primary');
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Update Ledger`;
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Delete entry
const deleteEntry = (id) => {
  if(confirm('이 데이터를 삭제하시겠습니까?')) {
    ledgerData = ledgerData.filter(item => item.id !== id);
    saveData();
    renderMainData();
    if(viewStats.style.display === 'block') updateStatsView();
  }
};

// --- Pagination & Rendering Helpers ---
const renderPagination = (totalItems, pageSize, currentPage, container, onPageChange) => {
  container.innerHTML = '';
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return;
  
  const createBtn = (text, page, disabled, active) => {
    const btn = document.createElement('button');
    btn.className = `page-btn ${active ? 'active' : ''}`;
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled && !active) {
      btn.addEventListener('click', () => onPageChange(page));
    }
    return btn;
  };

  container.appendChild(createBtn('<', currentPage - 1, currentPage === 1, false));
  
  for (let i = 1; i <= totalPages; i++) {
    container.appendChild(createBtn(i, i, false, i === currentPage));
  }
  
  container.appendChild(createBtn('>', currentPage + 1, currentPage === totalPages, false));
};

const renderTableGeneric = (dataArray, tbody, currentPage, pageSize, paginationContainer, onPageChange) => {
  tbody.innerHTML = '';
  
  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">데이터가 없습니다.</td></tr>`;
    paginationContainer.innerHTML = '';
    return;
  }
  
  const startIdx = (currentPage - 1) * pageSize;
  const pageData = dataArray.slice(startIdx, startIdx + pageSize);
  
  pageData.forEach(item => {
    const { loss, heri } = calculateMetrics(item.initialWeight, item.final);
    const isHighLoss = heri > 5.0;
    
    const tr = document.createElement('tr');
    if (isHighLoss) tr.className = 'high-loss';
    
    tr.innerHTML = `
      <td>
        <div style="font-weight: 500; color: var(--text-primary);">${item.name}</div>
      </td>
      <td>
        <div style="font-size: 0.75rem; color: var(--text-muted);">등록: ${item.startDate}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${item.endDate ? '완료: ' + item.endDate : '-'}</div>
      </td>
      <td>
        <span class="badge" style="background-color: #F8FAFC; color: var(--text-secondary); border: 1px solid var(--border-color);">${item.goldType}</span>
      </td>
      <td class="num-col">
        <div style="color: var(--text-secondary); font-size: 0.75rem;">예상: ${formatNum(item.expectedWeight)}</div>
        <div style="font-weight: 500;">초기: ${formatNum(item.initialWeight)}</div>
      </td>
      <td class="num-col">${formatNum(item.casting)}</td>
      <td class="num-col">${formatNum(item.crafting)}</td>
      <td class="num-col">${formatNum(item.final)}</td>
      <td class="num-col highlight-col">${formatNum(loss)}</td>
      <td class="num-col highlight-col">
        ${isHighLoss ? 
          `<span class="badge badge-danger">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ${formatNum(heri)}%
          </span>` : 
          `<span class="badge badge-success">${formatNum(heri)}%</span>`
        }
      </td>
      <td style="display: flex; gap: 0.5rem; align-items: center; border-bottom: none; height: 100%;">
        <button class="edit-btn" onclick="editEntry(${item.id})" title="수정">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button class="delete-btn" onclick="deleteEntry(${item.id})" title="삭제">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  renderPagination(dataArray.length, pageSize, currentPage, paginationContainer, onPageChange);
};

// Render Main View Data
const renderMainData = () => {
  renderTableGeneric(
    ledgerData,
    document.getElementById('ledger-body'),
    mainPage,
    mainPageSize,
    document.getElementById('main-pagination'),
    (page) => { mainPage = page; renderMainData(); }
  );
  updateKPIs(); // Main KPIs (all data)
};

// Update KPIs for given dataset and element prefix
const updateKPIsHelper = (data, prefix) => {
  const stats = {
    '순금': { designs: 0, initial: 0, final: 0 },
    '18K': { designs: 0, initial: 0, final: 0 },
    '14K': { designs: 0, initial: 0, final: 0 }
  };
  
  data.forEach(item => {
    if (stats[item.goldType]) {
      stats[item.goldType].designs++;
      stats[item.goldType].initial += item.initialWeight;
      stats[item.goldType].final += item.final;
    }
  });

  const renderStats = (type, suffix) => {
    const s = stats[type];
    const metric = calculateMetrics(s.initial, s.final);
    
    const dsgnEl = document.getElementById(`${prefix}-dsgn-${suffix}`);
    const initEl = document.getElementById(`${prefix}-init-${suffix}`);
    const lossEl = document.getElementById(`${prefix}-loss-${suffix}`);
    const heriEl = document.getElementById(`${prefix}-heri-${suffix}`);

    if (dsgnEl) dsgnEl.textContent = s.designs;
    if (initEl) initEl.textContent = formatNum(s.initial);
    if (lossEl) lossEl.textContent = formatNum(metric.loss);
    if (heriEl) heriEl.textContent = `${formatNum(metric.heri)}%`;
  };

  renderStats('순금', '순금');
  renderStats('18K', '18k');
  renderStats('14K', '14k');
};

const updateKPIs = () => updateKPIsHelper(ledgerData, 'stat');

// CSV Download
document.getElementById('download-csv').addEventListener('click', () => {
  if (ledgerData.length === 0) return alert('다운로드할 데이터가 없습니다.');
  
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM for Korean support
  csvContent += "디자인 이름,등록일,완료일,금 재질,예상 중량(g),초기 중량(g),주물(g),세공(g),최종 광택(g),총 손실(g),해리율(%)\n";
  
  ledgerData.forEach(item => {
    const { loss, heri } = calculateMetrics(item.initialWeight, item.final);
    const row = [
      `"${item.name}"`,
      `"${item.startDate || ''}"`,
      `"${item.endDate || ''}"`,
      `"${item.goldType}"`,
      item.expectedWeight,
      item.initialWeight,
      item.casting,
      item.crafting,
      item.final,
      formatNum(loss),
      formatNum(heri)
    ].join(",");
    csvContent += row + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `jewelry_loss_data_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// CSV Download for Stats
document.getElementById('download-csv-stats').addEventListener('click', () => {
  const filteredData = getFilteredStatsData();
  if (filteredData.length === 0) return alert('다운로드할 데이터가 없습니다.');
  
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "디자인 이름,등록일,완료일,금 재질,예상 중량(g),초기 중량(g),주물(g),세공(g),최종 광택(g),총 손실(g),해리율(%)\n";
  
  filteredData.forEach(item => {
    const { loss, heri } = calculateMetrics(item.initialWeight, item.final);
    const row = [
      `"${item.name}"`,
      `"${item.startDate || ''}"`,
      `"${item.endDate || ''}"`,
      `"${item.goldType}"`,
      item.expectedWeight,
      item.initialWeight,
      item.casting,
      item.crafting,
      item.final,
      formatNum(loss),
      formatNum(heri)
    ].join(",");
    csvContent += row + "\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `jewelry_loss_stats_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Stats View Logic
const getFilteredStatsData = () => {
  return ledgerData.filter(item => {
    const targetDate = item[filterDateType];
    
    // If the target date (startDate or endDate) is not set, exclude it from search if dates are provided
    // If no dates are provided, we just want to ensure it has the target date type defined
    if (!targetDate) return false;
    
    if (filterStartDate && targetDate < filterStartDate) return false;
    if (filterEndDate && targetDate > filterEndDate) return false;
    
    return true;
  });
};

const updateStatsView = () => {
  const filteredData = getFilteredStatsData();
  
  updateKPIsHelper(filteredData, 'stats');
  
  renderTableGeneric(
    filteredData,
    document.getElementById('stats-ledger-body'),
    statsPage,
    statsPageSize,
    document.getElementById('stats-pagination'),
    (page) => { statsPage = page; updateStatsView(); }
  );
};

document.getElementById('btn-search-stats').addEventListener('click', () => {
  filterDateType = document.getElementById('filter-date-type').value;
  filterStartDate = document.getElementById('filter-start-date').value;
  filterEndDate = document.getElementById('filter-end-date').value;
  statsPage = 1;
  updateStatsView();
});

document.getElementById('stats-page-size').addEventListener('change', (e) => {
  statsPageSize = parseInt(e.target.value, 10);
  statsPage = 1;
  updateStatsView();
});

// Make globals available
window.deleteEntry = deleteEntry;
window.editEntry = editEntry;

// Initial Render
inputStartDate.value = new Date().toISOString().slice(0, 10);
