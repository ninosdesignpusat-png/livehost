"""
Unit tests for HostLive Management System.
Tests scheduling, attendance clock-in/out, performance metrics, and payroll formula.
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
        seed_sample_data(self.temp_db_path)

    def tearDown(self):
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_database_seeded(self):
        schedules = SchedulingService.get_all_schedules(db_path=self.temp_db_path)
        self.assertGreater(len(schedules), 0)

    def test_schedule_creation(self):
        new_id = SchedulingService.create_schedule(
            host_id=1,
            title="Special Mega Sale Promo",
            platform="TikTok Live",
            scheduled_date="2026-11-07",
            start_time="14:00",
            end_time="17:00",
            planned_duration_hours=3.0,
            target_gmv=10000000.0,
            notes="Exclusive deals",
            db_path=self.temp_db_path
        )
        self.assertIsNotNone(new_id)

    def test_clock_in_and_out(self):
        # Create a new schedule
        sched_id = SchedulingService.create_schedule(
            host_id=2,
            title="Test Live Stream Session",
            platform="Shopee Live",
            scheduled_date="2026-11-06",
            start_time="09:00",
            end_time="11:00",
            planned_duration_hours=2.0,
            target_gmv=3000000.0,
            db_path=self.temp_db_path
        )

        # Clock-in
        clock_in_res = AttendanceService.clock_in(
            sched_id,
            live_link="https://shopee.co.id/live/test",
            db_path=self.temp_db_path
        )
        self.assertIn("attendance_id", clock_in_res)

        # Clock-out
        clock_out_res = AttendanceService.clock_out(
            sched_id,
            proof_image_url="https://proof.sample/image.png",
            supervisor_notes="Sesi lancar",
            db_path=self.temp_db_path
        )
        self.assertIn("actual_hours", clock_out_res)

    def test_performance_tracking(self):
        sched_id = 1
        perf = PerformanceService.record_performance(
            schedule_id=sched_id,
            peak_viewers=2000,
            avg_viewers=600,
            total_orders=150,
            actual_gmv=7500000.0,
            performance_rating=4.9,
            notes="Penjualan sangat memuaskan",
            db_path=self.temp_db_path
        )
        self.assertTrue(perf["target_reached"])
        self.assertGreater(perf["conversion_rate"], 0)

    def test_payroll_calculation(self):
        # Nadia (Host 1): completed schedule on 2026-11-05
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


if __name__ == "__main__":
    unittest.main()
