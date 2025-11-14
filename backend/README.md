# Analytics Event Ingestion and Stats System

A production-grade analytics event ingestion and reporting API built with NestJS, BullMQ, PostgreSQL, and Redis. This system provides fast event ingestion with asynchronous processing and real-time statistics reporting.

---

## Architecture Decision: Asynchronous Processing with BullMQ

### **Why BullMQ for Async Processing?**

The system uses **BullMQ** (a Redis-based queue) for asynchronous event processing to achieve several critical goals:

#### **1. Fast Response Times (< 10ms)**
- Event ingestion requests return immediately with `202 Accepted` status
- No database writes block the HTTP request
- Events are validated and queued to Redis, which is extremely fast (in-memory)
- The client receives confirmation in milliseconds, improving UX

#### **2. Reliability & Fault Tolerance**
- **Automatic Retries**: Failed jobs retry 3 times with exponential backoff (2s, 4s, 8s)
- **Job Persistence**: Redis ensures jobs aren't lost even if workers restart
- **Error Handling**: Failed jobs are logged and can be inspected via Bull Board UI
- **Graceful Degradation**: If database is temporarily down, events queue up and process when it recovers

#### **3. Scalability**
- **Worker Concurrency**: Process 10 events simultaneously (configurable)
- **Horizontal Scaling**: Multiple worker instances can share the same queue
- **Backpressure Management**: Queue prevents overwhelming the database
- **Burst Handling**: Can queue thousands of events during traffic spikes

#### **4. Idempotency & Data Integrity**
- Each event has a unique `event_id` (primary key in database)
- Duplicate events are silently ignored via `ON CONFLICT DO NOTHING`
- Retries of the same job won't create duplicate records
- Unique user tracking is guaranteed via ledger table with unique constraints

### **Queue Implementation Details**

```typescript
// 1. Ingestion Flow (Fast Path)
POST /api/event
  → Validate DTO
  → Generate event_id (if not provided)
  → Add job to BullMQ queue
  → Return 202 Accepted (< 10ms)

// 2. Worker Processing (Background)
BullMQ Worker (concurrency: 10)
  → Pull job from queue
  → Execute in database transaction:
     a) Insert into raw_events (idempotent)
     b) Upsert site_daily_aggregates
     c) Upsert site_daily_path_counts
     d) Insert site_daily_unique_users (dedup)
  → Commit transaction
  → Mark job complete
  → Remove from queue
```

### **Queue Configuration**

```typescript
// src/modules/bullmq/bull.config.ts
{
  connection: {
    host: 'localhost',
    port: 6379,
    db: 0
  },
  defaultJobOptions: {
    attempts: 3,                    // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',          // 2s, 4s, 8s delays
      delay: 2000
    },
    removeOnComplete: true,         // Clean up successful jobs
    removeOnFail: false             // Keep failed jobs for debugging
  }
}
```

### **Why Not Synchronous Processing?**

| Approach | Response Time | Reliability | Scalability | Database Load |
|----------|--------------|-------------|-------------|---------------|
| **Synchronous** | ~50-200ms | ❌ Fails if DB down | ❌ Limited by DB | ⚠️ High (every request) |
| **BullMQ (Async)** | ~5-10ms | ✅ Queues survive outages | ✅ Horizontal scaling | ✅ Controlled concurrency |

---

## Database Schema

The system uses **Drizzle ORM** with PostgreSQL 16 and consists of 4 main tables:

### **Table Relationships Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                        raw_events                           │
│  (Event Storage - Immutable Log)                            │
├─────────────────────────────────────────────────────────────┤
│  • event_id (PK, UUID)          - Idempotency key           │
│  • site_id (TEXT)               - Site identifier           │
│  • event_type (TEXT)            - Type of event             │
│  • path (TEXT)                  - Page/resource path        │
│  • user_id (TEXT, nullable)     - Logged-in user ID         │
│  • visitor_id (TEXT, nullable)  - Anonymous visitor cookie  │
│  • event_ts (TIMESTAMPTZ)       - Event occurrence time     │
│  • ingestion_ts (TIMESTAMPTZ)   - Time received by API      │
│  • event_date (DATE, generated) - Derived from event_ts     │
├─────────────────────────────────────────────────────────────┤
│  Indexes:                                                   │
│  • idx_raw_events_site_date (site_id, event_date)          │
│  • idx_raw_events_site_date_path (site_id, event_date, path)│
└─────────────────────────────────────────────────────────────┘
                           │
                           │ (Aggregated by worker)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  site_daily_aggregates                       │
│  (Daily Summary Stats)                                       │
├──────────────────────────────────────────────────────────────┤
│  • site_id (TEXT, PK)           - Site identifier            │
│  • date (DATE, PK)              - Date of stats              │
│  • total_views (BIGINT)         - Count of all events        │
│  • unique_users (BIGINT)        - Distinct users/visitors    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 site_daily_path_counts                       │
│  (Path-Level Metrics)                                        │
├──────────────────────────────────────────────────────────────┤
│  • site_id (TEXT, PK)           - Site identifier            │
│  • date (DATE, PK)              - Date of stats              │
│  • path (TEXT, PK)              - Page/resource path         │
│  • views (BIGINT)               - View count for this path   │
├──────────────────────────────────────────────────────────────┤
│  Indexes:                                                    │
│  • idx_path_counts_site_date_views_desc (for top 10 query)  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              site_daily_unique_users                         │
│  (Deduplication Ledger)                                      │
├──────────────────────────────────────────────────────────────┤
│  • site_id (TEXT)               - Site identifier            │
│  • date (DATE)                  - Date of visit              │
│  • user_id (TEXT, nullable)     - User ID (if logged in)     │
│  • visitor_id (TEXT, nullable)  - Visitor ID (if anonymous)  │
├──────────────────────────────────────────────────────────────┤
│  Unique Constraints:                                         │
│  • unq_site_date_visitor (site_id, date, visitor_id)        │
│    NULLS NOT DISTINCT - prevents duplicate visitor counts    │
│  Indexes:                                                    │
│  • idx_unique_users_site_date (site_id, date)               │
└──────────────────────────────────────────────────────────────┘
```

### **Schema Details**

#### **1. `raw_events` - Event Storage**

This is the immutable event log. Every incoming event creates a single row here.

```typescript
// src/core/database/schema/raw-events.ts
export const rawEvents = pgTable('raw_events', {
  eventId: uuid('event_id').primaryKey().notNull(),
  siteId: text('site_id').notNull(),
  eventType: text('event_type').notNull(),
  path: text('path').notNull(),
  userId: text('user_id'),
  visitorId: text('visitor_id'),
  eventTs: timestamp('event_ts', { withTimezone: true }).notNull(),
  ingestionTs: timestamp('ingestion_ts', { withTimezone: true }).defaultNow().notNull(),
  eventDate: date('event_date').generatedAlwaysAs(
    sql`(event_ts AT TIME ZONE 'UTC')::date`
  ).notNull(),
});
```

**Key Features:**
- `event_id` as primary key ensures **idempotency** (duplicate events ignored)
- `event_date` is **generated column** (computed from `event_ts`)
- Indexes optimize queries by `(site_id, event_date)` and `(site_id, event_date, path)`

#### **2. `site_daily_aggregates` - Daily Summary**

Pre-aggregated daily stats for fast reporting queries.

```typescript
// src/core/database/schema/site-daily-aggregates.ts
export const siteDailyAggregates = pgTable('site_daily_aggregates', {
  siteId: text('site_id').notNull(),
  date: date('date').notNull(),
  totalViews: bigint('total_views', { mode: 'number' }).notNull().default(0),
  uniqueUsers: bigint('unique_users', { mode: 'number' }).notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.siteId, table.date] }),
}));
```

**Update Logic:**
- `total_views` increments on every event
- `unique_users` increments only when new user/visitor detected

#### **3. `site_daily_path_counts` - Path Metrics**

Tracks views per path for "top paths" reporting.

```typescript
// src/core/database/schema/site-daily-path-counts.ts
export const siteDailyPathCounts = pgTable('site_daily_path_counts', {
  siteId: text('site_id').notNull(),
  date: date('date').notNull(),
  path: text('path').notNull(),
  views: bigint('views', { mode: 'number' }).notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.siteId, table.date, table.path] }),
  siteIdDateViewsIdx: index('idx_path_counts_site_date_views_desc').on(
    table.siteId,
    table.date,
    table.views.desc()
  ),
}));
```

**Query Optimization:**
- Index on `(site_id, date, views DESC)` enables fast "top 10 paths" queries

#### **4. `site_daily_unique_users` - Deduplication Ledger**

Ensures each user/visitor is counted only once per day.

```typescript
// src/core/database/schema/site-daily-unique-users.ts
export const siteDailyUniqueUsers = pgTable('site_daily_unique_users', {
  siteId: text('site_id').notNull(),
  date: date('date').notNull(),
  userId: text('user_id'),
  visitorId: text('visitor_id'),
}, (table) => ({
  visitorUnq: unique('unq_site_date_visitor').on(
    table.siteId,
    table.date,
    table.visitorId
  ).nullsNotDistinct(),
  siteIdDateIdx: index('idx_unique_users_site_date').on(table.siteId, table.date),
}));
```

**Deduplication Strategy:**
```sql
-- Worker attempts to insert:
INSERT INTO site_daily_unique_users (site_id, date, visitor_id)
VALUES ('site_abc', '2024-11-14', 'visitor_123')
ON CONFLICT DO NOTHING
RETURNING *;

-- If the insert succeeds (new row created):
--   ✅ Increment unique_users in site_daily_aggregates
-- If the insert fails (constraint violation):
--   ❌ Do nothing (visitor already counted today)
```

---

## Setup Instructions

Follow these steps to build and run the entire system.

### **Prerequisites**

- **Node.js**: v18+ (recommended v20 LTS)
- **npm**: v9+ or **yarn** v1.22+
- **Docker**: v24+ and Docker Compose v2+
- **PostgreSQL**: v16 (required, install separately)
- **Redis**: v7+ (provided via Docker Compose)

### **Step 1: Clone and Install Dependencies**

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### **Step 2: Start Infrastructure with Docker**

Start Redis using Docker Compose:

```bash
# Start services in detached mode
npm run docker:up

# Or use docker-compose directly
docker-compose up -d

# Verify services are running
docker ps

# Stop services
npm run docker:down
```

**Expected Output:**
```
CONTAINER ID   IMAGE                PORTS                    NAMES
xyz789ghi012   redis:7-alpine       0.0.0.0:6379->6379/tcp   analytics_redis
```

**Services Started:**
- **Redis**: `localhost:6379`

### **Step 3: Configure Environment Variables**

Create a `.env.local` file in the `backend/` directory:

```bash
# Copy example template
cp env.example.txt .env.local
```

Edit `.env.local` with the following configuration:

```bash
# Database Configuration
DATABASE_URL=postgresql://analytics_user:analytics_password@localhost:5432/analytics_db

# Redis Configuration (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=  # Optional, only if Redis auth is enabled

# Application Configuration
NODE_ENV=development
PORT=3000

# Swagger API Documentation (optional)
SWAGGER_ENABLED=true
# SWAGGER_USER=admin
# SWAGGER_PASSWORD=secret

# Bull Board Queue UI (optional)
# BULL_BOARD_USER=admin
# BULL_BOARD_PASSWORD=secret
```

### **Step 4: Run Database Migrations**

Apply Drizzle ORM schema to PostgreSQL:

```bash
# Generate migration files (if schema changed)
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

**Verify Migration:**
```bash
# Connect to PostgreSQL (local installation)
psql -U analytics_user -d analytics_db -h localhost

# List tables
\dt

# Expected output:
#  public | raw_events                | table | analytics_user
#  public | site_daily_aggregates     | table | analytics_user
#  public | site_daily_path_counts    | table | analytics_user
#  public | site_daily_unique_users   | table | analytics_user
```

### **Step 5: Start the Application**

#### **Development Mode (with auto-reload)**

```bash
npm run start:dev
```

#### **Production Mode**

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### **Step 6: Verify Installation**

Once the server starts, you should see:

```
[Nest] 12345  - 11/14/2024, 5:00:00 PM   LOG [NestApplication] Nest application successfully started
[Nest] 12345  - 11/14/2024, 5:00:00 PM   LOG Application running on: http://localhost:3000
```

**Access Points:**
- **API Base**: http://localhost:3000/api
- **Swagger Docs**: http://localhost:3000/api (interactive API documentation)
- **Bull Board (Queue UI)**: http://localhost:3000/api/queues/admin
- **Health Check**: http://localhost:3000/api/queues/health

### **Step 7: Test the Installation**

```bash
# Test event ingestion
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/",
    "timestamp": "2024-11-14T10:00:00Z"
  }'

# Expected response (202 Accepted):
# {
#   "success": true,
#   "eventId": "550e8400-e29b-41d4-a716-446655440000",
#   "visitorId": "123e4567-e89b-12d3-a456-426614174000"
# }
```

---

## API Usage

### **Endpoint Overview**

| Endpoint | Method | Description | Response Time |
|----------|--------|-------------|---------------|
| `/api/event` | POST | Ingest analytics event | < 10ms |
| `/api/stats` | GET | Retrieve daily statistics | ~20-50ms |
| `/api/queues/health` | GET | Queue health metrics | ~5ms |
| `/api/queues/admin` | GET | Bull Board UI | - |

---

### **1. POST `/api/event` - Event Ingestion**

Accepts analytics events for asynchronous processing.

#### **Request Body**

```json
{
  "siteId": "site_abc123",
  "eventType": "page_view",
  "path": "/products/shoes",
  "timestamp": "2024-11-14T10:30:00Z",
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### **Field Descriptions**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `siteId` | string | ✅ Yes | Unique identifier for your website/application |
| `eventType` | string | ✅ Yes | Type of event (e.g., `page_view`, `click`, `signup`) |
| `path` | string | ✅ Yes | URL path or resource identifier (e.g., `/home`, `/api/users`) |
| `timestamp` | string (ISO 8601) | ✅ Yes | Event occurrence time in UTC (e.g., `2024-11-14T10:30:00Z`) |
| `eventId` | string (UUID v4) | ❌ No | Optional unique event ID (auto-generated if not provided) |

**Note:** `visitorId` is automatically managed via HTTP cookies. The API sets a persistent `visitor_id` cookie for unique user tracking.

#### **Example cURL Command**

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "my_website",
    "eventType": "page_view",
    "path": "/about",
    "timestamp": "2024-11-14T15:30:00Z"
  }'
```

#### **Success Response (202 Accepted)**

```json
{
  "success": true,
  "eventId": "a3d5e8f0-1234-5678-9abc-def012345678",
  "visitorId": "b7c9e4f2-5678-9012-3456-789abcdef012"
}
```

#### **Error Response (400 Bad Request)**

```json
{
  "statusCode": 400,
  "message": [
    "siteId should not be empty",
    "timestamp must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

---

### **2. GET `/api/stats` - Retrieve Statistics**

Fetches aggregated analytics for a specific site and date.

#### **Query Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `siteId` | string | ✅ Yes | Site identifier | `my_website` |
| `date` | string (YYYY-MM-DD) | ✅ Yes | Date to query | `2024-11-14` |

#### **Example cURL Command**

```bash
curl "http://localhost:3000/api/stats?siteId=my_website&date=2024-11-14"
```

#### **Success Response (200 OK)**

```json
{
  "siteId": "my_website",
  "date": "2024-11-14",
  "totalViews": 1250,
  "uniqueUsers": 320,
  "topPaths": [
    { "path": "/products", "views": 450 },
    { "path": "/home", "views": 380 },
    { "path": "/about", "views": 120 },
    { "path": "/contact", "views": 95 },
    { "path": "/blog/article-1", "views": 78 },
    { "path": "/pricing", "views": 65 },
    { "path": "/features", "views": 32 },
    { "path": "/login", "views": 18 },
    { "path": "/signup", "views": 12 }
  ]
}
```

#### **Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `siteId` | string | Queried site identifier |
| `date` | string | Queried date (YYYY-MM-DD) |
| `totalViews` | number | Total page views on this date |
| `uniqueUsers` | number | Distinct visitors (deduplicated by cookie) |
| `topPaths` | array | Top 10 most-viewed paths, sorted by views descending |

#### **Error Response (404 Not Found)**

Returned when no stats exist for the given site/date combination.

```json
{
  "statusCode": 404,
  "message": "No stats found for site my_website on 2024-11-14"
}
```

---

### **3. GET `/api/queues/health` - Queue Health Check**

Returns BullMQ queue metrics.

#### **Example cURL Command**

```bash
curl http://localhost:3000/api/queues/health
```

#### **Response (200 OK)**

```json
{
  "analytics-events": {
    "waiting": 5,
    "active": 3,
    "completed": 12450,
    "failed": 2,
    "delayed": 0,
    "total": 12460
  }
}
```

---

## Complete Testing Workflow

### **Test 1: Basic Event Ingestion**

```bash
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/home",
    "timestamp": "2024-11-14T10:00:00Z"
  }'
```

### **Test 2: Multiple Events (Same Visitor)**

Send multiple events to test unique user deduplication:

**Note:** The `visitor_id` cookie is **optional**. If not provided, the backend will automatically generate and set a new `visitor_id` cookie. To test deduplication, manually pass the same `visitor_id` in the Cookie header.

```bash
# Event 1
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=550e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/products",
    "timestamp": "2024-11-14T10:05:00Z"
  }'

# Event 2 (same visitor, different path)
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=550e8400-e29b-41d4-a716-446655440001" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/about",
    "timestamp": "2024-11-14T10:10:00Z"
  }'

# Alternative: Without visitor_id (backend will auto-generate)
curl -X POST http://localhost:3000/api/event \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "test_site",
    "eventType": "page_view",
    "path": "/contact",
    "timestamp": "2024-11-14T10:15:00Z"
  }'
```

### **Test 3: Retrieve Statistics**

Wait 1-2 seconds for background processing, then fetch stats:

```bash
curl "http://localhost:3000/api/stats?siteId=test_site&date=2024-11-14"
```

**Expected Result:**
```json
{
  "siteId": "test_site",
  "date": "2024-11-14",
  "totalViews": 3,
  "uniqueUsers": 1,
  "topPaths": [
    { "path": "/home", "views": 1 },
    { "path": "/products", "views": 1 },
    { "path": "/about", "views": 1 }
  ]
}
```

### **Test 4: Idempotency (Duplicate Events)**

Send the same event multiple times:

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
      \"timestamp\": \"2024-11-14T11:00:00Z\",
      \"eventId\": \"$EVENT_ID\"
    }"
done

# Verify only counted once
curl "http://localhost:3000/api/stats?siteId=test_site&date=2024-11-14"
```

---

## Monitoring and Debugging

### **Bull Board Queue Dashboard**

Access the visual queue management UI at:
```
http://localhost:3000/api/queues/admin
```

Features:
- Real-time job status (waiting, active, completed, failed)
- Job details and payloads
- Manual job retry/removal
- Queue pause/resume controls

### **Database Inspection**

```bash
# Connect to PostgreSQL (local installation)
psql -U analytics_user -d analytics_db -h localhost

# Check raw events
SELECT COUNT(*) FROM raw_events;

# View daily aggregates
SELECT * FROM site_daily_aggregates ORDER BY date DESC LIMIT 10;

# Check unique users ledger
SELECT COUNT(*) FROM site_daily_unique_users;
```

---

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | NestJS | 11.0+ |
| **Queue** | BullMQ | 5.63+ |
| **Database** | PostgreSQL | 16 |
| **ORM** | Drizzle ORM | 0.44+ |
| **Cache/Queue Store** | Redis | 7+ |
| **Validation** | class-validator | 0.14+ |
| **API Docs** | Swagger (OpenAPI 3.0) | - |
| **Queue UI** | Bull Board | 6.14+ |
| **Runtime** | Node.js | 18+ (LTS) |

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| **Ingestion Latency** | < 10ms | No database writes in request path |
| **Worker Concurrency** | 10 | Configurable in processor |
| **Max Throughput** | ~1000 events/sec | Single worker instance |
| **Retry Attempts** | 3 | Exponential backoff (2s, 4s, 8s) |
| **Idempotency** | 100% | Guaranteed via `event_id` primary key |
| **Unique User Accuracy** | 100% | Deduplicated via unique constraints |

---

## Troubleshooting

### **Issue: Events not processing**

**Symptoms:** Jobs stuck in "waiting" state

**Solutions:**
1. Check Redis connection:
   ```bash
   docker exec -it analytics_redis redis-cli ping
   # Expected: PONG
   ```
2. Verify worker is running (check application logs for "Processor registered")
3. Inspect Bull Board: http://localhost:3000/api/queues/admin

### **Issue: Database connection failed**

**Symptoms:** Error: `connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   # Check PostgreSQL service status (local installation)
   # Windows: Check Services app for PostgreSQL service
   # Linux/Mac: systemctl status postgresql
   ```
2. Check `.env.local` has correct `DATABASE_URL`
3. Test connection manually:
   ```bash
   psql -U analytics_user -d analytics_db -h localhost
   ```

### **Issue: Unique users over-counted**

**Cause:** Client not sending persistent `visitor_id` cookie

**Solution:** Ensure your client preserves cookies across requests. The API automatically sets a `visitor_id` cookie with 1-year expiry.

---

## License

MIT
