#!/bin/bash

# Go Orchestrator API Test Script

BASE_URL="http://localhost:8100"

echo "======================================"
echo "Go Orchestrator API Tests"
echo "======================================"
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Start Workflow
echo "2. Testing Start Workflow..."
WORKFLOW_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/workflow/start")
echo "$WORKFLOW_RESULT" | jq '.'
echo ""
echo ""

# Extract projectId
PROJECT_ID=$(echo "$WORKFLOW_RESULT" | jq -r '.projectId')

if [ "$PROJECT_ID" != "null" ] && [ -n "$PROJECT_ID" ]; then
    # Test 3: List Tasks
    echo "3. Testing List Tasks for project $PROJECT_ID..."
    curl -s "$BASE_URL/api/v1/tasks?projectId=$PROJECT_ID" | jq '.'
    echo ""
    echo ""

    # Test 4: List Contracts
    echo "4. Testing List Contracts for project $PROJECT_ID..."
    curl -s "$BASE_URL/api/v1/contracts?projectId=$PROJECT_ID" | jq '.'
    echo ""
    echo ""
fi

echo "======================================"
echo "Tests Complete"
echo "======================================"
