#!/bin/bash

# Test script to verify unique visitor tracking
# This simulates different browsers by using different visitor IDs

SITE_ID="site_test123"
API_URL="http://localhost:3000/api/event"

echo "Testing unique visitor tracking..."
echo "=================================="
echo ""

# Test 1: First visitor
echo "Test 1: Sending event with visitor_id_1"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=11111111-1111-1111-1111-111111111111" \
  -d "{
    \"siteId\": \"$SITE_ID\",
    \"eventType\": \"page_view\",
    \"path\": \"/home\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"
echo -e "\n"

sleep 2

# Test 2: Second visitor (different ID)
echo "Test 2: Sending event with visitor_id_2"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=22222222-2222-2222-2222-222222222222" \
  -d "{
    \"siteId\": \"$SITE_ID\",
    \"eventType\": \"page_view\",
    \"path\": \"/about\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"
echo -e "\n"

sleep 2

# Test 3: Third visitor (different ID)
echo "Test 3: Sending event with visitor_id_3"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=33333333-3333-3333-3333-333333333333" \
  -d "{
    \"siteId\": \"$SITE_ID\",
    \"eventType\": \"page_view\",
    \"path\": \"/products\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"
echo -e "\n"

sleep 2

# Test 4: Duplicate visitor (same as Test 1)
echo "Test 4: Sending event with visitor_id_1 again (should NOT increment unique users)"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Cookie: visitor_id=11111111-1111-1111-1111-111111111111" \
  -d "{
    \"siteId\": \"$SITE_ID\",
    \"eventType\": \"page_view\",
    \"path\": \"/contact\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"
  }"
echo -e "\n"

sleep 3

# Check stats
TODAY=$(date -u +%Y-%m-%d)
echo "=================================="
echo "Checking stats for today ($TODAY)..."
curl -X GET "http://localhost:3000/api/stats?siteId=$SITE_ID&date=$TODAY"
echo -e "\n"
echo "=================================="
echo "Expected: totalViews=4, uniqueUsers=3"
