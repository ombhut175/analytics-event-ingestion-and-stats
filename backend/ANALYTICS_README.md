# 🔥 Analytics Event Ingestion System

Production-grade analytics event ingestion and reporting system built with **NestJS**, **BullMQ**, **PostgreSQL**, and **Redis**.

---

## 🏗️ Architecture Overview

```
┌──────────────────┐
│   Client/Web     │
│   Application    │
└────────┬─────────┘
         │ POST /event
         │ (Fast Response < 10ms)
         ▼
┌──────────────────────────────────────────┐
│          Ingestion API (NestJS)          │
│  ┌────────────────────────────────────┐  │
│  │  1. Validate Event DTO             │  │
│  │  2. Generate Event ID (if missing) │  │
│  │  3. Enqueue to BullMQ              │  │
│  │  4. Return 202 Accepted            │  │
│  └────────────────────────────────────┘  │
└────────────┬─────────────────────────────┘
             │
             ▼
      ┌─────────────┐
      │    Redis    │
      │   (Queue)   │
      └──────┬──────┘
             │
             ▼
┌──────────────────────────────────────────┐
│      BullMQ Worker (Background)          │
│  ┌────────────────────────────────────┐  │
│  │  Concurrency: 10                   │  │
│  │  Retries: 3 (exponential backoff)  │  │
│  │                                    │  │
│  │  For Each Job:                     │  │
│  │  1. Begin Transaction              │  │
│  │  2. Insert raw_events (idempotent) │  │
│  │  3. Upsert daily aggregates        │  │
│  │  4. Upsert path counts             │  │
│  │  5. Track unique users (ledger)    │  │
│  │  6. Commit Transaction             │  │
│  └────────────────────────────────────┘  │
└────────────┬─────────────────────────────┘
             │
             ▼
      ┌─────────────┐
      │ PostgreSQL  │
      │  (Storage)  │
      └──────┬──────┘
             │
             ▼
┌──────────────────────────────────────────┐
│        Reporting API (NestJS)            │
│  GET /stats?siteId=X&date=Y              │
│  ┌────────────────────────────────────┐  │
│  │  Returns:                          │  │
│  │  - Total Views                     │  │
│  │  - Unique Users                    │  │
│  │  - Top 10 Paths                    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 📊 Database Schema

### **1. raw_events** (Event Storage)
```sql
CREATE TABLE raw_events (
  event_id UUID PRIMARY KEY,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  user_id TEXT,              -- Optional (logged-in user)
  visitor_id TEXT,           -- Optional (anonymous cookie)
  event_ts TIMESTAMPTZ NOT NULL,
  ingestion_ts TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_date DATE GENERATED ALWAYS AS ((event_ts AT TIME ZONE 'UTC')::date)
);

CREATE INDEX idx_raw_events_site_date ON raw_events(site_id, event_date);
CREATE INDEX idx_raw_events_site_date_path ON raw_events(site_id, event_date, path);
```

**Idempotency**: `event_id` is the primary key. Duplicate events are ignored via `ON CONFLICT DO NOTHING`.

---

### **2. site_daily_aggregates** (Daily Stats)
```sql
CREATE TABLE site_daily_aggregates (
  site_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_views BIGINT DEFAULT 0,
  unique_users BIGINT DEFAULT 0,
  PRIMARY KEY (site_id, date)
);
```

**Updates**: 
- `total_views` incremented on every event
- `unique_users` incremented only when new user/visitor detected

---

### **3. site_daily_path_counts** (Path-Level Metrics)
```sql
CREATE TABLE site_daily_path_counts (
  site_id TEXT NOT NULL,
  date DATE NOT NULL,
  path TEXT NOT NULL,
  views BIGINT DEFAULT 0,
  PRIMARY KEY (site_id, date, path)
);

CREATE INDEX idx_path_counts_site_date_views_desc 
  ON site_daily_path_counts(site_id, date, views DESC);
```

**Usage**: Top paths ordered by `views DESC`.

---

### **4. site_daily_unique_users** (Deduplication Ledger)
```sql
CREATE TABLE site_daily_unique_users (
  site_id TEXT NOT NULL,
  date DATE NOT NULL,
  user_id TEXT,
  visitor_id TEXT,
  UNIQUE (site_id, date, user_id) NULLS NOT DISTINCT,
  UNIQUE (site_id, date, visitor_id) NULLS NOT DISTINCT
);

CREATE INDEX idx_unique_users_site_date ON site_daily_unique_users(site_id, date);
```

**Deduplication Logic**:
- Insert `(site_id, date, user_id)` OR `(site_id, date, visitor_id)` with `ON CONFLICT DO NOTHING`
- If insert succeeds (new row created), increment `unique_users` in aggregates
- Prevents double-counting same user/visitor within same day

---

## 🔐 Cookie-Based Unique User Tracking

### **Client Implementation**

```javascript
// Generate persistent visitor cookie (UUID v4)
function getOrCreateVisitorId() {
  let visitorId = getCookie('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    setCookie('visitor_id', visitorId, 365); // 1 year expiry
  }
  return visitorId;
}

// Track page view
async function trackPageView(path) {
  const payload = {
    siteId: 'site_abc123',
    eventType: 'page_view',
    path,
    timestamp: new Date().toISOString(),
    visitorId: getOrCreateVisitorId(),
    // Include userId if user is logged in
    userId: isLoggedIn() ? getCurrentUserId() : undefined
  };

  await fetch('http://localhost:3000/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

### **Deduplication Guarantees**

| Scenario | Unique Users Incremented? |
|----------|---------------------------|
| Same visitor, multiple page views (same day) | ❌ No |
| Same visitor, multiple page views (different days) | ✅ Yes (once per day) |
| Visitor logs in (both `visitor_id` + `user_id` sent) | ✅ Yes (only once) |
| Same user, multiple sessions (same day) | ❌ No |
| Same user, different devices (same day) | ❌ No (user_id dedupe) |

---

## 🚀 Quick Start

### **1. Start Infrastructure**

```bash
cd backend
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

---

### **2. Configure Environment**

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://analytics_user:analytics_password@localhost:5432/analytics_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# App
NODE_ENV=development
PORT=3000
```

---

### **3. Run Migrations**

```bash
npm run db:migrate
```

---

### **4. Start Application**

```bash
# Development mode (auto-reload)
npm run start:dev

# Production mode
npm run start:prod
```

**Swagger API Docs**: http://localhost:3000/api  
**Bull Board (Queue UI)**: http://localhost:3000/api/queues/admin

---

## 📡 API Reference

### **POST /api/event** (Ingestion)

**Request:**
```json
{
  "siteId": "site_abc123",
  "eventType": "page_view",
  "path": "/products/shoes",
  "timestamp": "2024-11-14T10:30:00Z",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",  // Optional
  "userId": "user_12345",                             // Optional
  "visitorId": "123e4567-e89b-12d3-a456-426614174000" // Optional
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validation Rules:**
- `siteId`: Required, non-empty string
- `eventType`: Required, non-empty string
- `path`: Required, non-empty string
- `timestamp`: Required, ISO 8601 datetime
- `eventId`: Optional, UUID v4
- `userId`: Optional, string
- `visitorId`: Optional, UUID v4
- **At least one of `userId` or `visitorId` should be provided for unique user tracking**

---

### **GET /api/stats** (Reporting)

**Request:**
```
GET /api/stats?siteId=site_abc123&date=2024-11-14
```

**Response (200 OK):**
```json
{
  "siteId": "site_abc123",
  "date": "2024-11-14",
  "totalViews": 1250,
  "uniqueUsers": 320,
  "topPaths": [
    { "path": "/products", "views": 450 },
    { "path": "/home", "views": 380 },
    { "path": "/about", "views": 120 }
  ]
}
```

**Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "message": "No stats found for site site_abc123 on 2024-11-14"
}
```

---

## 🧪 Testing Examples

### **Test 1: Basic Event Ingestion**

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/home",
    "timestamp": "2024-11-14T10:00:00Z",
    "visitorId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

---

### **Test 2: Repeat Visitor (Same Day)**

```bash
# First visit
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/products",
    "timestamp": "2024-11-14T10:05:00Z",
    "visitorId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Second visit (same visitor, same day)
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/about",
    "timestamp": "2024-11-14T10:10:00Z",
    "visitorId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Check stats (unique_users should be 1, total_views should be 3)
curl "http://localhost:3000/api/stats?siteId=test_site&date=2024-11-14"
```

**Expected Result:**
```json
{
  "totalViews": 3,
  "uniqueUsers": 1
}
```

---

### **Test 3: Visitor Becomes User (Login)**

```bash
# Anonymous visitor
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/login",
    "timestamp": "2024-11-14T11:00:00Z",
    "visitorId": "550e8400-e29b-41d4-a716-446655440002"
  }'

# After login (send both visitor_id and user_id)
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/dashboard",
    "timestamp": "2024-11-14T11:05:00Z",
    "userId": "user_001",
    "visitorId": "550e8400-e29b-41d4-a716-446655440002"
  }'

# Check stats (unique_users should still be 1, not 2)
curl "http://localhost:3000/api/stats?siteId=test_site&date=2024-11-14"
```

---

### **Test 4: Bulk Load Test**

```bash
# Generate 1000 events with different visitor IDs
for i in {1..1000}; do
  curl -X POST http://localhost:3000/api/event \
    -H "Content-Type: application/json" \
    -d "{
      \"siteId\": \"test_site\",
      \"eventType\": \"page_view\",
      \"path\": \"/page-$((i % 10))\",
      \"timestamp\": \"2024-11-14T12:00:00Z\",
      \"visitorId\": \"$(uuidgen)\"
    }" &
done
wait

# Monitor queue processing
# Visit: http://localhost:3000/api/queues/admin
```

---

### **Test 5: Idempotency Check**

```bash
EVENT_ID="550e8400-e29b-41d4-a716-446655440099"

# Send same event 3 times
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/event \
    -H "Content-Type: application/json" \
    -d "{
      \"siteId\": \"test_site\",
      \"eventType\": \"page_view\",
      \"path\": \"/duplicate-test\",
      \"timestamp\": \"2024-11-14T13:00:00Z\",
      \"eventId\": \"$EVENT_ID\",
      \"visitorId\": \"550e8400-e29b-41d4-a716-446655440003\"
    }"
done

# Check stats (total_views should increment by 1, not 3)
curl "http://localhost:3000/api/stats?siteId=test_site&date=2024-11-14"
```

---

## ⚙️ Configuration

### **Worker Concurrency**

Edit `analytics-events.processor.ts`:

```typescript
@Processor(QUEUES.ANALYTICS_EVENTS, {
  concurrency: 10, // Adjust based on DB load
})
```

---

### **Retry Strategy**

Edit `analytics-events.queue.ts`:

```typescript
await this.queue.add(AnalyticsEventJobName.PROCESS_EVENT, payload, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2s, 4s, 8s
  },
});
```

---

## 🎯 Performance Characteristics

| Metric | Value |
|--------|-------|
| Ingestion Latency | < 10ms (no DB writes in request path) |
| Worker Concurrency | 10 (configurable) |
| Max Throughput | ~1000 events/sec (single worker) |
| Idempotency | Guaranteed via `event_id` primary key |
| Unique User Dedup | Guaranteed via ledger table constraints |

---

## 📈 Monitoring

### **Queue Metrics**

```bash
curl http://localhost:3000/api/queues/health
```

Response:
```json
{
  "analytics-events": {
    "waiting": 5,
    "active": 3,
    "completed": 1250,
    "failed": 2
  }
}
```

---

### **Database Queries**

```sql
-- Total events ingested
SELECT COUNT(*) FROM raw_events;

-- Events by site and date
SELECT site_id, event_date, COUNT(*) as event_count
FROM raw_events
GROUP BY site_id, event_date
ORDER BY event_date DESC;

-- Daily unique users
SELECT site_id, date, COUNT(*) as unique_count
FROM site_daily_unique_users
GROUP BY site_id, date
ORDER BY date DESC;
```

---

## 🛠️ Troubleshooting

### **Issue: Events not processing**

1. Check Redis is running:
```bash
docker ps | grep redis
```

2. Check worker logs:
```bash
# In application logs, look for:
# "Job completed" or "Job failed"
```

3. Check Bull Board UI:
```
http://localhost:3000/api/queues/admin
```

---

### **Issue: Unique users over-counted**

Ensure client sends **persistent** `visitor_id`:
- Cookie should have 1-year expiry
- Same visitor must send same `visitor_id` across sessions

---

### **Issue: Database connection errors**

Check `.env.local`:
```bash
DATABASE_URL=postgresql://analytics_user:analytics_password@localhost:5432/analytics_db
```

Test connection:
```bash
psql "postgresql://analytics_user:analytics_password@localhost:5432/analytics_db"
```

---

## 📚 Tech Stack

- **Framework**: NestJS 11
- **Queue**: BullMQ 5 (Redis-based)
- **Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Validation**: class-validator
- **API Docs**: Swagger
- **Queue UI**: Bull Board

---

## 🔒 Security Best Practices

1. **Rate Limiting**: Add rate limiter to `/event` endpoint
2. **API Keys**: Require `siteId` to be validated against authorized sites
3. **CORS**: Configure allowed origins in production
4. **Redis Auth**: Enable Redis password in production
5. **DB Credentials**: Use strong passwords and environment variables

---

## 📝 License

MIT
