# ============================================
# Sports Analytics API Test Script
# Run this in PowerShell (NOT in the same terminal as your server)
# ============================================

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testing Sports Analytics API" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register a new user
Write-Host "Test 1: Registering new user..." -ForegroundColor Yellow

$registerBody = @{
    email = "john.athlete@example.com"
    password = "password123"
    firstName = "John"
    lastName = "Smith"
    role = "athlete"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "✓ User registered successfully!" -ForegroundColor Green
    Write-Host "User ID: $($registerResponse.user.id)" -ForegroundColor White
    Write-Host "Email: $($registerResponse.user.email)" -ForegroundColor White
    Write-Host "Name: $($registerResponse.user.firstName) $($registerResponse.user.lastName)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Registration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# Test 2: Login
Write-Host "Test 2: Logging in..." -ForegroundColor Yellow

$loginBody = @{
    email = "john.athlete@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "Token received: $($loginResponse.token.Substring(0, 50))..." -ForegroundColor White
    
    # Save token for next test
    $token = $loginResponse.token
    Write-Host ""
} catch {
    Write-Host "✗ Login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit
}

Start-Sleep -Seconds 1

# Test 3: Get current user (protected route)
Write-Host "Test 3: Getting current user info (protected route)..." -ForegroundColor Yellow

$headers = @{
    Authorization = "Bearer $token"
}

try {
    $meResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get -Headers $headers
    Write-Host "✓ Successfully retrieved user info!" -ForegroundColor Green
    Write-Host "User ID: $($meResponse.user.id)" -ForegroundColor White
    Write-Host "Email: $($meResponse.user.email)" -ForegroundColor White
    Write-Host "Role: $($meResponse.user.role)" -ForegroundColor White
    Write-Host "Active: $($meResponse.user.isActive)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Failed to get user info" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Start-Sleep -Seconds 1

# Test 4: Try accessing protected route without token (should fail)
Write-Host "Test 4: Testing protection (accessing without token - should fail)..." -ForegroundColor Yellow

try {
    $unauthorizedResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get
    Write-Host "✗ SECURITY ISSUE: Route is not protected!" -ForegroundColor Red
} catch {
    Write-Host "✓ Route is properly protected!" -ForegroundColor Green
    Write-Host "Expected error received (401 Unauthorized)" -ForegroundColor White
    Write-Host ""
}

# Test 5: Health check
Write-Host "Test 5: Health check..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get
    Write-Host "✓ Server is healthy!" -ForegroundColor Green
    Write-Host "Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ Health check failed" -ForegroundColor Red
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "All tests completed!" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now check Supabase Table Editor to see your new user!" -ForegroundColor Yellow
Write-Host ""