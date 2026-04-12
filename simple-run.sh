#!/bin/bash

# Simple AreaIQ API Test Runner with Reports
echo "🚀 Running AreaIQ API Tests..."
echo "================================"

# Create reports directory
REPORT_DIR="test-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $REPORT_DIR

echo "📁 Reports will be saved to: $REPORT_DIR/"
echo ""

# Run tests and generate reports
echo "🔬 Running HTTP tests and generating reports..."

# Generate timestamped reports
JUNIT_FILE="$REPORT_DIR/junit_$TIMESTAMP.xml"
JSON_FILE="$REPORT_DIR/results_$TIMESTAMP.json"

# Generate JSON report (includes all data)
echo "  📄 Generating JSON report..."
httpyac send tests_files/area-iq-api-tests-httpyac.http --all --json > "$JSON_FILE"

# Generate JUnit XML from the same data
echo "  📄 Generating JUnit XML report..."
httpyac send tests_files/area-iq-api-tests-httpyac.http --all --junit > "$JUNIT_FILE"

echo "  ✅ Reports generated!"
echo ""
echo "✅ Test run complete!"
echo ""
echo "📋 Generated Reports:"
echo "  📄 JUnit XML: $JUNIT_FILE"
echo "  📄 JSON Results: $JSON_FILE"
echo ""

# Show summary immediately
echo "📊 Quick Summary:"
if command -v jq &> /dev/null && [ -f "$JSON_FILE" ]; then
    # Extract HTTP status codes and categorize them
    SUCCESS_2XX=$(jq '[.requests[].response.statusCode | select(. >= 200 and . < 300)] | length' "$JSON_FILE" 2>/dev/null || echo "0")
    SUCCESS_3XX=$(jq '[.requests[].response.statusCode | select(. >= 300 and . < 400)] | length' "$JSON_FILE" 2>/dev/null || echo "0")
    FAILED_4XX=$(jq '[.requests[].response.statusCode | select(. >= 400 and . < 500)] | length' "$JSON_FILE" 2>/dev/null || echo "0")
    FAILED_5XX=$(jq '[.requests[].response.statusCode | select(. >= 500 and . < 600)] | length' "$JSON_FILE" 2>/dev/null || echo "0")
    NO_RESPONSE=$(jq '[.requests[].response.statusCode | select(. == null)] | length' "$JSON_FILE" 2>/dev/null || echo "0")

    # Calculate totals
    TOTAL_SUCCESS=$((SUCCESS_2XX + SUCCESS_3XX))
    TOTAL_FAILED=$((FAILED_4XX + FAILED_5XX + NO_RESPONSE))
    TOTAL_REQUESTS=$((TOTAL_SUCCESS + TOTAL_FAILED))

    echo "  📊 Total Requests: $TOTAL_REQUESTS"
    echo "  ✅ Successful (2xx/3xx): $TOTAL_SUCCESS"
    echo "  ❌ Client Errors (4xx): $FAILED_4XX"
    echo "  💥 Server Errors (5xx): $FAILED_5XX"
    echo "  🚫 No Response: $NO_RESPONSE"

    # Calculate pass/fail percentage (only 2xx codes count as passed)
    if [ "$TOTAL_REQUESTS" -gt 0 ]; then
        SUCCESS_RATE=$((SUCCESS_2XX * 100 / TOTAL_REQUESTS))
        echo "  📈 Success Rate (2xx only): ${SUCCESS_RATE}%"
    fi
else
    echo "  ⚠️  jq not available or results file missing"
    echo "     Install jq: sudo yum install -y jq"
fi

echo ""
echo "💡 View results:"
echo "  - JUnit XML can be imported into CI/CD dashboards"
echo "  - JSON contains detailed test execution data"