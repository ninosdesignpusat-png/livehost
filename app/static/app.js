// Frontend Application Logic for LiveHost Pro
// Supports Multi-Brand: Ninos Design, Ratu Hijab, Evollet, Wivi
// Includes Webcam Selfie Capture, Real-Time Timestamp Watermark, Viewers & Sales Tracking

let currentHosts = [];
let currentSchedules = [];
let currentPayrollPreview = null;
let selectedBrand = '';
let currentSelfieData = '';
let webcamStream = null;

// Currency & Date formatting helpers
const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

function getBrandBadgeClass(brand) {
    if (brand === 'Ninos Design') return 'badge-ninos';
    if (brand === 'Ratu Hijab') return 'badge-ratu';
    if (brand === 'Evollet') return 'badge-evollet';
    if (brand === 'Wivi') return 'badge-wivi';
    return 'bg-slate-700 text-white';
}

function updateLiveClock() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
    const fullStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeStr}`;

    const clockEl = document.getElementById('live-clock');
    if (clockEl) clockEl.textContent = timeStr;

    const termClock = document.getElementById('terminal-live-time');
    if (termClock) termClock.textContent = fullStr;
}
setInterval(updateLiveClock, 1000);

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    const btn = document.getElementById(`btn-${tabId}`);
    if (btn) btn.classList.add('active');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function filterByBrand(brand) {
    selectedBrand = brand;
    const label = document.getElementById('active-brand-label');
    if (label) label.textContent = brand || 'Semua Brand';

    document.querySelectorAll('.brand-filter-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-slate-100', 'text-slate-700');
    });

    let activeBtnId = 'brand-btn-all';
    if (brand === 'Ninos Design') activeBtnId = 'brand-btn-ninos';
    else if (brand === 'Ratu Hijab') activeBtnId = 'brand-btn-ratu';
    else if (brand === 'Evollet') activeBtnId = 'brand-btn-evollet';
    else if (brand === 'Wivi') activeBtnId = 'brand-btn-wivi';

    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-100', 'text-slate-700');
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
    }

    renderFilteredSchedules();
}

// Webcam Selfie Functions
async function startWebcam() {
    try {
        const video = document.getElementById('selfie-video');
        const placeholder = document.getElementById('selfie-placeholder');
        const preview = document.getElementById('selfie-img-preview');
        const captureBtn = document.getElementById('btn-capture-selfie');

        webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            audio: false
        });

        video.srcObject = webcamStream;
        video.classList.remove('hidden');
        placeholder.classList.add('hidden');
        preview.classList.add('hidden');
        captureBtn.classList.remove('hidden');
    } catch (err) {
        alert('Tidak dapat mengakses kamera. Silakan gunakan tombol "Unggah Foto" untuk memilih foto selfie.');
    }
}

function captureSelfieSnapshot() {
    const video = document.getElementById('selfie-video');
    const canvas = document.getElementById('selfie-canvas');
    const preview = document.getElementById('selfie-img-preview');
    const badge = document.getElementById('selfie-timestamp-badge');
    const badgeText = document.getElementById('selfie-timestamp-text');

    if (!video || !webcamStream) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Draw video snapshot
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Generate Timestamp & Brand watermark
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const tsStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
    const schedSelect = document.getElementById('clock-schedule-select');
    const selectedText = schedSelect.options[schedSelect.selectedIndex]?.text || '';
    const brandName = selectedText.includes('Ninos') ? 'Ninos Design' : (selectedText.includes('Ratu') ? 'Ratu Hijab' : (selectedText.includes('Evollet') ? 'Evollet' : 'Wivi'));

    // Watermark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 45, canvas.width - 20, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText(`📷 SELFIE ABSENSI: ${tsStr} | Brand: ${brandName}`, 20, canvas.height - 22);

    currentSelfieData = canvas.toDataURL('image/jpeg', 0.85);

    // Stop video stream
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;

    video.classList.add('hidden');
    document.getElementById('btn-capture-selfie').classList.add('hidden');

    preview.src = currentSelfieData;
    preview.classList.remove('hidden');

    badgeText.textContent = `${tsStr} (${brandName})`;
    badge.classList.remove('hidden');
}

function handleSelfieUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('selfie-canvas');
            canvas.width = img.width > 800 ? 800 : img.width;
            canvas.height = Math.round(canvas.width * (img.height / img.width));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Watermark
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const tsStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, canvas.height - 45, canvas.width - 20, 35);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 15px sans-serif';
            ctx.fillText(`📷 SELFIE ABSENSI: ${tsStr}`, 20, canvas.height - 22);

            currentSelfieData = canvas.toDataURL('image/jpeg', 0.85);

            const preview = document.getElementById('selfie-img-preview');
            const placeholder = document.getElementById('selfie-placeholder');
            const video = document.getElementById('selfie-video');
            const badge = document.getElementById('selfie-timestamp-badge');
            const badgeText = document.getElementById('selfie-timestamp-text');

            if (video) video.classList.add('hidden');
            if (placeholder) placeholder.classList.add('hidden');
            preview.src = currentSelfieData;
            preview.classList.remove('hidden');

            badgeText.textContent = tsStr;
            badge.classList.remove('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Initial Data Load
async function initApp() {
    updateLiveClock();
    await loadOverview();
    await loadHosts();
    await loadSchedules();
    await loadPayrolls();
}

// Load Overview
async function loadOverview() {
    try {
        const res = await fetch('/api/overview');
        const data = await res.json();
        document.getElementById('stat-active-hosts').textContent = data.active_hosts || 0;
        document.getElementById('stat-total-schedules').textContent = data.total_schedules || 0;
        document.getElementById('stat-total-hours').textContent = data.total_planned_hours || 0;
        document.getElementById('stat-total-gmv').textContent = formatIDR(data.total_gmv);
        document.getElementById('stat-total-orders').textContent = (data.total_orders || 0).toLocaleString('id-ID');
        document.getElementById('stat-pending-payroll').textContent = formatIDR(data.pending_payroll);
    } catch (e) {
        console.error('Failed to load overview', e);
    }
}

// Load Hosts
async function loadHosts() {
    try {
        const res = await fetch('/api/hosts');
        const data = await res.json();
        currentHosts = data.hosts || [];

        const tbody = document.getElementById('hosts-tbody');
        tbody.innerHTML = '';
        currentHosts.forEach(h => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3.5 font-bold text-slate-800">${h.name}</td>
                <td class="p-3.5 text-slate-600">${h.phone || '-'} <br><span class="text-[11px] text-slate-400">${h.email || ''}</span></td>
                <td class="p-3.5 text-slate-600">${h.platforms}</td>
                <td class="p-3.5">
                    <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${h.tier === 'Star' ? 'bg-amber-100 text-amber-800' : (h.tier === 'Senior' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700')}">
                        ${h.tier}
                    </span>
                </td>
                <td class="p-3.5 font-medium text-slate-800">${formatIDR(h.hourly_rate)} / jam</td>
                <td class="p-3.5 font-medium text-emerald-600">${(h.commission_rate * 100).toFixed(1)}%</td>
                <td class="p-3.5 text-slate-600">${h.bank_name || '-'} <br><span class="text-[11px] font-mono text-slate-500">${h.bank_account || '-'}</span></td>
                <td class="p-3.5">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${h.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                        ${h.status}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Dropdowns
        const schedSelect = document.getElementById('sched-host-id');
        const payrollSelect = document.getElementById('payroll-host-select');
        schedSelect.innerHTML = '';
        payrollSelect.innerHTML = '';

        currentHosts.forEach(h => {
            const opt1 = document.createElement('option');
            opt1.value = h.id;
            opt1.textContent = `${h.name} (${h.tier}) - ${formatIDR(h.hourly_rate)}/jam`;
            schedSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = h.id;
            opt2.textContent = `${h.name} (${h.bank_name || 'Rek'} - ${h.bank_account || '-'})`;
            payrollSelect.appendChild(opt2);
        });

    } catch (e) {
        console.error('Failed to load hosts', e);
    }
}

// Load Schedules
async function loadSchedules() {
    try {
        const res = await fetch('/api/schedules');
        const data = await res.json();
        currentSchedules = data.schedules || [];
        renderFilteredSchedules();
    } catch (e) {
        console.error('Failed to load schedules', e);
    }
}

function renderFilteredSchedules() {
    const filtered = selectedBrand 
        ? currentSchedules.filter(s => (s.brand || 'Ninos Design') === selectedBrand)
        : currentSchedules;

    // Tab 1: Schedules Table
    const schedTbody = document.getElementById('schedules-tbody');
    schedTbody.innerHTML = '';

    // Tab 2: Attendance Table & Terminal Select
    const attTbody = document.getElementById('attendance-tbody');
    const clockSelect = document.getElementById('clock-schedule-select');
    attTbody.innerHTML = '';
    clockSelect.innerHTML = '';

    // Tab 3: Performance Table
    const perfTbody = document.getElementById('performance-tbody');
    perfTbody.innerHTML = '';

    filtered.forEach(s => {
        const brand = s.brand || 'Ninos Design';
        const brandBadge = getBrandBadgeClass(brand);

        let platformBadge = 'bg-slate-800 text-white';
        if (s.platform.includes('TikTok')) platformBadge = 'badge-tiktok';
        else if (s.platform.includes('Shopee')) platformBadge = 'badge-shopee';
        else if (s.platform.includes('Tokopedia')) platformBadge = 'badge-tokopedia';
        else if (s.platform.includes('Instagram')) platformBadge = 'badge-instagram';

        let statusBadge = 'bg-slate-100 text-slate-700';
        if (s.status === 'Completed') statusBadge = 'bg-emerald-100 text-emerald-800';
        else if (s.status === 'In Progress') statusBadge = 'bg-amber-100 text-amber-800 animate-pulse';
        else if (s.status === 'Scheduled') statusBadge = 'bg-indigo-100 text-indigo-800';

        // 1. Row in Schedules
        const sTr = document.createElement('tr');
        sTr.innerHTML = `
            <td class="p-3.5">
                <span class="px-2.5 py-1 rounded text-[11px] font-bold ${brandBadge}">${brand}</span>
            </td>
            <td class="p-3.5">
                <span class="font-bold text-slate-800">${s.scheduled_date}</span>
                <br><span class="text-xs text-slate-500">${s.start_time} - ${s.end_time}</span>
            </td>
            <td class="p-3.5">
                <span class="font-bold text-slate-900">${s.host_name}</span>
                <br><span class="text-[11px] text-slate-500">${formatIDR(s.hourly_rate)}/jam</span>
            </td>
            <td class="p-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${platformBadge}">${s.platform}</span>
                <p class="font-medium text-slate-800 text-xs mt-1">${s.title}</p>
            </td>
            <td class="p-3.5 font-semibold text-slate-700">${s.actual_hours ? s.actual_hours + ' jam (Aktual)' : s.planned_duration_hours + ' jam'}</td>
            <td class="p-3.5 font-bold text-slate-800">${formatIDR(s.target_gmv)}</td>
            <td class="p-3.5">
                <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge}">${s.status}</span>
            </td>
            <td class="p-3.5 text-right space-x-1">
                ${s.status === 'Scheduled' ? `<button onclick="quickClockIn(${s.id})" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded">Clock In</button>` : ''}
                ${s.status === 'In Progress' ? `<button onclick="quickClockOut(${s.id})" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded">Clock Out</button>` : ''}
                ${s.status === 'Completed' ? `<button onclick="openPerfModal(${s.id})" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded">Edit Metrik</button>` : ''}
            </td>
        `;
        schedTbody.appendChild(sTr);

        // 2. Attendance Rows & Select
        if (s.attendance_id || s.status === 'In Progress' || s.status === 'Completed') {
            const aTr = document.createElement('tr');
            const selfieThumb = s.selfie_image 
                ? `<img src="${s.selfie_image}" class="w-10 h-10 object-cover rounded-lg border shadow-sm cursor-pointer" onclick="showSelfiePreview('${s.selfie_image}')">`
                : `<div class="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 text-xs"><i class="fa-solid fa-user"></i></div>`;

            aTr.innerHTML = `
                <td class="p-3">${selfieThumb}</td>
                <td class="p-3 font-semibold text-slate-800">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${brandBadge}">${brand}</span>
                    <br><span class="font-bold">${s.host_name}</span>
                </td>
                <td class="p-3 text-slate-600 font-mono text-[11px]">
                    <span class="text-emerald-700 font-semibold"><i class="fa-regular fa-circle-play mr-1"></i>${s.timestamp_clock_in || s.clock_in || '-'}</span>
                    <br>
                    <span class="text-rose-700 font-semibold"><i class="fa-regular fa-circle-stop mr-1"></i>${s.timestamp_clock_out || s.clock_out || 'Sedang Live...'}</span>
                </td>
                <td class="p-3 font-bold text-slate-800">${s.actual_hours ? s.actual_hours + ' jam' : '-'}</td>
                <td class="p-3">
                    <span class="font-bold text-emerald-600">${formatIDR(s.actual_gmv || s.sales_amount)}</span>
                    <br><span class="text-[11px] text-slate-500">${(s.peak_viewers || s.viewers_count || 0).toLocaleString('id-ID')} viewers • ${s.total_orders || s.orders_count || 0} order</span>
                </td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.validation_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${s.validation_status || 'Pending'}</span></td>
            `;
            attTbody.appendChild(aTr);
        }

        // Populate Clock select options
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `[${brand}] ${s.scheduled_date} ${s.start_time} - ${s.host_name} (${s.status})`;
        clockSelect.appendChild(opt);

        // 3. Performance Rows
        const pTr = document.createElement('tr');
        const gmvAchieved = s.actual_gmv || s.sales_amount || 0;
        const targetGmv = s.target_gmv || 1;
        const pct = Math.min(200, Math.round((gmvAchieved / targetGmv) * 100));

        pTr.innerHTML = `
            <td class="p-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${brandBadge}">${brand}</span>
                <p class="font-bold text-slate-900 text-xs mt-1">${s.title}</p>
                <span class="text-[11px] text-slate-500">${s.platform} • ${s.scheduled_date}</span>
            </td>
            <td class="p-3.5 font-bold text-slate-800">${s.host_name}</td>
            <td class="p-3.5">
                <span class="font-bold text-slate-800">${(s.peak_viewers || s.viewers_count || 0).toLocaleString('id-ID')}</span> peak
                <br><span class="text-slate-400 text-[11px]">${(s.avg_viewers || Math.round((s.viewers_count || 0) * 0.4)).toLocaleString('id-ID')} avg</span>
            </td>
            <td class="p-3.5 font-bold text-indigo-600">${s.total_orders || s.orders_count || 0} order</td>
            <td class="p-3.5 font-bold text-emerald-600 text-sm">${formatIDR(gmvAchieved)}</td>
            <td class="p-3.5 text-slate-600">${formatIDR(s.target_gmv)}</td>
            <td class="p-3.5">
                <div class="flex items-center space-x-2">
                    <div class="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div class="${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'} h-2 rounded-full" style="width: ${pct}%"></div>
                    </div>
                    <span class="font-bold text-xs ${pct >= 100 ? 'text-emerald-600' : 'text-amber-600'}">${pct}%</span>
                </div>
            </td>
            <td class="p-3.5 text-right">
                <button onclick="openPerfModal(${s.id})" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded">
                    <i class="fa-solid fa-pen-to-square mr-1"></i> Input/Edit
                </button>
            </td>
        `;
        perfTbody.appendChild(pTr);
    });

    onScheduleSelectChange();
}

function onScheduleSelectChange() {
    const schedSelect = document.getElementById('clock-schedule-select');
    const scheduleId = schedSelect.value;
    const currentSched = currentSchedules.find(s => String(s.id) === String(scheduleId));

    const metricsBox = document.getElementById('clock-out-metrics-box');
    if (currentSched && currentSched.status === 'In Progress') {
        metricsBox.classList.remove('hidden');
    } else {
        metricsBox.classList.remove('hidden'); // allow inputting on clock out
    }
}

function showSelfiePreview(dataUrl) {
    const w = window.open("");
    w.document.write(`<img src="${dataUrl}" style="max-width:100%;height:auto;display:block;margin:auto;">`);
}

// Attendance Handlers
async function quickClockIn(scheduleId) {
    document.getElementById('clock-schedule-select').value = scheduleId;
    switchTab('tab-absensi');
    window.scrollTo({ top: 300, behavior: 'smooth' });
}

async function quickClockOut(scheduleId) {
    document.getElementById('clock-schedule-select').value = scheduleId;
    switchTab('tab-absensi');
    window.scrollTo({ top: 300, behavior: 'smooth' });
}

async function handleClockIn() {
    const scheduleId = document.getElementById('clock-schedule-select').value;
    const liveLink = document.getElementById('clock-live-link').value;
    if (!scheduleId) return alert('Pilih shift host terlebih dahulu');

    if (!currentSelfieData) {
        if (!confirm('⚠️ Anda belum mengambil foto selfie kehadiran. Lanjutkan Clock-In tanpa selfie?')) {
            return;
        }
    }

    try {
        const res = await fetch('/api/attendance/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule_id: scheduleId,
                selfie_image: currentSelfieData,
                live_link: liveLink
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Clock-In Berhasil Tercatat!\nTimestamp: ${data.timestamp_clock_in}\nKeterlambatan: ${data.late_minutes} Menit`);
            currentSelfieData = '';
            document.getElementById('selfie-img-preview').classList.add('hidden');
            document.getElementById('selfie-placeholder').classList.remove('hidden');
            document.getElementById('selfie-timestamp-badge').classList.add('hidden');
            await loadOverview();
            await loadSchedules();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal melakukan Clock-In');
    }
}

async function handleClockOut() {
    const scheduleId = document.getElementById('clock-schedule-select').value;
    if (!scheduleId) return alert('Pilih shift terlebih dahulu');

    const viewersCount = document.getElementById('clock-out-viewers').value || 0;
    const ordersCount = document.getElementById('clock-out-orders').value || 0;
    const salesAmount = document.getElementById('clock-out-sales').value || 0;

    try {
        const res = await fetch('/api/attendance/clock-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule_id: scheduleId,
                viewers_count: viewersCount,
                orders_count: ordersCount,
                sales_amount: salesAmount,
                selfie_image: currentSelfieData,
                proof_image_url: 'https://sample.url/screenshot.png',
                supervisor_notes: 'Selesai siaran langsung'
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Clock-Out & Data Penjualan Berhasil Disimpan!\nTimestamp: ${data.timestamp_clock_out}\nDurasi Aktual: ${data.actual_hours} Jam\nPenjualan: ${formatIDR(data.sales_amount)} (${data.orders_count} Order)`);
            currentSelfieData = '';
            document.getElementById('selfie-img-preview').classList.add('hidden');
            document.getElementById('selfie-placeholder').classList.remove('hidden');
            document.getElementById('selfie-timestamp-badge').classList.add('hidden');
            await loadOverview();
            await loadSchedules();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal melakukan Clock-Out');
    }
}

// Performance Handlers
function openPerfModal(scheduleId) {
    document.getElementById('perf-schedule-id').value = scheduleId;
    const sched = currentSchedules.find(s => String(s.id) === String(scheduleId));
    if (sched) {
        document.getElementById('perf-peak').value = sched.peak_viewers || sched.viewers_count || '';
        document.getElementById('perf-avg').value = sched.avg_viewers || '';
        document.getElementById('perf-orders').value = sched.total_orders || sched.orders_count || '';
        document.getElementById('perf-actual-gmv').value = sched.actual_gmv || sched.sales_amount || '';
    }
    openModal('modal-perf');
}

async function submitPerformance(event) {
    event.preventDefault();
    const scheduleId = document.getElementById('perf-schedule-id').value;
    const peakViewers = document.getElementById('perf-peak').value;
    const avgViewers = document.getElementById('perf-avg').value;
    const totalOrders = document.getElementById('perf-orders').value;
    const actualGmv = document.getElementById('perf-actual-gmv').value;
    const rating = document.getElementById('perf-rating').value;
    const notes = document.getElementById('perf-notes').value;

    try {
        const res = await fetch('/api/performances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule_id: scheduleId,
                peak_viewers: peakViewers,
                avg_viewers: avgViewers,
                total_orders: totalOrders,
                actual_gmv: actualGmv,
                performance_rating: rating,
                notes: notes
            })
        });
        if (res.ok) {
            closeModal('modal-perf');
            alert('✅ Metrik Performa Penjualan Berhasil Disimpan!');
            await loadOverview();
            await loadSchedules();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal menyimpan performa');
    }
}

// Payroll Handlers
async function calculateHostPayroll() {
    const hostId = document.getElementById('payroll-host-select').value;
    const start = document.getElementById('payroll-start-date').value;
    const end = document.getElementById('payroll-end-date').value;

    try {
        const res = await fetch(`/api/payroll/calculate?host_id=${hostId}&start=${start}&end=${end}`);
        const data = await res.json();
        if (res.ok) {
            currentPayrollPreview = data;
            document.getElementById('prev-sessions').textContent = `${data.total_sessions} sesi`;
            document.getElementById('prev-hours').textContent = `${data.total_hours} jam (@${formatIDR(data.hourly_rate)}/jam)`;
            document.getElementById('prev-base').textContent = formatIDR(data.base_salary);
            document.getElementById('prev-comm').textContent = `+ ${formatIDR(data.commission_bonus)} (${(data.commission_rate * 100).toFixed(1)}% dari GMV ${formatIDR(data.total_gmv)})`;
            document.getElementById('prev-bonus').textContent = `+ ${formatIDR(data.target_incentive)} (${data.target_reached_count} target tembus)`;
            document.getElementById('prev-deduct').textContent = `- ${formatIDR(data.deductions)} (${data.total_late_minutes} menit telat)`;
            document.getElementById('prev-net').textContent = formatIDR(data.net_salary);

            // Brand summary breakdown
            const brandBox = document.getElementById('prev-brand-breakdown');
            brandBox.innerHTML = '<span class="font-bold text-slate-700 block mb-1">Rincian Siaran per Brand:</span>';
            const bSummary = data.brand_summary || {};
            for (const [bName, bData] of Object.entries(bSummary)) {
                brandBox.innerHTML += `
                    <div class="flex justify-between text-slate-600">
                        <span>• ${bName}:</span>
                        <span class="font-medium">${bData.sessions} sesi (${bData.hours} jam) • GMV ${formatIDR(bData.gmv)}</span>
                    </div>
                `;
            }

            document.getElementById('payroll-preview-box').classList.remove('hidden');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal menghitung gaji');
    }
}

async function generateAndSavePayroll() {
    if (!currentPayrollPreview) return;
    try {
        const res = await fetch('/api/payroll/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host_id: currentPayrollPreview.host_id,
                period_start: currentPayrollPreview.period_start,
                period_end: currentPayrollPreview.period_end
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Slip Gaji Berhasil Diterbitkan!\nNo. Slip: #PAY-${data.payroll_id}\nTotal Net: ${formatIDR(data.net_salary)}`);
            document.getElementById('payroll-preview-box').classList.add('hidden');
            await loadOverview();
            await loadPayrolls();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal menyimpan slip gaji');
    }
}

async function loadPayrolls() {
    try {
        const res = await fetch('/api/payrolls');
        const data = await res.json();
        const tbody = document.getElementById('payroll-history-tbody');
        tbody.innerHTML = '';

        (data.payrolls || []).forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="p-3 font-mono font-bold text-slate-800">#PAY-${p.id}</td>
                <td class="p-3">
                    <span class="font-bold text-slate-900">${p.host_name}</span>
                    <br><span class="text-[11px] text-slate-500">${p.bank_name} ${p.bank_account}</span>
                </td>
                <td class="p-3 text-slate-600">${p.period_start} s/d ${p.period_end}</td>
                <td class="p-3 font-extrabold text-indigo-700 text-sm">${formatIDR(p.net_salary)}</td>
                <td class="p-3">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${p.payment_status === 'Paid' ? 'LUNAS / DITRANSFER' : 'MENUNGGU TRANSFER'}
                    </span>
                    ${p.paid_at ? `<br><span class="text-[9px] text-slate-400 font-mono">${p.paid_at}</span>` : ''}
                </td>
                <td class="p-3 text-right">
                    ${p.payment_status !== 'Paid' ? `<button onclick="markAsPaid(${p.id})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-sm text-xs">Bayar Sekarang</button>` : `<span class="text-xs font-semibold text-emerald-600"><i class="fa-solid fa-check-circle mr-1"></i>Selesai</span>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Failed to load payrolls', e);
    }
}

async function markAsPaid(payrollId) {
    const ref = prompt('Masukkan nomor referensi transfer bank (opsional):', `TRX-NINOS-${Date.now().toString().slice(-6)}`);
    if (!ref) return;

    try {
        const res = await fetch('/api/payroll/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payroll_id: payrollId, payment_reference: ref })
        });
        if (res.ok) {
            alert('✅ Status berhasil diubah menjadi Lunas!');
            await loadOverview();
            await loadPayrolls();
        }
    } catch (e) {
        alert('Gagal memperbarui status');
    }
}

// Modal Form Submissions
async function submitNewSchedule(e) {
    e.preventDefault();
    const payload = {
        host_id: document.getElementById('sched-host-id').value,
        brand: document.getElementById('sched-brand').value,
        title: document.getElementById('sched-title').value,
        platform: document.getElementById('sched-platform').value,
        scheduled_date: document.getElementById('sched-date').value,
        start_time: document.getElementById('sched-start').value,
        end_time: document.getElementById('sched-end').value,
        planned_duration_hours: document.getElementById('sched-duration').value,
        target_gmv: document.getElementById('sched-target-gmv').value || 0,
        notes: document.getElementById('sched-notes').value
    };

    try {
        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal('modal-schedule');
            alert(`✅ Jadwal shift untuk brand ${payload.brand} berhasil dibuat!`);
            await loadOverview();
            await loadSchedules();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal membuat jadwal');
    }
}

async function submitNewHost(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('host-name').value,
        phone: document.getElementById('host-phone').value,
        email: document.getElementById('host-email').value,
        tier: document.getElementById('host-tier').value,
        hourly_rate: document.getElementById('host-rate').value,
        commission_rate: document.getElementById('host-commission').value,
        platforms: document.getElementById('host-platforms').value,
        bank_name: document.getElementById('host-bank-name').value,
        bank_account: document.getElementById('host-bank-acc').value
    };

    try {
        const res = await fetch('/api/hosts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal('modal-host');
            alert('✅ Host berhasil didaftarkan!');
            await loadOverview();
            await loadHosts();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Gagal menambahkan host');
    }
}

// On Page Load
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const schedDate = document.getElementById('sched-date');
    if (schedDate) schedDate.value = today;

    initApp();
});
