"""
Business services for HostLive Management System.
Handles scheduling logic, attendance with selfie & timestamp, multi-brand filtering,
performance analytics (viewers & sales), and payroll processing.
"""

from datetime import datetime
from .database import get_db_connection


class SchedulingService:
    @staticmethod
    def get_all_schedules(db_path=None, date_filter=None, platform_filter=None, host_filter=None, brand_filter=None):
        conn = get_db_connection(db_path)
        query = """
        SELECT 
            s.*, 
            h.name as host_name, 
            h.phone as host_phone, 
            h.hourly_rate,
            a.id as attendance_id,
            a.clock_in,
            a.clock_out,
            a.timestamp_clock_in,
            a.timestamp_clock_out,
            a.selfie_image,
            a.viewers_count,
            a.orders_count,
            a.sales_amount,
            a.actual_hours,
            a.validation_status,
            a.late_minutes,
            p.id as performance_id,
            p.peak_viewers,
            p.avg_viewers,
            p.total_orders,
            p.actual_gmv,
            p.target_reached
        FROM schedules s
        JOIN hosts h ON s.host_id = h.id
        LEFT JOIN attendances a ON s.id = a.schedule_id
        LEFT JOIN performances p ON s.id = p.schedule_id
        WHERE 1=1
        """
        params = []
        if date_filter:
            query += " AND s.scheduled_date = ?"
            params.append(date_filter)
        if platform_filter:
            query += " AND s.platform = ?"
            params.append(platform_filter)
        if host_filter:
            query += " AND s.host_id = ?"
            params.append(host_filter)
        if brand_filter:
            query += " AND s.brand = ?"
            params.append(brand_filter)

        query += " ORDER BY s.scheduled_date DESC, s.start_time ASC"
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows

    @staticmethod
    def create_schedule(host_id, title, platform, scheduled_date, start_time, end_time, planned_duration_hours, target_gmv=0.0, brand="Ninos Design", notes="", db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO schedules (host_id, brand, title, platform, scheduled_date, start_time, end_time, planned_duration_hours, target_gmv, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (host_id, brand, title, platform, scheduled_date, start_time, end_time, planned_duration_hours, target_gmv, notes))
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return new_id


class AttendanceService:
    @staticmethod
    def clock_in(schedule_id, selfie_image="", live_link="", notes="", db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        
        # Check schedule
        cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        schedule = cursor.fetchone()
        if not schedule:
            conn.close()
            raise ValueError(f"Schedule with ID {schedule_id} not found.")

        host_id = schedule["host_id"]
        now = datetime.now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S WIB")

        # Calculate late minutes if scheduled for today
        late_minutes = 0
        try:
            scheduled_start = datetime.strptime(f"{schedule['scheduled_date']} {schedule['start_time']}", "%Y-%m-%d %H:%M")
            diff = (now - scheduled_start).total_seconds() / 60
            if diff > 0:
                late_minutes = int(diff)
        except Exception:
            late_minutes = 0

        # Check existing attendance
        cursor.execute("SELECT id FROM attendances WHERE schedule_id = ?", (schedule_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
            UPDATE attendances 
            SET clock_in = ?, timestamp_clock_in = ?, selfie_image = COALESCE(NULLIF(?, ''), selfie_image),
                live_link = ?, late_minutes = ?
            WHERE id = ?
            """, (now_str, timestamp_str, selfie_image, live_link, late_minutes, existing["id"]))
            att_id = existing["id"]
        else:
            cursor.execute("""
            INSERT INTO attendances (
                schedule_id, host_id, clock_in, timestamp_clock_in, selfie_image,
                live_link, late_minutes, validation_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
            """, (schedule_id, host_id, now_str, timestamp_str, selfie_image, live_link, late_minutes))
            att_id = cursor.lastrowid

        # Update schedule status
        cursor.execute("UPDATE schedules SET status = 'In Progress' WHERE id = ?", (schedule_id,))

        conn.commit()
        conn.close()
        return {
            "attendance_id": att_id,
            "clock_in": now_str,
            "timestamp_clock_in": timestamp_str,
            "late_minutes": late_minutes,
            "has_selfie": bool(selfie_image)
        }

    @staticmethod
    def clock_out(schedule_id, viewers_count=0, orders_count=0, sales_amount=0.0, selfie_image="", proof_image_url="", supervisor_notes="", db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM attendances WHERE schedule_id = ?", (schedule_id,))
        att = cursor.fetchone()
        if not att or not att["clock_in"]:
            conn.close()
            raise ValueError("Cannot clock out without prior clock-in.")

        cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        schedule = cursor.fetchone()

        now = datetime.now()
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S WIB")

        clock_in_dt = datetime.strptime(att["clock_in"], "%Y-%m-%d %H:%M:%S")
        duration_seconds = (now - clock_in_dt).total_seconds()
        actual_hours = round(max(0.1, duration_seconds / 3600), 2)

        final_selfie = selfie_image if selfie_image else att["selfie_image"]

        cursor.execute("""
        UPDATE attendances
        SET clock_out = ?, timestamp_clock_out = ?, actual_hours = ?,
            selfie_image = ?, proof_image_url = ?, viewers_count = ?,
            orders_count = ?, sales_amount = ?, supervisor_notes = ?, validation_status = 'Approved'
        WHERE id = ?
        """, (now_str, timestamp_str, actual_hours, final_selfie, proof_image_url,
              viewers_count, orders_count, sales_amount, supervisor_notes, att["id"]))

        # Update schedule status
        cursor.execute("UPDATE schedules SET status = 'Completed' WHERE id = ?", (schedule_id,))

        # Automatically link sales & viewers to performance record
        if sales_amount > 0 or viewers_count > 0 or orders_count > 0:
            target_gmv = schedule["target_gmv"] or 0.0
            target_reached = 1 if (sales_amount >= target_gmv and target_gmv > 0) else 0
            conv_rate = round((orders_count / viewers_count) * 100, 2) if viewers_count > 0 else 0.0

            cursor.execute("SELECT id FROM performances WHERE schedule_id = ?", (schedule_id,))
            perf_row = cursor.fetchone()
            if perf_row:
                cursor.execute("""
                UPDATE performances
                SET peak_viewers = ?, avg_viewers = ?, total_orders = ?,
                    actual_gmv = ?, target_reached = ?, conversion_rate = ?
                WHERE id = ?
                """, (viewers_count, int(viewers_count * 0.4), orders_count, sales_amount, target_reached, conv_rate, perf_row["id"]))
            else:
                cursor.execute("""
                INSERT INTO performances (
                    schedule_id, host_id, peak_viewers, avg_viewers, total_orders,
                    actual_gmv, target_gmv, target_reached, conversion_rate, performance_rating
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0)
                """, (schedule_id, schedule["host_id"], viewers_count, int(viewers_count * 0.4), orders_count, sales_amount, target_gmv, target_reached, conv_rate))

        conn.commit()
        conn.close()
        return {
            "attendance_id": att["id"],
            "clock_out": now_str,
            "timestamp_clock_out": timestamp_str,
            "actual_hours": actual_hours,
            "viewers_count": viewers_count,
            "orders_count": orders_count,
            "sales_amount": sales_amount
        }


class PerformanceService:
    @staticmethod
    def record_performance(schedule_id, peak_viewers, avg_viewers, total_orders, actual_gmv, performance_rating=5.0, notes="", db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM schedules WHERE id = ?", (schedule_id,))
        schedule = cursor.fetchone()
        if not schedule:
            conn.close()
            raise ValueError("Schedule not found.")

        host_id = schedule["host_id"]
        target_gmv = schedule["target_gmv"] or 0.0
        target_reached = 1 if (actual_gmv >= target_gmv and target_gmv > 0) else 0

        # Calculate conversion rate
        conversion_rate = 0.0
        if avg_viewers > 0:
            conversion_rate = round((total_orders / avg_viewers) * 100, 2)
        elif peak_viewers > 0:
            conversion_rate = round((total_orders / peak_viewers) * 100, 2)

        cursor.execute("SELECT id FROM performances WHERE schedule_id = ?", (schedule_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
            UPDATE performances
            SET peak_viewers = ?, avg_viewers = ?, total_orders = ?, actual_gmv = ?, target_gmv = ?,
                target_reached = ?, conversion_rate = ?, performance_rating = ?, notes = ?
            WHERE id = ?
            """, (peak_viewers, avg_viewers, total_orders, actual_gmv, target_gmv,
                  target_reached, conversion_rate, performance_rating, notes, existing["id"]))
            perf_id = existing["id"]
        else:
            cursor.execute("""
            INSERT INTO performances (
                schedule_id, host_id, peak_viewers, avg_viewers, total_orders,
                actual_gmv, target_gmv, target_reached, conversion_rate, performance_rating, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (schedule_id, host_id, peak_viewers, avg_viewers, total_orders,
                  actual_gmv, target_gmv, target_reached, conversion_rate, performance_rating, notes))
            perf_id = cursor.lastrowid

        # Also sync to attendances
        cursor.execute("""
        UPDATE attendances
        SET viewers_count = ?, orders_count = ?, sales_amount = ?
        WHERE schedule_id = ?
        """, (peak_viewers, total_orders, actual_gmv, schedule_id))

        conn.commit()
        conn.close()
        return {
            "performance_id": perf_id,
            "target_reached": bool(target_reached),
            "conversion_rate": conversion_rate,
            "actual_gmv": actual_gmv
        }


class PayrollService:
    TARGET_INCENTIVE_BONUS = 50000.0  # Rp 50.000 bonus per session target achieved
    LATE_PENALTY_RATE = 10000.0       # Rp 10.000 per 15 mins late

    @staticmethod
    def calculate_payroll(host_id, period_start, period_end, db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()

        # Get host details
        cursor.execute("SELECT * FROM hosts WHERE id = ?", (host_id,))
        host = cursor.fetchone()
        if not host:
            conn.close()
            raise ValueError("Host not found.")

        # Query completed sessions in period with brand details
        cursor.execute("""
        SELECT 
            s.id as schedule_id,
            s.brand,
            s.title,
            s.scheduled_date,
            s.platform,
            s.planned_duration_hours,
            COALESCE(a.actual_hours, s.planned_duration_hours) as actual_hours,
            COALESCE(a.late_minutes, 0) as late_minutes,
            COALESCE(p.actual_gmv, a.sales_amount, 0.0) as actual_gmv,
            COALESCE(p.target_reached, 0) as target_reached,
            COALESCE(p.total_orders, a.orders_count, 0) as total_orders
        FROM schedules s
        LEFT JOIN attendances a ON s.id = a.schedule_id
        LEFT JOIN performances p ON s.id = p.schedule_id
        WHERE s.host_id = ? 
          AND s.scheduled_date >= ? 
          AND s.scheduled_date <= ?
          AND s.status = 'Completed'
        ORDER BY s.scheduled_date ASC
        """, (host_id, period_start, period_end))

        sessions = [dict(r) for r in cursor.fetchall()]

        total_sessions = len(sessions)
        total_hours = sum(s["actual_hours"] for s in sessions)
        hourly_rate = host["hourly_rate"]
        base_salary = round(total_hours * hourly_rate, 2)

        total_gmv = sum(s["actual_gmv"] for s in sessions)
        commission_rate = host["commission_rate"]
        commission_bonus = round(total_gmv * commission_rate, 2)

        target_reached_count = sum(1 for s in sessions if s["target_reached"] == 1)
        target_incentive = target_reached_count * PayrollService.TARGET_INCENTIVE_BONUS

        total_late_minutes = sum(s["late_minutes"] for s in sessions)
        late_blocks = total_late_minutes // 15
        deductions = late_blocks * PayrollService.LATE_PENALTY_RATE

        net_salary = max(0.0, round(base_salary + commission_bonus + target_incentive - deductions, 2))

        # Brand summary breakdown
        brand_summary = {}
        for s in sessions:
            b = s["brand"] or "Ninos Design"
            if b not in brand_summary:
                brand_summary[b] = {"sessions": 0, "hours": 0.0, "gmv": 0.0}
            brand_summary[b]["sessions"] += 1
            brand_summary[b]["hours"] += round(s["actual_hours"], 2)
            brand_summary[b]["gmv"] += s["actual_gmv"]

        conn.close()
        return {
            "host_id": host_id,
            "host_name": host["name"],
            "tier": host["tier"],
            "bank_name": host["bank_name"],
            "bank_account": host["bank_account"],
            "period_start": period_start,
            "period_end": period_end,
            "total_sessions": total_sessions,
            "total_hours": round(total_hours, 2),
            "hourly_rate": hourly_rate,
            "base_salary": base_salary,
            "total_gmv": total_gmv,
            "commission_rate": commission_rate,
            "commission_bonus": commission_bonus,
            "target_reached_count": target_reached_count,
            "target_incentive": target_incentive,
            "total_late_minutes": total_late_minutes,
            "deductions": deductions,
            "net_salary": net_salary,
            "brand_summary": brand_summary,
            "sessions": sessions
        }

    @staticmethod
    def generate_and_save_payroll(host_id, period_start, period_end, db_path=None):
        summary = PayrollService.calculate_payroll(host_id, period_start, period_end, db_path)
        conn = get_db_connection(db_path)
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO payrolls (
            host_id, period_start, period_end, total_sessions, total_hours, hourly_rate,
            base_salary, total_gmv, commission_bonus, target_incentive, deductions,
            net_salary, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
        """, (
            host_id, period_start, period_end, summary["total_sessions"], summary["total_hours"], summary["hourly_rate"],
            summary["base_salary"], summary["total_gmv"], summary["commission_bonus"], summary["target_incentive"],
            summary["deductions"], summary["net_salary"]
        ))
        payroll_id = cursor.lastrowid
        conn.commit()
        conn.close()

        summary["payroll_id"] = payroll_id
        summary["payment_status"] = "Pending"
        return summary

    @staticmethod
    def mark_payroll_paid(payroll_id, payment_reference, db_path=None):
        conn = get_db_connection(db_path)
        cursor = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        UPDATE payrolls
        SET payment_status = 'Paid', paid_at = ?, payment_reference = ?
        WHERE id = ?
        """, (now_str, payment_reference, payroll_id))
        conn.commit()
        conn.close()
        return {"payroll_id": payroll_id, "status": "Paid", "paid_at": now_str}
