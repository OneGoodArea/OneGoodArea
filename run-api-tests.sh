#!/bin/bash

# AreaIQ API Test Runner
# This script runs all HTTP tests and generates reports

echo "🚀 Running AreaIQ API Tests..."
echo "================================="

# Set variables for the test run
TEST_FILE="tests_files/area-iq-api-tests-httpyac.http"
REPORT_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create reports directory
mkdir -p $REPORT_DIR

echo "📁 Test file: $TEST_FILE"
echo "📊 Reports will be saved to: $REPORT_DIR/"
echo ""

# Run all tests with JUnit report (for CI/CD integration)
echo "🔬 Running all tests..."
httpyac send $TEST_FILE \
  --all \
  --output short \
  --output-failed response

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests completed successfully!"
else
    echo ""
    echo "❌ Some tests failed."
fi