"""
Unit tests for HostLive Management System.
Tests scheduling, attendance with selfie & timestamp, viewers & sales tracking, and multi-brand payroll.
"""

import os
import tempfile
import unittest
from app.database import init_db, seed_sample_data, get_db_connection
from app.services import SchedulingService, AttendanceService, PerformanceService, PayrollService


class TestLiveHostSystem(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path)
        seed_sample_data(self.temp_db_path, force_reset=True)

    def tearDown(self):
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_database_seeded_brands(self):
        schedules = SchedulingService.get_all_schedules(db_path=self.temp_db_path)
        self.assertGreater(len(schedules), 0)
        brands = {s["brand"] for s in schedules}
        self.assertIn("Ninos Design", brands)
        self.assertIn("Ratu Hijab", brands)
        self.assertIn("Evollet", brands)
        self.assertIn("Wivi", brands)

    def test_schedule_creation_with_brand(self):
        new_id = SchedulingService.create_schedule(
            host_id=1,
            brand="Ninos Design",
            title="Special Launching Gamis Syari",
            platform="TikTok Live",
            scheduled_date="2026-11-07",
            start_time="14:00",
            end_time="17:00",
            planned_duration_hours=3.0,
            target_gmv=10000000.0,
            notes="Exclusive Ninos Design launch",
            db_path=self.temp_db_path
        )
        self.assertIsNotNone(new_id)

    def test_clock_in_with_selfie_and_timestamp(self):
        # Create a new schedule for Ratu Hijab
        sched_id = SchedulingService.create_schedule(
            host_id=2,
            brand="Ratu Hijab",
            title="Pashmina Silk Promo",
            platform="Shopee Live",
            scheduled_date="2026-11-06",
            start_time="09:00",
            end_time="11:00",
            planned_duration_hours=2.0,
            target_gmv=3000000.0,
            db_path=self.temp_db_path
        )

        sample_selfie = "data:image/jpeg;base64,sample_selfie_data"
        # Clock-in
        clock_in_res = AttendanceService.clock_in(
            sched_id,
            selfie_image=sample_selfie,
            live_link="https://shopee.co.id/live/ratuhijab",
            db_path=self.temp_db_path
        )
        self.assertIn("attendance_id", clock_in_res)
        self.assertIn("timestamp_clock_in", clock_in_res)
        self.assertTrue(clock_in_res["has_selfie"])

        # Clock-out with viewers and sales
        clock_out_res = AttendanceService.clock_out(
            sched_id,
            viewers_count=1200,
            orders_count=95,
            sales_amount=4500000.0,
            proof_image_url="https://proof.sample/image.png",
            supervisor_notes="Sesi lancar",
            db_path=self.temp_db_path
        )
        self.assertIn("actual_hours", clock_out_res)
        self.assertIn("timestamp_clock_out", clock_out_res)
        self.assertEqual(clock_out_res["viewers_count"], 1200)
        self.assertEqual(clock_out_res["sales_amount"], 4500000.0)

    def test_performance_tracking(self):
        sched_id = 1
        perf = PerformanceService.record_performance(
            schedule_id=sched_id,
            peak_viewers=2000,
            avg_viewers=600,
            total_orders=150,
            actual_gmv=8500000.0,
            performance_rating=4.9,
            notes="Ninos Design promo berhasil melampaui target",
            db_path=self.temp_db_path
        )
        self.assertTrue(perf["target_reached"])
        self.assertGreater(perf["conversion_rate"], 0)

    def test_payroll_brand_breakdown(self):
        # Nadia (Host 1): completed schedule on 2026-11-05 for Ninos Design
        payroll = PayrollService.calculate_payroll(
            host_id=1,
            period_start="2026-11-01",
            period_end="2026-11-07",
            db_path=self.temp_db_path
        )
        self.assertEqual(payroll["host_name"], "Nadia Putri")
        self.assertGreater(payroll["base_salary"], 0)
        self.assertGreater(payroll["commission_bonus"], 0)
        self.assertGreater(payroll["net_salary"], 0)
        self.assertIn("Ninos Design", payroll["brand_summary"])


if __name__ == "__main__":
    unittest.main()
