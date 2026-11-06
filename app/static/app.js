// Frontend Application Logic for LiveHost Pro

let currentHosts = [];
let currentSchedules = [];
let currentPayrollPreview = null;

// Currency & Date formatting helpers
const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

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

// Initial Data Load
async function initApp() {
    await loadOverview();
    await loadHosts();
    await loadSchedules();
    await loadPayrolls();
}

// Load Top Overview Stats
async function loadOverview() {
    try {
        const res = await fetch('/api/overview');
        const data = await res.json();
        document.getElementById('stat-active-hosts').textContent = data.active_hosts || 0;
        document.getElementById('stat-total-schedules').textContent = data.total_schedules || 0;
        document.getElementById('stat-total-hours').textContent = data.total_planned_hours || 0;
        document.getElementById('stat-total-gmv').textContent = formatIDR(data.total_gmv);
        document.getElementById('stat-total-orders').textContent = data.total_orders || 0;
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

        // Populate host table
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

        // Populate host dropdowns
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

// Load Schedules & populate Tab 1, 2, 3
async function loadSchedules() {
    try {
        const res = await fetch('/api/schedules');
        const data = await res.json();
        currentSchedules = data.schedules || [];

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

        currentSchedules.forEach(s => {
            // Platform badge class
            let platformBadge = 'bg-slate-800 text-white';
            if (s.platform.includes('TikTok')) platformBadge = 'badge-tiktok';
            else if (s.platform.includes('Shopee')) platformBadge = 'badge-shopee';
            else if (s.platform.includes('Tokopedia')) platformBadge = 'badge-tokopedia';
            else if (s.platform.includes('Instagram')) platformBadge = 'badge-instagram';

            // Schedule Status Badge
            let statusBadge = 'bg-slate-100 text-slate-700';
            if (s.status === 'Completed') statusBadge = 'bg-emerald-100 text-emerald-800';
            else if (s.status === 'In Progress') statusBadge = 'bg-amber-100 text-amber-800 animate-pulse';
            else if (s.status === 'Scheduled') statusBadge = 'bg-indigo-100 text-indigo-800';

            // 1. Row in Schedules
            const sTr = document.createElement('tr');
            sTr.innerHTML = `
                <td class="p-3.5">
                    <span class="font-bold text-slate-800">${s.scheduled_date}</span>
                    <br><span class="text-xs text-slate-500">${s.start_time} - ${s.end_time}</span>
                </td>
                <td class="p-3.5">
                    <span class="font-bold text-slate-900">${s.host_name}</span>
                    <br><span class="text-[11px] text-slate-500">${formatIDR(s.hourly_rate)}/jam</span>
                </td>
                <td class="p-3.5">
                    <span class="px-2 py-0.5 rounded text-[11px] font-bold ${platformBadge}">${s.platform}</span>
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
                    ${s.status === 'Completed' ? `<button onclick="openPerfModal(${s.id})" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded">Input Metrik</button>` : ''}
                </td>
            `;
            schedTbody.appendChild(sTr);

            // 2. Attendance Rows & Select
            if (s.attendance_id || s.status === 'In Progress' || s.status === 'Completed') {
                const aTr = document.createElement('tr');
                aTr.innerHTML = `
                    <td class="p-3 font-semibold text-slate-800">${s.host_name}<br><span class="text-[10px] text-slate-400">${s.platform}</span></td>
                    <td class="p-3 font-mono">${s.clock_in ? s.clock_in.split(' ')[1] : '-'}</td>
                    <td class="p-3 font-mono">${s.clock_out ? s.clock_out.split(' ')[1] : '-'}</td>
                    <td class="p-3 font-bold text-slate-800">${s.actual_hours ? s.actual_hours + ' jam' : '-'}</td>
                    <td class="p-3 ${s.late_minutes > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}">${s.late_minutes > 0 ? s.late_minutes + ' mnt telat' : 'Tepat Waktu'}</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.validation_status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${s.validation_status || 'Pending'}</span></td>
                `;
                attTbody.appendChild(aTr);
            }

            // Populate Clock select options
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `[${s.scheduled_date} ${s.start_time}] ${s.host_name} - ${s.platform} (${s.status})`;
            clockSelect.appendChild(opt);

            // 3. Performance Rows
            const pTr = document.createElement('tr');
            const gmvAchieved = s.actual_gmv || 0;
            const targetGmv = s.target_gmv || 1;
            const pct = Math.min(200, Math.round((gmvAchieved / targetGmv) * 100));

            pTr.innerHTML = `
                <td class="p-3.5">
                    <span class="font-bold text-slate-900">${s.host_name}</span>
                    <br><span class="text-xs text-slate-500">${s.title} (${s.platform})</span>
                </td>
                <td class="p-3.5">
                    <span class="font-bold text-slate-800">${s.peak_viewers ? s.peak_viewers.toLocaleString('id-ID') : '-'}</span> peak
                    <br><span class="text-slate-400 text-[11px]">${s.avg_viewers ? s.avg_viewers.toLocaleString('id-ID') : '-'} avg</span>
                </td>
                <td class="p-3.5 font-bold text-indigo-600">${s.total_orders || 0} order</td>
                <td class="p-3.5 font-bold text-emerald-600 text-sm">${formatIDR(s.actual_gmv)}</td>
                <td class="p-3.5 text-slate-600">${formatIDR(s.target_gmv)}</td>
                <td class="p-3.5">
                    <div class="flex items-center space-x-2">
                        <div class="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
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

    } catch (e) {
        console.error('Failed to load schedules', e);
    }
}

// Attendance Handlers
async function quickClockIn(scheduleId) {
    document.getElementById('clock-schedule-select').value = scheduleId;
    switchTab('tab-absensi');
    await handleClockIn();
}

async function quickClockOut(scheduleId) {
    document.getElementById('clock-schedule-select').value = scheduleId;
    switchTab('tab-absensi');
    await handleClockOut();
}

async function handleClockIn() {
    const scheduleId = document.getElementById('clock-schedule-select').value;
    const liveLink = document.getElementById('clock-live-link').value;
    if (!scheduleId) return alert('Pilih shift terlebih dahulu');

    try {
        const res = await fetch('/api/attendance/clock-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule_id: scheduleId, live_link: liveLink })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Clock-In Berhasil!\nWaktu: ${data.clock_in}\nKeterlambatan: ${data.late_minutes} menit`);
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

    try {
        const res = await fetch('/api/attendance/clock-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                schedule_id: scheduleId,
                proof_image_url: 'https://sample.url/screenshot.png',
                supervisor_notes: 'Selesai siaran langsung'
            })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Clock-Out Berhasil!\nWaktu: ${data.clock_out}\nDurasi Aktual: ${data.actual_hours} Jam`);
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
            alert('✅ Performa Berhasil Disimpan!');
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
    const ref = prompt('Masukkan nomor referensi transfer bank (opsional):', `TRX-${Date.now().toString().slice(-6)}`);
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
            alert('✅ Jadwal shift berhasil dibuat!');
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
            alert('✅ Host berhasil ditambahkan!');
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
    // Default date input to today
    const today = new Date().toISOString().split('T')[0];
    const schedDate = document.getElementById('sched-date');
    if (schedDate) schedDate.value = today;

    initApp();
});
