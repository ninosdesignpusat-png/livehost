"""
Database connection and schema setup for HostLive Management System.
Uses SQLite for lightweight, zero-dependency data storage.
"""

import os
import sqlite3
from datetime import datetime

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hostlive.db")


def get_db_connection(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path=None):
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Hosts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hosts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        platforms TEXT DEFAULT 'TikTok Live, Shopee Live',
        hourly_rate REAL DEFAULT 35000.0,
        commission_rate REAL DEFAULT 0.02,
        tier TEXT DEFAULT 'Junior',
        bank_name TEXT,
        bank_account TEXT,
        status TEXT DEFAULT 'Active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 2. Schedules Table (Jadwal Shift)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        platform TEXT NOT NULL,
        scheduled_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        planned_duration_hours REAL NOT NULL,
        target_gmv REAL DEFAULT 0.0,
        status TEXT DEFAULT 'Scheduled',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
    """)

    # 3. Attendance Table (Absensi & Jam Nyata)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER UNIQUE NOT NULL,
        host_id INTEGER NOT NULL,
        clock_in TEXT,
        clock_out TEXT,
        actual_hours REAL DEFAULT 0.0,
        live_link TEXT,
        proof_image_url TEXT,
        validation_status TEXT DEFAULT 'Pending',
        late_minutes INTEGER DEFAULT 0,
        supervisor_notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
    """)

    # 4. Performances Table (Tracking Metrik Sesi)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS performances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER UNIQUE NOT NULL,
        host_id INTEGER NOT NULL,
        peak_viewers INTEGER DEFAULT 0,
        avg_viewers INTEGER DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        actual_gmv REAL DEFAULT 0.0,
        target_gmv REAL DEFAULT 0.0,
        target_reached INTEGER DEFAULT 0,
        conversion_rate REAL DEFAULT 0.0,
        performance_rating REAL DEFAULT 5.0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
    """)

    # 5. Payrolls Table (Penggajian Part-Time)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payrolls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        total_sessions INTEGER DEFAULT 0,
        total_hours REAL DEFAULT 0.0,
        hourly_rate REAL DEFAULT 0.0,
        base_salary REAL DEFAULT 0.0,
        total_gmv REAL DEFAULT 0.0,
        commission_bonus REAL DEFAULT 0.0,
        target_incentive REAL DEFAULT 0.0,
        deductions REAL DEFAULT 0.0,
        net_salary REAL DEFAULT 0.0,
        payment_status TEXT DEFAULT 'Pending',
        paid_at TEXT,
        payment_reference TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()


def seed_sample_data(db_path=None):
    """Seed initial realistic sample data for Indonesian Live Shopping."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM hosts")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Seed Hosts
    sample_hosts = [
        ("Nadia Putri", "081234567890", "nadia@livehost.id", "TikTok Live, Shopee Live", 45000.0, 0.025, "Senior", "BCA", "8271928371", "Active"),
        ("Rizky Maulana", "082345678901", "rizky@livehost.id", "TikTok Live", 35000.0, 0.015, "Junior", "Mandiri", "142001928374", "Active"),
        ("Clarissa Salsabila", "083456789012", "clarissa@livehost.id", "Shopee Live, Tokopedia Play", 50000.0, 0.03, "Star", "BCA", "5240192834", "Active"),
        ("Dimas Pratama", "085678901234", "dimas@livehost.id", "TikTok Live, Instagram Live", 35000.0, 0.015, "Junior", "BRI", "034101002345501", "Active"),
    ]

    cursor.executemany("""
    INSERT INTO hosts (name, phone, email, platforms, hourly_rate, commission_rate, tier, bank_name, bank_account, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_hosts)

    # Seed Schedules
    sample_schedules = [
        (1, "Morning Flash Sale Skin Care", "TikTok Live", "2026-11-05", "09:00", "12:00", 3.0, 5000000.0, "Completed", "Fokus produk serum & sunscreen"),
        (2, "Siang Seru Elektronik & Gadget", "Shopee Live", "2026-11-05", "13:00", "16:00", 3.0, 8000000.0, "Completed", "Voucher diskon 50rb live"),
        (3, "Super Brand Day Beauty Night", "TikTok Live", "2026-11-05", "19:00", "22:00", 3.0, 15000000.0, "Completed", "Prime time, target live GMV tinggi"),
        (1, "Weekend Morning Fashion Live", "Shopee Live", "2026-11-06", "10:00", "13:00", 3.0, 6000000.0, "In Progress", "Katalog gamis & hijab terbaru"),
        (4, "Night Gaming & Audio Gear", "TikTok Live", "2026-11-06", "20:00", "23:00", 3.0, 7000000.0, "Scheduled", "Review TWS & Headset gaming"),
    ]

    cursor.executemany("""
    INSERT INTO schedules (host_id, title, platform, scheduled_date, start_time, end_time, planned_duration_hours, target_gmv, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_schedules)

    # Seed Attendances for Completed schedules
    sample_attendances = [
        (1, 1, "2026-11-05 08:55:00", "2026-11-05 12:05:00", 3.17, "https://tiktok.com/@brandbeauty/live", "https://img.sample/proof1.png", "Approved", 0, "Tepat waktu dan responsif"),
        (2, 2, "2026-11-05 13:05:00", "2026-11-05 16:00:00", 2.92, "https://shopee.co.id/live/gadgetstore", "https://img.sample/proof2.png", "Approved", 5, "Terlambat 5 menit karena setup koneksi"),
        (3, 3, "2026-11-05 18:50:00", "2026-11-05 22:10:00", 3.33, "https://tiktok.com/@brandbeauty/live", "https://img.sample/proof3.png", "Approved", 0, "Host perform sangat baik dan energik"),
    ]

    cursor.executemany("""
    INSERT INTO attendances (schedule_id, host_id, clock_in, clock_out, actual_hours, live_link, proof_image_url, validation_status, late_minutes, supervisor_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_attendances)

    # Seed Performances
    sample_performances = [
        (1, 1, 1250, 480, 142, 5800000.0, 5000000.0, 1, 11.36, 4.8, "Target GMV tembus 116%! Produk serum best seller."),
        (2, 2, 850, 310, 68, 6500000.0, 8000000.0, 0, 8.0, 4.2, "Pencapaian 81.2%. Interaksi chat cukup aktif."),
        (3, 3, 3400, 1200, 310, 18500000.0, 15000000.0, 1, 9.12, 5.0, "Luar biasa! Target terlampaui 123%. Rekor GMV sesi malam."),
    ]

    cursor.executemany("""
    INSERT INTO performances (schedule_id, host_id, peak_viewers, avg_viewers, total_orders, actual_gmv, target_gmv, target_reached, conversion_rate, performance_rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_performances)

    # Seed Sample Payroll for Nadia Putri
    # Base: 3.17h * 45,000 = 142,650
    # Commission: 2.5% of 5,800,000 = 145,000
    # Incentive: 50,000 (target tembus)
    # Deductions: 0
    # Net: 337,650
    cursor.execute("""
    INSERT INTO payrolls (
        host_id, period_start, period_end, total_sessions, total_hours, hourly_rate,
        base_salary, total_gmv, commission_bonus, target_incentive, deductions,
        net_salary, payment_status, paid_at, payment_reference
    ) VALUES (
        1, '2026-11-01', '2026-11-07', 1, 3.17, 45000.0,
        142650.0, 5800000.0, 145000.0, 50000.0, 0.0,
        337650.0, 'Paid', '2026-11-06 10:00:00', 'TRX-BCA-20261106-001'
    )
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    seed_sample_data()
    print("Database initialized and sample data seeded successfully.")
