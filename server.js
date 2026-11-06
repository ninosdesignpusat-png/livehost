/**
 * Node.js Native HTTP Server for LiveHost Pro
 * Zero-dependency: works seamlessly on any Node.js hosting platform (Domainesia, cPanel, Vercel, Render, Railway, etc.)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'livehost_data.json');
// Serve static files from app/static (primary) or static/ (fallback)
const STATIC_DIR = path.join(__dirname, 'app', 'static');
const STATIC_DIR_ALT = path.join(__dirname, 'static');

const SUPPORTED_BRANDS = ["Ninos Design", "Ratu Hijab", "Evollet", "Wivi"];

// Initial seed data
function getDefaultData() {
  return {
    hosts: [
      { id: 1, name: "Nadia Putri", phone: "081234567890", email: "nadia@livehost.id", platforms: "TikTok Live, Shopee Live", hourly_rate: 45000, commission_rate: 0.025, tier: "Senior", bank_name: "BCA", bank_account: "8271928371", status: "Active" },
      { id: 2, name: "Rizky Maulana", phone: "082345678901", email: "rizky@livehost.id", platforms: "TikTok Live", hourly_rate: 35000, commission_rate: 0.015, tier: "Junior", bank_name: "Mandiri", bank_account: "142001928374", status: "Active" },
      { id: 3, name: "Clarissa Salsabila", phone: "083456789012", email: "clarissa@livehost.id", platforms: "Shopee Live, Tokopedia Play", hourly_rate: 50000, commission_rate: 0.03, tier: "Star", bank_name: "BCA", bank_account: "5240192834", status: "Active" },
      { id: 4, name: "Dimas Pratama", phone: "085678901234", email: "dimas@livehost.id", platforms: "TikTok Live, Instagram Live", hourly_rate: 35000, commission_rate: 0.015, tier: "Junior", bank_name: "BRI", bank_account: "034101002345501", status: "Active" }
    ],
    schedules: [
      { id: 1, host_id: 1, brand: "Ninos Design", title: "Morning Fashion Show - Ninos Gamis Syari Exclusive", platform: "TikTok Live", scheduled_date: "2026-11-05", start_time: "09:00", end_time: "12:00", planned_duration_hours: 3.0, target_gmv: 7000000, status: "Completed", notes: "Fokus gamis rayon & printing ninos premium" },
      { id: 2, host_id: 2, brand: "Ratu Hijab", title: "Flash Sale Ratu Hijab - Voal Paris & Silk Pashmina", platform: "Shopee Live", scheduled_date: "2026-11-05", start_time: "13:00", end_time: "16:00", planned_duration_hours: 3.0, target_gmv: 5000000, status: "Completed", notes: "Voucher subsidi ongkir + bundle hemat" },
      { id: 3, host_id: 3, brand: "Evollet", title: "Prime Night Launching - Evollet Outer & Casual Set", platform: "TikTok Live", scheduled_date: "2026-11-05", start_time: "19:00", end_time: "22:00", planned_duration_hours: 3.0, target_gmv: 12000000, status: "Completed", notes: "Model baru launching perkenalan" },
      { id: 4, host_id: 1, brand: "Wivi", title: "Wivi Weekend Flash Sale - Casual Daily Series", platform: "Shopee Live", scheduled_date: "2026-11-06", start_time: "10:00", end_time: "13:00", planned_duration_hours: 3.0, target_gmv: 6000000, status: "In Progress", notes: "Katalog celana kulot & kemeja linen" },
      { id: 5, host_id: 4, brand: "Ninos Design", title: "Night Special - Ninos Design Abaya Glamour", platform: "TikTok Live", scheduled_date: "2026-11-06", start_time: "19:30", end_time: "22:30", planned_duration_hours: 3.0, target_gmv: 8500000, status: "Scheduled", notes: "Etalase 1-10 koleksi pesta" }
    ],
    attendances: [
      { id: 1, schedule_id: 1, host_id: 1, clock_in: "2026-11-05 08:55:00", clock_out: "2026-11-05 12:05:00", timestamp_clock_in: "2026-11-05 08:55:12 WIB", timestamp_clock_out: "2026-11-05 12:05:44 WIB", selfie_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23881337'/><circle cx='60' cy='45' r='25' fill='%23ffffff'/><circle cx='60' cy='110' r='45' fill='%23ffffff'/><text x='60' y='115' font-size='9' fill='%23881337' text-anchor='middle' font-family='sans-serif'>SELFIE NINOS</text></svg>", actual_hours: 3.17, live_link: "https://tiktok.com/@ninosdesign/live", viewers_count: 1450, orders_count: 168, sales_amount: 7850000, validation_status: "Approved", late_minutes: 0, supervisor_notes: "Selfie terverifikasi di studio Ninos" },
      { id: 2, schedule_id: 2, host_id: 2, clock_in: "2026-11-05 13:04:00", clock_out: "2026-11-05 16:02:00", timestamp_clock_in: "2026-11-05 13:04:20 WIB", timestamp_clock_out: "2026-11-05 16:02:15 WIB", selfie_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23115e59'/><circle cx='60' cy='45' r='25' fill='%23ffffff'/><circle cx='60' cy='110' r='45' fill='%23ffffff'/><text x='60' y='115' font-size='9' fill='%23115e59' text-anchor='middle' font-family='sans-serif'>SELFIE RATU</text></svg>", actual_hours: 2.97, live_link: "https://shopee.co.id/live/ratuhijab", viewers_count: 890, orders_count: 92, sales_amount: 5300000, validation_status: "Approved", late_minutes: 4, supervisor_notes: "Selfie di ruang live Ratu Hijab" },
      { id: 3, schedule_id: 3, host_id: 3, clock_in: "2026-11-05 18:52:00", clock_out: "2026-11-05 22:15:00", timestamp_clock_in: "2026-11-05 18:52:50 WIB", timestamp_clock_out: "2026-11-05 22:15:30 WIB", selfie_image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%233730a3'/><circle cx='60' cy='45' r='25' fill='%23ffffff'/><circle cx='60' cy='110' r='45' fill='%23ffffff'/><text x='60' y='115' font-size='9' fill='%233730a3' text-anchor='middle' font-family='sans-serif'>SELFIE EVOLLET</text></svg>", actual_hours: 3.38, live_link: "https://tiktok.com/@evollet/live", viewers_count: 2980, orders_count: 245, sales_amount: 14200000, validation_status: "Approved", late_minutes: 0, supervisor_notes: "Selfie studio Evollet" }
    ],
    performances: [
      { id: 1, schedule_id: 1, host_id: 1, peak_viewers: 1450, avg_viewers: 520, total_orders: 168, actual_gmv: 7850000, target_gmv: 7000000, target_reached: 1, conversion_rate: 11.58, performance_rating: 4.9, notes: "Ninos Design: Target tembus 112%!" },
      { id: 2, schedule_id: 2, host_id: 2, peak_viewers: 890, avg_viewers: 340, total_orders: 92, actual_gmv: 5300000, target_gmv: 5000000, target_reached: 1, conversion_rate: 10.33, performance_rating: 4.5, notes: "Ratu Hijab: Target tercapai 106%." },
      { id: 3, schedule_id: 3, host_id: 3, peak_viewers: 2980, avg_viewers: 1150, total_orders: 245, actual_gmv: 14200000, target_gmv: 12000000, target_reached: 1, conversion_rate: 8.22, performance_rating: 5.0, notes: "Evollet: Meledak 118%!" }
    ],
    payrolls: [
      { id: 1, host_id: 1, period_start: "2026-11-01", period_end: "2026-11-07", total_sessions: 1, total_hours: 3.17, hourly_rate: 45000, base_salary: 142650, total_gmv: 7850000, commission_bonus: 196250, target_incentive: 50000, deductions: 0, net_salary: 388900, payment_status: "Paid", paid_at: "2026-11-06 10:00:00", payment_reference: "TRX-NINOS-20261106-001" }
    ]
  };
}

// In-memory cache: used if disk is read-only
let _memCache = null;

function loadData() {
  // Try disk first
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(content);
      // Validate it has hosts
      if (parsed && Array.isArray(parsed.hosts) && parsed.hosts.length > 0) {
        _memCache = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('loadData error:', e.message);
  }
  // Fall back to in-memory cache or defaults
  if (!_memCache) {
    _memCache = getDefaultData();
    // Try to persist to disk
    try { fs.writeFileSync(DB_FILE, JSON.stringify(_memCache, null, 2), 'utf8'); } catch(e) {}
  }
  return _memCache;
}

function saveData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    _memCache = data; // keep memory in sync
  } catch (e) {
    console.error('Error saving DB_FILE (read-only disk?), using in-memory only:', e.message);
    _memCache = data; // at least keep in memory for this session
  }
}

// Helper to send JSON
function sendJSON(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

// Request Handler
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // 1. Serve Static Frontend Files
  if (req.method === 'GET') {
    if (pathname === '/' || pathname === '/index.html') {
      // Try app/static first, then static/
      let filePath = path.join(STATIC_DIR, 'index.html');
      if (!fs.existsSync(filePath)) filePath = path.join(STATIC_DIR_ALT, 'index.html');
      if (fs.existsSync(filePath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(filePath).pipe(res);
      }
    } else if (pathname.startsWith('/static/') || pathname.startsWith('/app/static/')) {
      const rel = pathname.replace(/^\/(app\/)?static\//, '');
      let filePath = path.join(STATIC_DIR, rel);
      if (!fs.existsSync(filePath)) filePath = path.join(STATIC_DIR_ALT, rel);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        let cType = 'text/plain';
        if (filePath.endsWith('.css')) cType = 'text/css';
        else if (filePath.endsWith('.js')) cType = 'application/javascript';
        else if (filePath.endsWith('.html')) cType = 'text/html';
        res.writeHead(200, { 'Content-Type': cType });
        return fs.createReadStream(filePath).pipe(res);
      }
    }
  }

  // 2. REST API Endpoints
  const db = loadData();

  if (req.method === 'GET') {
    if (pathname === '/api/brands') {
      return sendJSON(res, { brands: SUPPORTED_BRANDS });
    }

    if (pathname === '/api/overview') {
      const active_hosts = db.hosts.filter(h => h.status === 'Active').length;
      const total_schedules = db.schedules.length;
      const total_planned_hours = db.schedules.reduce((acc, s) => acc + (s.planned_duration_hours || 0), 0);
      const total_gmv = db.performances.reduce((acc, p) => acc + (p.actual_gmv || 0), 0);
      const total_orders = db.performances.reduce((acc, p) => acc + (p.total_orders || 0), 0);
      const pending_payroll = db.payrolls.filter(p => p.payment_status === 'Pending').reduce((acc, p) => acc + (p.net_salary || 0), 0);

      // Brand stats
      const brandStatsMap = {};
      SUPPORTED_BRANDS.forEach(b => { brandStatsMap[b] = { brand: b, total_shifts: 0, brand_gmv: 0 }; });
      db.schedules.forEach(s => {
        const b = s.brand || 'Ninos Design';
        if (!brandStatsMap[b]) brandStatsMap[b] = { brand: b, total_shifts: 0, brand_gmv: 0 };
        brandStatsMap[b].total_shifts++;
        const perf = db.performances.find(p => p.schedule_id === s.id);
        if (perf) brandStatsMap[b].brand_gmv += (perf.actual_gmv || 0);
      });

      return sendJSON(res, {
        active_hosts,
        total_schedules,
        total_planned_hours: Math.round(total_planned_hours * 10) / 10,
        total_gmv,
        total_orders,
        pending_payroll,
        brand_stats: Object.values(brandStatsMap)
      });
    }

    if (pathname === '/api/hosts') {
      return sendJSON(res, { hosts: db.hosts });
    }

    if (pathname === '/api/schedules') {
      const { date, platform, host_id, brand } = parsed.query;
      let list = db.schedules.map(s => {
        const host = db.hosts.find(h => h.id === s.host_id) || {};
        const att = db.attendances.find(a => a.schedule_id === s.id) || {};
        const perf = db.performances.find(p => p.schedule_id === s.id) || {};
        return {
          ...s,
          host_name: host.name || 'Unknown',
          host_phone: host.phone || '',
          hourly_rate: host.hourly_rate || 35000,
          attendance_id: att.id || null,
          clock_in: att.clock_in || null,
          clock_out: att.clock_out || null,
          timestamp_clock_in: att.timestamp_clock_in || null,
          timestamp_clock_out: att.timestamp_clock_out || null,
          selfie_image: att.selfie_image || null,
          viewers_count: att.viewers_count || perf.peak_viewers || 0,
          orders_count: att.orders_count || perf.total_orders || 0,
          sales_amount: att.sales_amount || perf.actual_gmv || 0,
          actual_hours: att.actual_hours || null,
          validation_status: att.validation_status || 'Pending',
          late_minutes: att.late_minutes || 0,
          performance_id: perf.id || null,
          peak_viewers: perf.peak_viewers || att.viewers_count || 0,
          avg_viewers: perf.avg_viewers || 0,
          total_orders: perf.total_orders || att.orders_count || 0,
          actual_gmv: perf.actual_gmv || att.sales_amount || 0,
          target_reached: perf.target_reached || 0
        };
      });

      if (date) list = list.filter(s => s.scheduled_date === date);
      if (platform) list = list.filter(s => s.platform === platform);
      if (host_id) list = list.filter(s => String(s.host_id) === String(host_id));
      if (brand) list = list.filter(s => s.brand === brand);

      return sendJSON(res, { schedules: list });
    }

    if (pathname === '/api/payroll/calculate') {
      const hostId = parseInt(parsed.query.host_id || '0');
      const start = parsed.query.start || '2026-11-01';
      const end = parsed.query.end || '2026-11-30';

      const host = db.hosts.find(h => h.id === hostId);
      if (!host) return sendJSON(res, { error: 'Host not found' }, 400);

      const completed = db.schedules.filter(s => 
        s.host_id === hostId && 
        s.status === 'Completed' &&
        s.scheduled_date >= start && 
        s.scheduled_date <= end
      );

      const sessions = completed.map(s => {
        const att = db.attendances.find(a => a.schedule_id === s.id) || {};
        const perf = db.performances.find(p => p.schedule_id === s.id) || {};
        return {
          schedule_id: s.id,
          brand: s.brand || 'Ninos Design',
          title: s.title,
          scheduled_date: s.scheduled_date,
          platform: s.platform,
          planned_duration_hours: s.planned_duration_hours,
          actual_hours: att.actual_hours || s.planned_duration_hours,
          late_minutes: att.late_minutes || 0,
          actual_gmv: perf.actual_gmv || att.sales_amount || 0,
          target_reached: perf.target_reached || 0,
          total_orders: perf.total_orders || att.orders_count || 0
        };
      });

      const total_sessions = sessions.length;
      const total_hours = Math.round(sessions.reduce((acc, s) => acc + s.actual_hours, 0) * 100) / 100;
      const base_salary = Math.round(total_hours * host.hourly_rate);
      const total_gmv = sessions.reduce((acc, s) => acc + s.actual_gmv, 0);
      const commission_bonus = Math.round(total_gmv * host.commission_rate);
      const target_reached_count = sessions.filter(s => s.target_reached === 1).length;
      const target_incentive = target_reached_count * 50000;
      const total_late_minutes = sessions.reduce((acc, s) => acc + s.late_minutes, 0);
      const deductions = Math.floor(total_late_minutes / 15) * 10000;
      const net_salary = Math.max(0, base_salary + commission_bonus + target_incentive - deductions);

      const brand_summary = {};
      sessions.forEach(s => {
        const b = s.brand || 'Ninos Design';
        if (!brand_summary[b]) brand_summary[b] = { sessions: 0, hours: 0, gmv: 0 };
        brand_summary[b].sessions++;
        brand_summary[b].hours = Math.round((brand_summary[b].hours + s.actual_hours) * 100) / 100;
        brand_summary[b].gmv += s.actual_gmv;
      });

      return sendJSON(res, {
        host_id: host.id,
        host_name: host.name,
        tier: host.tier,
        bank_name: host.bank_name,
        bank_account: host.bank_account,
        period_start: start,
        period_end: end,
        total_sessions,
        total_hours,
        hourly_rate: host.hourly_rate,
        base_salary,
        total_gmv,
        commission_rate: host.commission_rate,
        commission_bonus,
        target_reached_count,
        target_incentive,
        total_late_minutes,
        deductions,
        net_salary,
        brand_summary,
        sessions
      });
    }

    if (pathname === '/api/payrolls') {
      const list = db.payrolls.map(p => {
        const host = db.hosts.find(h => h.id === p.host_id) || {};
        return {
          ...p,
          host_name: host.name || 'Unknown',
          bank_name: host.bank_name || '',
          bank_account: host.bank_account || ''
        };
      });
      return sendJSON(res, { payrolls: list.reverse() });
    }
  }

  // 3. POST Endpoints
  if (req.method === 'POST') {
    let bodyRaw = '';
    req.on('data', chunk => { bodyRaw += chunk; });
    req.on('end', () => {
      let body = {};
      try { if (bodyRaw) body = JSON.parse(bodyRaw); } catch (e) {}

      if (pathname === '/api/hosts') {
        const newHost = {
          id: db.hosts.length > 0 ? Math.max(...db.hosts.map(h => h.id)) + 1 : 1,
          name: body.name,
          phone: body.phone || '',
          email: body.email || '',
          platforms: body.platforms || 'TikTok Live',
          hourly_rate: parseFloat(body.hourly_rate || 35000),
          commission_rate: parseFloat(body.commission_rate || 0.02),
          tier: body.tier || 'Junior',
          bank_name: body.bank_name || '',
          bank_account: body.bank_account || '',
          status: 'Active'
        };
        db.hosts.push(newHost);
        saveData(db);
        return sendJSON(res, { message: 'Host created', id: newHost.id }, 201);
      }

      if (pathname === '/api/schedules') {
        const newSched = {
          id: db.schedules.length > 0 ? Math.max(...db.schedules.map(s => s.id)) + 1 : 1,
          host_id: parseInt(body.host_id),
          brand: body.brand || 'Ninos Design',
          title: body.title,
          platform: body.platform,
          scheduled_date: body.scheduled_date,
          start_time: body.start_time,
          end_time: body.end_time,
          planned_duration_hours: parseFloat(body.planned_duration_hours),
          target_gmv: parseFloat(body.target_gmv || 0),
          status: 'Scheduled',
          notes: body.notes || ''
        };
        db.schedules.push(newSched);
        saveData(db);
        return sendJSON(res, { message: 'Schedule created', id: newSched.id }, 201);
      }

      if (pathname === '/api/attendance/clock-in') {
        const scheduleId = parseInt(body.schedule_id);
        const sched = db.schedules.find(s => s.id === scheduleId);
        if (!sched) return sendJSON(res, { error: 'Schedule not found' }, 404);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const tsStr = `${nowStr} WIB`;

        let lateMinutes = 0;
        try {
          const schedDt = new Date(`${sched.scheduled_date}T${sched.start_time}:00`);
          const diff = Math.floor((now - schedDt) / 60000);
          if (diff > 0) lateMinutes = diff;
        } catch (e) {}

        let att = db.attendances.find(a => a.schedule_id === scheduleId);
        if (att) {
          att.clock_in = nowStr;
          att.timestamp_clock_in = tsStr;
          if (body.selfie_image) att.selfie_image = body.selfie_image;
          att.live_link = body.live_link || att.live_link;
          att.late_minutes = lateMinutes;
        } else {
          att = {
            id: db.attendances.length > 0 ? Math.max(...db.attendances.map(a => a.id)) + 1 : 1,
            schedule_id: scheduleId,
            host_id: sched.host_id,
            clock_in: nowStr,
            clock_out: null,
            timestamp_clock_in: tsStr,
            timestamp_clock_out: null,
            selfie_image: body.selfie_image || null,
            actual_hours: 0,
            live_link: body.live_link || '',
            validation_status: 'Pending',
            late_minutes: lateMinutes
          };
          db.attendances.push(att);
        }

        sched.status = 'In Progress';
        saveData(db);
        return sendJSON(res, {
          attendance_id: att.id,
          clock_in: nowStr,
          timestamp_clock_in: tsStr,
          late_minutes: lateMinutes,
          has_selfie: !!body.selfie_image
        });
      }

      if (pathname === '/api/attendance/clock-out') {
        const scheduleId = parseInt(body.schedule_id);
        const sched = db.schedules.find(s => s.id === scheduleId);
        const att = db.attendances.find(a => a.schedule_id === scheduleId);
        if (!att || !att.clock_in) return sendJSON(res, { error: 'Belum clock-in' }, 400);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const tsStr = `${nowStr} WIB`;

        let durationHours = sched.planned_duration_hours || 3.0;
        try {
          const inDt = new Date(att.clock_in.replace(' ', 'T'));
          const diffMs = now - inDt;
          durationHours = Math.round(Math.max(0.1, diffMs / 3600000) * 100) / 100;
        } catch (e) {}

        const viewers = parseInt(body.viewers_count || 0);
        const orders = parseInt(body.orders_count || 0);
        const sales = parseFloat(body.sales_amount || 0);

        att.clock_out = nowStr;
        att.timestamp_clock_out = tsStr;
        att.actual_hours = durationHours;
        att.viewers_count = viewers;
        att.orders_count = orders;
        att.sales_amount = sales;
        if (body.selfie_image) att.selfie_image = body.selfie_image;
        att.validation_status = 'Approved';

        sched.status = 'Completed';

        // Update performance
        if (viewers > 0 || orders > 0 || sales > 0) {
          const target = sched.target_gmv || 0;
          const targetReached = (sales >= target && target > 0) ? 1 : 0;
          const convRate = viewers > 0 ? Math.round((orders / viewers) * 10000) / 100 : 0;

          let perf = db.performances.find(p => p.schedule_id === scheduleId);
          if (perf) {
            perf.peak_viewers = viewers;
            perf.avg_viewers = Math.floor(viewers * 0.4);
            perf.total_orders = orders;
            perf.actual_gmv = sales;
            perf.target_reached = targetReached;
            perf.conversion_rate = convRate;
          } else {
            perf = {
              id: db.performances.length > 0 ? Math.max(...db.performances.map(p => p.id)) + 1 : 1,
              schedule_id: scheduleId,
              host_id: sched.host_id,
              peak_viewers: viewers,
              avg_viewers: Math.floor(viewers * 0.4),
              total_orders: orders,
              actual_gmv: sales,
              target_gmv: target,
              target_reached: targetReached,
              conversion_rate: convRate,
              performance_rating: 5.0
            };
            db.performances.push(perf);
          }
        }

        saveData(db);
        return sendJSON(res, {
          attendance_id: att.id,
          clock_out: nowStr,
          timestamp_clock_out: tsStr,
          actual_hours: durationHours,
          viewers_count: viewers,
          orders_count: orders,
          sales_amount: sales
        });
      }

      if (pathname === '/api/performances') {
        const scheduleId = parseInt(body.schedule_id);
        const sched = db.schedules.find(s => s.id === scheduleId);
        if (!sched) return sendJSON(res, { error: 'Schedule not found' }, 404);

        const viewers = parseInt(body.peak_viewers || 0);
        const avg = parseInt(body.avg_viewers || Math.floor(viewers * 0.4));
        const orders = parseInt(body.total_orders || 0);
        const sales = parseFloat(body.actual_gmv || 0);
        const target = sched.target_gmv || 0;
        const reached = (sales >= target && target > 0) ? 1 : 0;
        const conv = viewers > 0 ? Math.round((orders / viewers) * 10000) / 100 : 0;

        let perf = db.performances.find(p => p.schedule_id === scheduleId);
        if (perf) {
          perf.peak_viewers = viewers;
          perf.avg_viewers = avg;
          perf.total_orders = orders;
          perf.actual_gmv = sales;
          perf.target_reached = reached;
          perf.conversion_rate = conv;
          perf.performance_rating = parseFloat(body.performance_rating || 5.0);
          perf.notes = body.notes || '';
        } else {
          perf = {
            id: db.performances.length > 0 ? Math.max(...db.performances.map(p => p.id)) + 1 : 1,
            schedule_id: scheduleId,
            host_id: sched.host_id,
            peak_viewers: viewers,
            avg_viewers: avg,
            total_orders: orders,
            actual_gmv: sales,
            target_gmv: target,
            target_reached: reached,
            conversion_rate: conv,
            performance_rating: parseFloat(body.performance_rating || 5.0),
            notes: body.notes || ''
          };
          db.performances.push(perf);
        }

        saveData(db);
        return sendJSON(res, {
          performance_id: perf.id,
          target_reached: !!reached,
          conversion_rate: conv,
          actual_gmv: sales
        });
      }

      if (pathname === '/api/payroll/generate') {
        const hostId = parseInt(body.host_id);
        const start = body.period_start;
        const end = body.period_end;

        const host = db.hosts.find(h => h.id === hostId);
        if (!host) return sendJSON(res, { error: 'Host not found' }, 404);

        const completed = db.schedules.filter(s => 
          s.host_id === hostId && 
          s.status === 'Completed' &&
          s.scheduled_date >= start && 
          s.scheduled_date <= end
        );

        let totalHours = 0;
        let totalGmv = 0;
        let targetReachedCount = 0;
        let totalLate = 0;

        completed.forEach(s => {
          const att = db.attendances.find(a => a.schedule_id === s.id) || {};
          const perf = db.performances.find(p => p.schedule_id === s.id) || {};
          totalHours += (att.actual_hours || s.planned_duration_hours || 0);
          totalGmv += (perf.actual_gmv || att.sales_amount || 0);
          if (perf.target_reached === 1) targetReachedCount++;
          totalLate += (att.late_minutes || 0);
        });

        totalHours = Math.round(totalHours * 100) / 100;
        const baseSalary = Math.round(totalHours * host.hourly_rate);
        const commission = Math.round(totalGmv * host.commission_rate);
        const incentive = targetReachedCount * 50000;
        const deductions = Math.floor(totalLate / 15) * 10000;
        const netSalary = Math.max(0, baseSalary + commission + incentive - deductions);

        const newPayroll = {
          id: db.payrolls.length > 0 ? Math.max(...db.payrolls.map(p => p.id)) + 1 : 1,
          host_id: hostId,
          period_start: start,
          period_end: end,
          total_sessions: completed.length,
          total_hours: totalHours,
          hourly_rate: host.hourly_rate,
          base_salary: baseSalary,
          total_gmv: totalGmv,
          commission_bonus: commission,
          target_incentive: incentive,
          deductions: deductions,
          net_salary: netSalary,
          payment_status: 'Pending'
        };

        db.payrolls.push(newPayroll);
        saveData(db);
        return sendJSON(res, newPayroll, 201);
      }

      if (pathname === '/api/payroll/pay') {
        const pId = parseInt(body.payroll_id);
        const payroll = db.payrolls.find(p => p.id === pId);
        if (!payroll) return sendJSON(res, { error: 'Payroll not found' }, 404);

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        payroll.payment_status = 'Paid';
        payroll.paid_at = nowStr;
        payroll.payment_reference = body.payment_reference || 'TRX-MANUAL';

        saveData(db);
        return sendJSON(res, { payroll_id: pId, status: 'Paid', paid_at: nowStr });
      }

      sendJSON(res, { error: 'Endpoint not found' }, 404);
    });
    return;
  }

  sendJSON(res, { error: 'Not found' }, 404);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LiveHost Pro Node.js Server running on port ${PORT}`);
  console.log(`📂 Static files from: ${STATIC_DIR}`);
  // Warm up: load data on startup
  const db = loadData();
  console.log(`✅ Data loaded: ${db.hosts.length} hosts, ${db.schedules.length} schedules`);
});
