## Trainee Performance API

Purpose: Provide a consolidated performance view per Track for all users in group "Trainee", including attendance stats, pre/post exam scores per module with improvement metrics, and evaluator-assigned module orders. Trainees are ranked by the sum of their module orders (lower is better).

Base URL prefix
- All endpoints are under: `/api/v1/users/`

Authentication
- Requires authentication.
- Use Bearer JWT in the `Authorization` header.
  - Example: `Authorization: Bearer <TOKEN>`

Permissions
- Allowed for any authenticated user (e.g., staff, instructor, trainee). Data is read-only.

---

### Endpoint — Track-grouped performance

Path
- `GET /users/trainee-performance/`

Query params
- `track` (optional, string): Case-insensitive exact match on the user's `additional_fields.Track`. If provided, results are scoped to that single track; otherwise, all tracks are returned.
- `week` (optional, CSV of positive integers): One or more week numbers that drive BOTH module selection and attendance date windows.
  - Week 1 starts on Sunday 2025-11-02 and ends on Thursday 2025-11-05 (Sun–Thu).
  - Week N = Week 1 + (N-1)*7 days (still Sun–Thu window).
  - Attendance is filtered by the UNION of all selected Sun–Thu windows (no Fri/Sat included).
  - Modules are filtered by `Module.order ∈ {selected weeks}`.
  - Examples: `week=1`, `week=1,2`.

Semantics
- Lists all trainees in group "Trainee".
- Aggregates:
  - Attendance from `attendance.AttendanceLog` (within selected week window(s)):
    - `attendance_days`: number of logs for the user (Sun–Thu union of selected weeks)
    - `absent_days`: for events the user attended at least once, count of dates in the selected window(s) where the user has no log
    - `stolen_hours`, `total_break_time`, `stolen_and_break_total`: sum of late arrival/early leave hours plus break time, expressed in decimal hours
  - Exams from `portal.TestSubmission`:
    - Pre (kind = `PRE`) and Post (kind = `POST`) per trainee per module in the same Track
    - Scores are restricted to modules whose `order` is in the selected `week` list
    - `pre_score_sum`, `post_score_sum`, `total_post_score` (sum of `score_max` for the post exams taken), `improvement_sum`
  - Evaluator orders from `portal.TraineeModuleOrder`:
    - Restricted to modules with `order` in the selected `week` list
- Ordering inside each track:
  - Sorted by `order_sum` ascending (lowest is best), then by `name`/`email` as tie-breaker.

Response shape (200 OK)
```json
{
  "weeks": [1, 2],
  "period_from": "2025-11-02",
  "period_to": "2025-11-12",
  "tracks": [
    {
      "track": "Software & App Development",
      "period_from": "2025-11-02",
      "period_to": "2025-11-12",
      "trainees": [
        {
          "user_id": 12,
          "name": "Jane",
          "full_name": "Jane Doe",
          "email": "jane@example.com",
          "avatar": "https://your.domain/media/users/avatars/jane.jpg",
          "attendance_days": 18,
          "absent_days": 2,
          "stolen_hours": 2.5,
          "total_break_time": 3.25,
          "stolen_and_break_total": 5.75,
          "pre_score_sum": 70,
          "post_score_sum": 85,
          "total_post_score": 100,
          "improvement_sum": 15,
          "pre_scores": [
            { "module_id": 3, "module_title": "Django", "score_total": 35, "score_max": 50 }
          ],
          "post_scores": [
            { "module_id": 3, "module_title": "Django", "score_total": 45, "score_max": 50, "improvement": 10, "improvement_percentage": 20.0 }
          ],
          "module_orders": [
            { "module_id": 3, "module_title": "Django", "order": 2 }
          ],
          "order_sum": 2
        }
      ]
    }
  ]
}
```

Notes
- `period_from` is the earliest Sunday among selected weeks; `period_to` is the latest Thursday among selected weeks.
- Attendance is filtered by the union of the selected week windows (no Friday/Saturday included).
- Module-related data (pre/post scores, orders) is filtered to modules where `order` is in the selected week numbers.
- `period_from` / `period_to` are included both at the top level and per track.
- When `week` is omitted, `period_from` / `period_to` reflect the min/max attendance dates present in the data.

Common error responses
- 401 Unauthorized:
  - `{"detail": "Authentication credentials were not provided."}`
- 404 Not Found:
  - `{"error": "Trainee group not found"}`

---

Examples

1) All tracks
```bash
curl -X GET "http://localhost:8000/api/v1/users/trainee-performance/" \
  -H "Authorization: Bearer <TOKEN>"
```

2) Single track (case-insensitive exact)
```bash
curl -X GET "http://localhost:8000/api/v1/users/trainee-performance/?track=Software & App Development" \
  -H "Authorization: Bearer <TOKEN>"
```

3) Filter by week (modules + dates)
```bash
curl -X GET "http://localhost:8000/api/v1/users/trainee-performance/?week=1" \
  -H "Authorization: Bearer <TOKEN>"
```

4) Multiple weeks (union of Sun–Thu windows)
```bash
curl -X GET "http://localhost:8000/api/v1/users/trainee-performance/?week=1,2" \
  -H "Authorization: Bearer <TOKEN>"
```

5) Combined filters (track + week)
```bash
curl -X GET "http://localhost:8000/api/v1/users/trainee-performance/?track=Software%20%26%20App%20Development&week=1,2" \
  -H "Authorization: Bearer <TOKEN>"
```

6) fetch (browser/React)
```javascript
const res = await fetch(`/api/v1/users/trainee-performance/?track=Software%20%26%20App%20Development&week=1,2`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await res.json();
```

7) Axios
```javascript
const { data } = await axios.get("/api/v1/users/trainee-performance/", {
  params: { track: "Software & App Development", week: "1,2" },
  headers: { Authorization: `Bearer ${token}` },
});
```

Frontend usage notes
- Display trainees grouped by `track`, ordered by `order_sum` (ascending).
- Use `weeks`, `period_from`, `period_to` to annotate graphs/tables with the effective date span.
- Show `pre_scores` and `post_scores` with `improvement` and `improvement_percentage` when available.
- Use `total_post_score` to measure the total achievable score based on the modules that have post submissions (sum of `score_max` for each post exam the trainee took).
- Prefer `full_name` (from `additional_fields.full_name`) as the display name; fallback to `name` or `email` when needed.

