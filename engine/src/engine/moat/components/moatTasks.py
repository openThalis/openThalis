from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, UTC
from src.disk.users.models import User
from src.disk.services.tasks.models import Task
from src.disk.core.db import AsyncSessionLocal, init_db


class moatTasks:
    def __init__(self):
        self.session = None

    async def __aenter__(self):
        await init_db()
        self.session = AsyncSessionLocal()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def should_task_run_now(self, schedule_summary, last_run_dt):
        """Check if a task should run now based on its schedule and last run time."""
        now = datetime.now(UTC)
        now_date = now.date()
        now_time = now.strftime("%H:%M")
        now_day_of_week = now.strftime("%A")
        now_day_of_month = str(now.day)

        if not schedule_summary or not isinstance(schedule_summary, str):
            return False

        schedule_summary = schedule_summary.strip()

        # Check if task ran recently (within last 60 seconds) to prevent duplicates
        def recently_ran() -> bool:
            if not last_run_dt:
                return False
            # Ensure both datetimes are timezone-aware for comparison
            now_utc = datetime.now(timezone.utc)
            # If last_run_dt is naive, assume it's UTC
            if last_run_dt.tzinfo is None:
                last_run_utc = last_run_dt.replace(tzinfo=timezone.utc)
            else:
                last_run_utc = last_run_dt
            delta = (now_utc - last_run_utc).total_seconds()
            return delta < 60

        # For "NOW", only allow if it hasn't run very recently
        if schedule_summary == "NOW":
            if recently_ran():
                # Debug: suppressed NOW due to cooldown
                # print(f"\n\n### [MOAT TASKS]: Suppressing NOW task due to recent execution")
                return False
            return True

        parts = [p.strip() for p in schedule_summary.split(" - ")]
        if not parts:
            return False

        try:
            if parts[0] == "ONCE" and len(parts) == 3:
                # "ONCE - yyyy-mm-dd - hh:mm"
                date_str, time_str = parts[1], parts[2]
                scheduled_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                scheduled_time = time_str
                return (now_date == scheduled_date and now_time == scheduled_time and not recently_ran())
            elif parts[0] == "MONTHLY" and len(parts) == 3:
                # "MONTHLY - n - hh:mm"
                day_of_month, time_str = parts[1], parts[2]
                return (now_day_of_month == day_of_month and now_time == time_str and not recently_ran())
            elif parts[0] == "WEEKLY" and len(parts) == 3:
                # "WEEKLY - DayName - hh:mm"
                day_of_week, time_str = parts[1], parts[2]
                return (now_day_of_week == day_of_week and now_time == time_str and not recently_ran())
            elif parts[0] == "DAILY" and len(parts) == 2:
                # "DAILY - hh:mm"
                time_str = parts[1]
                return (now_time == time_str and not recently_ran())
            else:
                return False
        except Exception as e:
            print(f"\n\n### [MOAT TASKS ERROR]: Exception parsing schedule_summary '{schedule_summary}': {e}")
            return False

        return False

    async def read_tasks_table(self):
        if not self.session:
            raise RuntimeError("moatTasks must be used as async context manager")

        result = await self.session.execute(
            select(Task).options(selectinload(Task.user)).order_by(Task.created_at.desc())
        )
        tasks = result.scalars().all()

        return [{
            'id': task.id,
            'user_id': task.user_id,
            'user_email': task.user.email if task.user else None,
            'title': task.title,
            'description': task.description,
            'assigned_agent': task.assigned_agent,
            'schedule_summary': task.schedule_summary,
            'running_status': task.running_status,
            'responses': task.responses or [],
            'last_run': task.last_run.isoformat() if task.last_run else None,
            'created_at': task.created_at.isoformat() if task.created_at else None,
        } for task in tasks]

    async def get_active_tasks(self):
        if not self.session:
            raise RuntimeError("moatTasks must be used as async context manager")

        result = await self.session.execute(
            select(Task).options(selectinload(Task.user)).where(
                Task.running_status == True
            ).order_by(Task.created_at.desc())
        )
        tasks = result.scalars().all()

        tasks_to_run = []
                
        for task in tasks:
            if self.should_task_run_now(task.schedule_summary, task.last_run):
                tasks_to_run.append({
                    'id': task.id,
                    'user_id': task.user_id,
                    'user_email': task.user.email if task.user else None,
                    'title': task.title,
                    'description': task.description,
                    'assigned_agent': task.assigned_agent,
                    'schedule_summary': task.schedule_summary,
                    'running_status': task.running_status,
                    'responses': task.responses or [],
                    'last_run': task.last_run.isoformat() if task.last_run else None,
                    'created_at': task.created_at.isoformat() if task.created_at else None,
                })

        # Debug information
        #total_active_tasks = len(tasks)
        #if total_active_tasks > 0 and len(tasks_to_run) == 0:
        #    print(f"\n\n### [MOAT TASKS]: Found {total_active_tasks} active tasks, but none are scheduled to run now")
        #elif len(tasks_to_run) > 0:
        #    print(f"\n\n### [MOAT TASKS]: Found {len(tasks_to_run)} tasks scheduled to run now out of {total_active_tasks} active tasks")

        return tasks_to_run

    async def run(self):
        try:
            active_tasks = await self.get_active_tasks()
            return active_tasks

        except Exception as e:
            print(f"\n\n### [MOAT TASKS ERROR]: Error running moatTasks: {str(e)}")

