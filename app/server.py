"""
Lightweight REST API & Web Server for HostLive Management System.
Supports Ninos Design, Ratu Hijab, Evollet, Wivi with Attendance Selfie, Timestamp, Viewers, and Sales.
"""

import os
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
from .database import init_db, seed_sample_data, get_db_connection, SUPPORTED_BRANDS
from .services import SchedulingService, AttendanceService, PerformanceService, PayrollService

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


class HostLiveAPIHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _send_json(self, data, status=200):
        body = json.dumps(data, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _parse_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length > 0:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                return json.loads(raw_body)
        except Exception:
            pass
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Serve SPA static files
        if path == "/" or path == "/index.html":
            index_path = os.path.join(STATIC_DIR, "index.html")
            if os.path.exists(index_path):
                with open(index_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
        elif path.startswith("/static/"):
            rel_path = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, rel_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                content_type = "text/plain"
                if file_path.endswith(".css"):
                    content_type = "text/css"
                elif file_path.endswith(".js"):
                    content_type = "application/javascript"
                elif file_path.endswith(".html"):
                    content_type = "text/html"
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        # API Endpoints
        if path == "/api/brands":
            return self._send_json({"brands": SUPPORTED_BRANDS})

        elif path == "/api/overview":
            conn = get_db_connection()
            cur = conn.cursor()
            
            cur.execute("SELECT COUNT(*) FROM hosts WHERE status = 'Active'")
            active_hosts = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*), COALESCE(SUM(planned_duration_hours), 0) FROM schedules")
            schedules_row = cur.fetchone()
            total_schedules = schedules_row[0]
            total_planned_hours = round(schedules_row[1], 1)

            cur.execute("SELECT COALESCE(SUM(actual_gmv), 0), COALESCE(SUM(total_orders), 0) FROM performances")
            perf_row = cur.fetchone()
            total_gmv = perf_row[0]
            total_orders = perf_row[1]

            cur.execute("SELECT COALESCE(SUM(net_salary), 0) FROM payrolls WHERE payment_status = 'Pending'")
            pending_payroll = cur.fetchone()[0]

            # Brand breakdown
            cur.execute("""
            SELECT s.brand, COUNT(s.id) as total_shifts, COALESCE(SUM(p.actual_gmv), 0) as brand_gmv
            FROM schedules s
            LEFT JOIN performances p ON s.id = p.schedule_id
            GROUP BY s.brand
            """)
            brand_stats = [dict(r) for r in cur.fetchall()]

            conn.close()
            return self._send_json({
                "active_hosts": active_hosts,
                "total_schedules": total_schedules,
                "total_planned_hours": total_planned_hours,
                "total_gmv": total_gmv,
                "total_orders": total_orders,
                "pending_payroll": pending_payroll,
                "brand_stats": brand_stats
            })

        elif path == "/api/hosts":
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT * FROM hosts ORDER BY id ASC")
            hosts = [dict(r) for r in cur.fetchall()]
            conn.close()
            return self._send_json({"hosts": hosts})

        elif path == "/api/schedules":
            date_filter = query.get("date", [None])[0]
            platform_filter = query.get("platform", [None])[0]
            host_filter = query.get("host_id", [None])[0]
            brand_filter = query.get("brand", [None])[0]
            schedules = SchedulingService.get_all_schedules(
                date_filter=date_filter,
                platform_filter=platform_filter,
                host_filter=host_filter,
                brand_filter=brand_filter
            )
            return self._send_json({"schedules": schedules})

        elif path == "/api/payroll/calculate":
            host_id = int(query.get("host_id", [0])[0])
            start_date = query.get("start", ["2026-11-01"])[0]
            end_date = query.get("end", ["2026-11-30"])[0]
            try:
                result = PayrollService.calculate_payroll(host_id, start_date, end_date)
                return self._send_json(result)
            except Exception as e:
                return self._send_json({"error": str(e)}, status=400)

        elif path == "/api/payrolls":
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute("""
            SELECT p.*, h.name as host_name, h.bank_name, h.bank_account
            FROM payrolls p
            JOIN hosts h ON p.host_id = h.id
            ORDER BY p.id DESC
            """)
            payrolls = [dict(r) for r in cur.fetchall()]
            conn.close()
            return self._send_json({"payrolls": payrolls})

        self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self._parse_json_body()

        try:
            if path == "/api/hosts":
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("""
                INSERT INTO hosts (name, phone, email, platforms, hourly_rate, commission_rate, tier, bank_name, bank_account)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    body.get("name"),
                    body.get("phone", ""),
                    body.get("email", ""),
                    body.get("platforms", "TikTok Live"),
                    float(body.get("hourly_rate", 35000.0)),
                    float(body.get("commission_rate", 0.02)),
                    body.get("tier", "Junior"),
                    body.get("bank_name", ""),
                    body.get("bank_account", "")
                ))
                new_id = cur.lastrowid
                conn.commit()
                conn.close()
                return self._send_json({"message": "Host created", "id": new_id}, status=201)

            elif path == "/api/schedules":
                new_id = SchedulingService.create_schedule(
                    host_id=int(body["host_id"]),
                    brand=body.get("brand", "Ninos Design"),
                    title=body["title"],
                    platform=body["platform"],
                    scheduled_date=body["scheduled_date"],
                    start_time=body["start_time"],
                    end_time=body["end_time"],
                    planned_duration_hours=float(body["planned_duration_hours"]),
                    target_gmv=float(body.get("target_gmv", 0.0)),
                    notes=body.get("notes", "")
                )
                return self._send_json({"message": "Schedule created", "id": new_id}, status=201)

            elif path == "/api/attendance/clock-in":
                schedule_id = int(body["schedule_id"])
                res = AttendanceService.clock_in(
                    schedule_id=schedule_id,
                    selfie_image=body.get("selfie_image", ""),
                    live_link=body.get("live_link", ""),
                    notes=body.get("notes", "")
                )
                return self._send_json(res)

            elif path == "/api/attendance/clock-out":
                schedule_id = int(body["schedule_id"])
                res = AttendanceService.clock_out(
                    schedule_id=schedule_id,
                    viewers_count=int(body.get("viewers_count", 0)),
                    orders_count=int(body.get("orders_count", 0)),
                    sales_amount=float(body.get("sales_amount", 0.0)),
                    selfie_image=body.get("selfie_image", ""),
                    proof_image_url=body.get("proof_image_url", ""),
                    supervisor_notes=body.get("supervisor_notes", "")
                )
                return self._send_json(res)

            elif path == "/api/performances":
                res = PerformanceService.record_performance(
                    schedule_id=int(body["schedule_id"]),
                    peak_viewers=int(body.get("peak_viewers", 0)),
                    avg_viewers=int(body.get("avg_viewers", 0)),
                    total_orders=int(body.get("total_orders", 0)),
                    actual_gmv=float(body.get("actual_gmv", 0.0)),
                    performance_rating=float(body.get("performance_rating", 5.0)),
                    notes=body.get("notes", "")
                )
                return self._send_json(res)

            elif path == "/api/payroll/generate":
                host_id = int(body["host_id"])
                start_date = body["period_start"]
                end_date = body["period_end"]
                res = PayrollService.generate_and_save_payroll(host_id, start_date, end_date)
                return self._send_json(res, status=201)

            elif path == "/api/payroll/pay":
                payroll_id = int(body["payroll_id"])
                ref = body.get("payment_reference", "TRX-MANUAL")
                res = PayrollService.mark_payroll_paid(payroll_id, ref)
                return self._send_json(res)

        except Exception as e:
            return self._send_json({"error": str(e)}, status=400)

        self._send_json({"error": "Endpoint not found"}, status=404)


def run_server(port=8080):
    init_db()
    seed_sample_data()
    server_address = ("", port)
    httpd = HTTPServer(server_address, HostLiveAPIHandler)
    print(f"🚀 HostLive App Server running at http://localhost:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    run_server()
