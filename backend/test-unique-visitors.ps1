# Test script to verify unique visitor tracking
# This simulates different browsers by using different visitor IDs

$SITE_ID = "site_test123"
$API_URL = "http://localhost:3000/api/event"

Write-Host "Testing unique visitor tracking..." -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: First visitor
Write-Host "Test 1: Sending event with visitor_id_1" -ForegroundColor Yellow
$timestamp1 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body1 = @{
    siteId = $SITE_ID
    eventType = "page_view"
    path = "/home"
    timestamp = $timestamp1
} | ConvertTo-Json

$headers1 = @{
    "Content-Type" = "application/json"
    "Cookie" = "visitor_id=11111111-1111-1111-1111-111111111111"
}

Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers1 -Body $body1
Start-Sleep -Seconds 2

# Test 2: Second visitor (different ID)
Write-Host "`nTest 2: Sending event with visitor_id_2" -ForegroundColor Yellow
$timestamp2 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body2 = @{
    siteId = $SITE_ID
    eventType = "page_view"
    path = "/about"
    timestamp = $timestamp2
} | ConvertTo-Json

$headers2 = @{
    "Content-Type" = "application/json"
    "Cookie" = "visitor_id=22222222-2222-2222-2222-222222222222"
}

Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers2 -Body $body2
Start-Sleep -Seconds 2

# Test 3: Third visitor (different ID)
Write-Host "`nTest 3: Sending event with visitor_id_3" -ForegroundColor Yellow
$timestamp3 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body3 = @{
    siteId = $SITE_ID
    eventType = "page_view"
    path = "/products"
    timestamp = $timestamp3
} | ConvertTo-Json

$headers3 = @{
    "Content-Type" = "application/json"
    "Cookie" = "visitor_id=33333333-3333-3333-3333-333333333333"
}

Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers3 -Body $body3
Start-Sleep -Seconds 2

# Test 4: Duplicate visitor (same as Test 1)
Write-Host "`nTest 4: Sending event with visitor_id_1 again (should NOT increment unique users)" -ForegroundColor Yellow
$timestamp4 = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$body4 = @{
    siteId = $SITE_ID
    eventType = "page_view"
    path = "/contact"
    timestamp = $timestamp4
} | ConvertTo-Json

Invoke-RestMethod -Uri $API_URL -Method Post -Headers $headers1 -Body $body4
Start-Sleep -Seconds 3

# Check stats
$TODAY = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd")
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "Checking stats for today ($TODAY)..." -ForegroundColor Cyan
$statsUrl = "http://localhost:3000/api/stats?siteId=$SITE_ID&date=$TODAY"
Invoke-RestMethod -Uri $statsUrl -Method Get
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "Expected: totalViews=4, uniqueUsers=3" -ForegroundColor Green
