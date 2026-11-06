"""
Database connection and schema setup for HostLive Management System.
Supports multiple brands: Ninos Design, Ratu Hijab, Evollet, Wivi.
Includes attendance selfie capture, real-time timestamps, viewers tracking, and sales analytics.
"""

import os
import sqlite3
from datetime import datetime

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hostlive.db")
SUPPORTED_BRANDS = ["Ninos Design", "Ratu Hijab", "Evollet", "Wivi"]


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

    # 2. Schedules Table (Jadwal Shift per Brand)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host_id INTEGER NOT NULL,
        brand TEXT DEFAULT 'Ninos Design',
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

    # Check migration for brand column in existing databases
    try:
        cursor.execute("ALTER TABLE schedules ADD COLUMN brand TEXT DEFAULT 'Ninos Design'")
    except sqlite3.OperationalError:
        pass

    # 3. Attendance Table (Absensi, Selfie, Timestamp, Viewers & Penjualan)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER UNIQUE NOT NULL,
        host_id INTEGER NOT NULL,
        clock_in TEXT,
        clock_out TEXT,
        timestamp_clock_in TEXT,
        timestamp_clock_out TEXT,
        selfie_image TEXT,
        actual_hours REAL DEFAULT 0.0,
        live_link TEXT,
        proof_image_url TEXT,
        viewers_count INTEGER DEFAULT 0,
        orders_count INTEGER DEFAULT 0,
        sales_amount REAL DEFAULT 0.0,
        validation_status TEXT DEFAULT 'Pending',
        late_minutes INTEGER DEFAULT 0,
        supervisor_notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
    """)

    # Check migrations for attendances columns
    for col, col_type in [
        ("timestamp_clock_in", "TEXT"),
        ("timestamp_clock_out", "TEXT"),
        ("selfie_image", "TEXT"),
        ("viewers_count", "INTEGER DEFAULT 0"),
        ("orders_count", "INTEGER DEFAULT 0"),
        ("sales_amount", "REAL DEFAULT 0.0")
    ]:
        try:
            cursor.execute(f"ALTER TABLE attendances ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass

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


def seed_sample_data(db_path=None, force_reset=False):
    """Seed initial realistic sample data for Ninos Design, Ratu Hijab, Evollet, & Wivi."""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    if force_reset:
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("DELETE FROM payrolls")
        cursor.execute("DELETE FROM performances")
        cursor.execute("DELETE FROM attendances")
        cursor.execute("DELETE FROM schedules")
        cursor.execute("DELETE FROM hosts")
        try:
            cursor.execute("DELETE FROM sqlite_sequence")
        except sqlite3.OperationalError:
            pass
        cursor.execute("PRAGMA foreign_keys = ON;")

    cursor.execute("SELECT COUNT(*) FROM hosts")
    if cursor.fetchone()[0] > 0 and not force_reset:
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

    # Seed Schedules with the 4 brands: Ninos Design, Ratu Hijab, Evollet, Wivi
    sample_schedules = [
        (1, "Ninos Design", "Morning Fashion Show - Ninos Gamis Syari Exclusive", "TikTok Live", "2026-11-05", "09:00", "12:00", 3.0, 7000000.0, "Completed", "Fokus gamis rayon & printing ninos premium"),
        (2, "Ratu Hijab", "Flash Sale Ratu Hijab - Voal Paris & Silk Pashmina", "Shopee Live", "2026-11-05", "13:00", "16:00", 3.0, 5000000.0, "Completed", "Voucher subsidi ongkir + bundle hemat"),
        (3, "Evollet", "Prime Night Launching - Evollet Outer & Casual Set", "TikTok Live", "2026-11-05", "19:00", "22:00", 3.0, 12000000.0, "Completed", "Model baru launching perkenalan"),
        (1, "Wivi", "Wivi Weekend Flash Sale - Casual Daily Series", "Shopee Live", "2026-11-06", "10:00", "13:00", 3.0, 6000000.0, "In Progress", "Katalog celana kulot & kemeja linen"),
        (4, "Ninos Design", "Night Special - Ninos Design Abaya Glamour", "TikTok Live", "2026-11-06", "19:30", "22:30", 3.0, 8500000.0, "Scheduled", "Etalase 1-10 koleksi pesta"),
    ]

    cursor.executemany("""
    INSERT INTO schedules (host_id, brand, title, platform, scheduled_date, start_time, end_time, planned_duration_hours, target_gmv, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_schedules)

    # Seed Attendances with timestamp, viewers, sales, and sample selfie
    sample_selfie = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='%234f46e5'/><circle cx='60' cy='45' r='25' fill='%23ffffff'/><circle cx='60' cy='110' r='45' fill='%23ffffff'/><text x='60' y='115' font-size='10' fill='%234f46e5' text-anchor='middle' font-family='sans-serif'>SELFIE OK</text></svg>"

    sample_attendances = [
        (1, 1, "2026-11-05 08:55:00", "2026-11-05 12:05:00", "2026-11-05 08:55:12 WIB", "2026-11-05 12:05:44 WIB", sample_selfie, 3.17, "https://tiktok.com/@ninosdesign/live", 1450, 168, 7850000.0, "Approved", 0, "Selfie terverifikasi di studio Ninos"),
        (2, 2, "2026-11-05 13:04:00", "2026-11-05 16:02:00", "2026-11-05 13:04:20 WIB", "2026-11-05 16:02:15 WIB", sample_selfie, 2.97, "https://shopee.co.id/live/ratuhijab", 890, 92, 5300000.0, "Approved", 4, "Selfie di ruang live Ratu Hijab"),
        (3, 3, "2026-11-05 18:52:00", "2026-11-05 22:15:00", "2026-11-05 18:52:50 WIB", "2026-11-05 22:15:30 WIB", sample_selfie, 3.38, "https://tiktok.com/@evollet/live", 2980, 245, 14200000.0, "Approved", 0, "Selfie studio Evollet, tepat waktu"),
    ]

    cursor.executemany("""
    INSERT INTO attendances (
        schedule_id, host_id, clock_in, clock_out, timestamp_clock_in, timestamp_clock_out,
        selfie_image, actual_hours, live_link, viewers_count, orders_count, sales_amount,
        validation_status, late_minutes, supervisor_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_attendances)

    # Seed Performances
    sample_performances = [
        (1, 1, 1450, 520, 168, 7850000.0, 7000000.0, 1, 11.58, 4.9, "Ninos Design: Target tembus 112%! Gamis rayon best seller."),
        (2, 2, 890, 340, 92, 5300000.0, 5000000.0, 1, 10.33, 4.5, "Ratu Hijab: Target tercapai 106%. Respon voucher sangat baik."),
        (3, 3, 2980, 1150, 245, 14200000.0, 12000000.0, 1, 8.22, 5.0, "Evollet: Meledak 118%! Rekor penjualan launching outer baru."),
    ]

    cursor.executemany("""
    INSERT INTO performances (schedule_id, host_id, peak_viewers, avg_viewers, total_orders, actual_gmv, target_gmv, target_reached, conversion_rate, performance_rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_performances)

    # Seed Payroll
    cursor.execute("""
    INSERT INTO payrolls (
        host_id, period_start, period_end, total_sessions, total_hours, hourly_rate,
        base_salary, total_gmv, commission_bonus, target_incentive, deductions,
        net_salary, payment_status, paid_at, payment_reference
    ) VALUES (
        1, '2026-11-01', '2026-11-07', 1, 3.17, 45000.0,
        142650.0, 7850000.0, 196250.0, 50000.0, 0.0,
        388900.0, 'Paid', '2026-11-06 10:00:00', 'TRX-NINOS-20261106-001'
    )
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    seed_sample_data(force_reset=True)
    print("Multi-brand database initialized & seeded successfully with Ninos Design, Ratu Hijab, Evollet, Wivi.")
