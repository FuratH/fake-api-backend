#!/bin/bash

# Parameters passed from the orchestrating VM
SUT_IP=$1
SERVICE_PORT=$2
TIMESTAMP=$3
BUCKET_NAME=$4
USERNAME=$(whoami)

# Run the k6 load test
k6 run /fake-api-backend/k6/script.js -e target="$SUT_IP:$SERVICE_PORT" \
    --out csv=client_results_${SERVICE_PORT}.csv --summary-export client_summary_${SERVICE_PORT}.json

# Wait for the test to complete
wait


gsutil cp client_results_${SERVICE_PORT}.csv gs://duet-benchmarking-results/${TIMESTAMP}/client_results_${SERVICE_PORT}.csv & gsutil cp client_summary_${SERVICE_PORT}.json gs://duet-benchmarking-results/${TIMESTAMP}/client_summary_${SERVICE_PORT}.json


#sudo gcloud compute ssh hamdanfurat@sut --zone europe-west3-c -- \
 #   "gsutil cp '/tmp/cpu_usage.log' 'gs://duet-benchmarking-results/${TIMESTAMP}/cpu_usage.log'"

sudo gcloud compute ssh hamdanfurat@sut --zone europe-west3-c -- \
    "gsutil cp '/tmp/cpu_usage.log' 'gs://duet-benchmarking-results/${TIMESTAMP}/cpu_usage.log' & gsutil cp '/tmp/top_output.log' 'gs://duet-benchmarking-results/${TIMESTAMP}/top_output.log'"


touch /done