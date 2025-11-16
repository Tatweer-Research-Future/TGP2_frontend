## Attendance API - Frontend Integration Guide

This document explains how to call the attendance APIs from a frontend client. All write actions require an authenticated user who is either a superuser or in the `attendance_tracker` group.

### Base URL

- `http://localhost:8000/api/v1/attendance/`

### Authentication

Include one of:

- `Authorization: Bearer <ACCESS_TOKEN>` header (recommended)
- Or rely on valid cookies if your app uses cookie-based auth

### Endpoints

- POST `submit/` → Create check-in(s)
- PUT `submit/` → Set/update leave time (check_out_time) for existing log(s)
- GET `events/` → List available events
- GET `my-logs/` → List last 24h or filter by date
- GET `overview/` → Per-user, per-event logs for a given date (admin overview)

### Common Headers

```
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

---

## 1) Create Check-in(s)

POST `/attendance/submit/`

Required fields:

- `candidate_id` (int) or `candidate_ids` (int[])
- `event` (int)
- `attendance_date` (YYYY-MM-DD)
- `check_in_time` (HH:MM:SS)

Optional:

- `notes` (string)

Example (single):

```json
{
  "candidate_id": 101,
  "event": 2,
  "attendance_date": "2025-10-12",
  "check_in_time": "09:00:00",
  "notes": "Arrived"
}
```

Example (bulk):

```json
{
  "candidate_ids": [101, 102, 103],
  "event": 2,
  "attendance_date": "2025-10-12",
  "check_in_time": "09:05:00",
  "notes": "Batch AM"
}
```

Responses include a per-candidate result with success or error details.

---

## 2) Set Leave Time (check_out_time)

PUT `/attendance/submit/`

Required fields:

- `candidate_id` (int) or `candidate_ids` (int[])
- `event` (int)
- `attendance_date` (YYYY-MM-DD) — identifies the day’s record
- `check_out_time` (HH:MM:SS)

Optional:

- `notes` (string)

Example (bulk):

```json
{
  "candidate_ids": [101, 102],
  "event": 2,
  "attendance_date": "2025-10-12",
  "check_out_time": "17:30:00",
  "notes": "Left"
}
```

Server validates that `check_out_time` is not earlier than the saved `check_in_time`.

---

## 3) Breaks via PUT on submit/

Use PUT `/attendance/submit/` and include either `break_start_time` (to start) or `break_end_time` (to end).

- Start break (provide `break_start_time`):

```json
{
  "candidate_ids": [101, 102],
  "event": 2,
  "attendance_date": "2025-10-12",
  "break_start_time": "13:10:00"  // optional; defaults to now
}
```

- End break (provide `break_end_time`):

```json
{
  "candidate_id": 101,
  "event": 2,
  "attendance_date": "2025-10-12",
  "break_end_time": "13:25:00"    // optional; defaults to now
}
```

Notes:

- If a log is already “on break”, starting break again is a no-op.
- Ending break when not “on break” is a no-op.
- Each start→end pair adds to `break_accumulated`. `duration` subtracts total breaks.

---

## 4) List Events

GET `/attendance/events/`

Returns available scheduled events:

```
[
  { "id": 2, "title": "Lab", "start_time": "09:00:00", "end_time": "17:30:00" },
  { "id": 3, "title": "Session", "start_time": "10:00:00", "end_time": "12:30:00" }
]
```

---

## 5) List Attendance Logs

GET `/attendance/my-logs/`

Two modes:

1. Exact date filter (recommended):

```
GET /attendance/my-logs/?date=2025-10-12
```

Returns all logs whose `attendance_date` is `2025-10-12`.

2. Last 24 hours (default):

```
GET /attendance/my-logs/
```

Returns only logs from the precise last 24 hours window.

---

## 6) Stored/Computed Fields in Responses

The attendance log responses now include the following fields:

- `status` (string): stored value, either `"On-Time"` or `"Late"`.
- `duration` (string|null): worked time (HH:MM:SS) excluding breaks; null if `check_out_time` not set.
- `worked_duration` (string|null): same as `duration`, stored in DB; exposed for reporting.
- `break_time` (string): total accumulated break time (HH:MM:SS). Includes any ongoing break up to checkout if present.
- `break_started_at` (HH:MM:SS|null): start time of an ongoing break; null if not on break.
- `break_accumulated` (string): total break time accumulated so far (HH:MM:SS).
- `break_intervals` (array): audit of all breaks that day, as objects `{ "start": "HH:MM:SS", "end": "HH:MM:SS|null" }`.

Notes:
- `duration`/`worked_duration` are available once `check_out_time` is set.
- Break fields are currently read-only via the API.

Example (single log item as returned by serializers):

```json
{
  "id": 123,
  "trainee": 101,
  "trainee_email": "candidate@example.com",
  "event": 2,
  "event_title": "Lab",
  "attendance_date": "2025-10-12",
  "check_in_time": "09:05:00",
  "check_out_time": "17:30:00",
  "notes": "Arrived",
  "status": "On-Time",
  "duration": "08:15:00",
  "worked_duration": "08:15:00",
  "break_time": "00:10:00",
  "break_started_at": null,
  "break_accumulated": "00:10:00",
  "break_intervals": [
    { "start": "12:30:00", "end": "12:40:00" },
    { "start": "15:10:00", "end": "15:20:00" }
  ]
}
```

---

## 7) Overview Endpoint

GET `/attendance/overview/?date=YYYY-MM-DD`

- Returns all users (training group) with their per-event log status for the provided date (defaults to today when absent).
- Each event entry includes `status`, `duration`, and `break_time` if a log exists.

Response (shape excerpt):

```json
{
  "date": "2025-10-12",
  "events": [
    { "id": 2, "title": "Lab", "start_time": "09:00:00", "end_time": "17:30:00" }
  ],
  "users": [
    {
      "user_id": 101,
      "user_name": "Jane Doe",
      "user_email": "jane@example.com",
      "events": [
        {
          "event_id": 2,
          "event_title": "Lab",
          "has_log": true,
          "check_in_time": "09:05:00",
          "check_out_time": "17:30:00",
          "notes": "Left",
          "status": "On-Time",
          "duration": "08:15:00",
          "break_time": "00:10:00",
          "log_id": 123
        }
      ]
    }
  ]
}
```

---

## 8) Error Reference (selected)

- `forbidden`: Caller is not `attendance_tracker` nor superuser
- `candidate_identifier_required`: No candidate_id(s) provided
- `invalid_format`: `candidate_ids` is not a list
- `candidate_not_found`: Candidate id not found
- `duplicate_check_in`: Already checked in for same (candidate,event,date)
- `attendance_log_not_found`: Leave requested without matching check-in for date
- `invalid_time_order`: `check_out_time` earlier than `check_in_time`
- `invalid_date_format`: `?date=` not `YYYY-MM-DD`

---

## 9) Integration Tips

- Always send `attendance_date` on PUT to target the correct day.
- Use 24-hour time format: `HH:MM:SS`.
- For bulk operations, show per-candidate success/error to the user.
- Prefer `?date=` when building a daily log screen; use last-24h for dashboards.
