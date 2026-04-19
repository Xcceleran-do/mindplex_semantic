#!/usr/bin/env bash
set -euo pipefail

CLUSTER="${1:?usage: $0 <cluster> <service> [region]}"
SERVICE="${2:?usage: $0 <cluster> <service> [region]}"
REGION="${3:-us-east-1}"

echo "== ECS service events =="
aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION" \
  --query 'services[0].events[0:8].[createdAt,message]' \
  --output table || true

echo
echo "== Current deployments =="
aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION" \
  --query 'services[0].deployments[*].{status:status,rolloutState:rolloutState,rolloutStateReason:rolloutStateReason,taskDefinition:taskDefinition,createdAt:createdAt,updatedAt:updatedAt}' \
  --output table || true

TASK_ARN="$(aws ecs list-tasks \
  --cluster "$CLUSTER" \
  --service-name "$SERVICE" \
  --desired-status STOPPED \
  --region "$REGION" \
  --query 'taskArns[0]' \
  --output text 2>/dev/null || true)"

if [[ -n "${TASK_ARN:-}" && "$TASK_ARN" != "None" ]]; then
  echo
  echo "== Most recent stopped task =="
  aws ecs describe-tasks \
    --cluster "$CLUSTER" \
    --tasks "$TASK_ARN" \
    --region "$REGION" \
    --query 'tasks[0].{stoppedReason:stoppedReason,stopCode:stopCode,taskDefinitionArn:taskDefinitionArn,containers:containers[*].{name:name,lastStatus:lastStatus,exitCode:exitCode,reason:reason,runtimeId:runtimeId}}' \
    --output json

  TD_ARN="$(aws ecs describe-tasks \
    --cluster "$CLUSTER" \
    --tasks "$TASK_ARN" \
    --region "$REGION" \
    --query 'tasks[0].taskDefinitionArn' \
    --output text)"

  CONTAINER_NAME="$(aws ecs describe-task-definition \
    --task-definition "$TD_ARN" \
    --region "$REGION" \
    --query 'taskDefinition.containerDefinitions[0].name' \
    --output text)"

  LOG_GROUP="$(aws ecs describe-task-definition \
    --task-definition "$TD_ARN" \
    --region "$REGION" \
    --query 'taskDefinition.containerDefinitions[0].logConfiguration.options."awslogs-group"' \
    --output text)"

  LOG_PREFIX="$(aws ecs describe-task-definition \
    --task-definition "$TD_ARN" \
    --region "$REGION" \
    --query 'taskDefinition.containerDefinitions[0].logConfiguration.options."awslogs-stream-prefix"' \
    --output text)"

  TASK_ID="${TASK_ARN##*/}"
  LOG_STREAM="${LOG_PREFIX}/${CONTAINER_NAME}/${TASK_ID}"

  echo
  echo "== Attempting exact container log stream =="
  echo "logGroup:   $LOG_GROUP"
  echo "logStream:  $LOG_STREAM"

  if aws logs get-log-events \
    --log-group-name "$LOG_GROUP" \
    --log-stream-name "$LOG_STREAM" \
    --region "$REGION" \
    --limit 200 \
    --query 'events[*].message' \
    --output text >/tmp/ecs_logs.txt 2>/dev/null; then

    echo
    echo "== Container logs =="
    cat /tmp/ecs_logs.txt
    exit 0
  fi

  echo
  echo "Exact stream not found. Falling back to recent streams in $LOG_GROUP ..."
fi

echo
echo "== Recent CloudWatch streams =="
TD_ARN="$(aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --region "$REGION" \
  --query 'services[0].taskDefinition' \
  --output text)"

LOG_GROUP="$(aws ecs describe-task-definition \
  --task-definition "$TD_ARN" \
  --region "$REGION" \
  --query 'taskDefinition.containerDefinitions[0].logConfiguration.options."awslogs-group"' \
  --output text)"

aws logs describe-log-streams \
  --log-group-name "$LOG_GROUP" \
  --region "$REGION" \
  --order-by LastEventTime \
  --descending \
  --max-items 10 \
  --query 'logStreams[*].[logStreamName,lastEventTimestamp]' \
  --output table || true

echo
echo "== Last 15 minutes of logs from $LOG_GROUP =="
aws logs tail "$LOG_GROUP" \
  --region "$REGION" \
  --since 15m || true