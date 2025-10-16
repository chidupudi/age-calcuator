# Kubernetes Health Checks, Readiness & Liveness Probes - Viva Questions & Answers

## 1. What are Health Checks in Kubernetes?

**Answer:**
Health checks are mechanisms that Kubernetes uses to monitor the health and availability of containers running in pods. They help Kubernetes determine:
- Whether a container is running properly (Liveness)
- Whether a container is ready to accept traffic (Readiness)
- Whether a container has started successfully (Startup - K8s 1.16+)

These probes enable Kubernetes to automatically restart unhealthy containers and remove pods from service endpoints if they're not ready, ensuring high availability and reliability.

---

## 2. What is a Liveness Probe?

**Technical Answer:**
A **Liveness Probe** determines if a container is running properly. If a liveness probe fails, Kubernetes kills the container and restarts it according to its restart policy.

**Use Cases:**
- Detect deadlocks where application is running but stuck
- Detect infinite loops or hung processes
- Application crashes but process doesn't exit

**Example from our project:**
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10    # Wait 10s before first probe
  periodSeconds: 30           # Check every 30s
  timeoutSeconds: 5           # Timeout after 5s
  failureThreshold: 3         # Restart after 3 consecutive failures
```

**How it works:**
1. Kubernetes sends HTTP GET request to `http://container-ip:4000/health`
2. If response is 200-399, probe succeeds
3. If response is outside this range or times out, probe fails
4. After 3 consecutive failures, container is killed and restarted

---

## 3. What is a Readiness Probe?

**Technical Answer:**
A **Readiness Probe** determines if a container is ready to accept traffic. If a readiness probe fails, the pod's IP address is removed from the endpoints of all Services that match the pod. Unlike liveness probes, failed readiness probes don't restart the container.

**Use Cases:**
- Application startup time (loading configurations, connecting to databases)
- Temporary overload or maintenance
- Dependency failures (database connection lost)

**Example from our project:**
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 4000
  initialDelaySeconds: 5      # Wait 5s before first probe
  periodSeconds: 10            # Check every 10s
  timeoutSeconds: 3            # Timeout after 3s
  failureThreshold: 2          # Remove from service after 2 failures
```

**How it works:**
1. Kubernetes sends HTTP GET request to `http://container-ip:4000/ready`
2. If response is 200-399, pod receives traffic
3. If response fails, pod is removed from service endpoints
4. Container continues running, probe keeps checking
5. When probe succeeds again, pod is added back to service

---

## 4. What are the types of Probes?

**Answer:**
Kubernetes supports three types of probe mechanisms:

### a) **HTTP GET Probe** (Most Common)
```yaml
httpGet:
  path: /health
  port: 8080
  httpHeaders:
  - name: Custom-Header
    value: HeaderValue
```
- Sends HTTP GET request
- Success: HTTP status 200-399
- Best for: Web applications, REST APIs

### b) **TCP Socket Probe**
```yaml
tcpSocket:
  port: 3306
```
- Attempts to open TCP connection
- Success: Connection established
- Best for: Databases, TCP servers (MySQL, Redis, MongoDB)

### c) **Exec Probe**
```yaml
exec:
  command:
  - cat
  - /tmp/healthy
```
- Executes command inside container
- Success: Exit code 0
- Best for: Custom health logic, file existence checks

**In our MongoDB deployment:**
```yaml
livenessProbe:
  exec:
    command:
    - mongosh
    - --eval
    - "db.adminCommand('ping')"
  initialDelaySeconds: 30
  periodSeconds: 30
```

---

## 5. What is the difference between Liveness and Readiness Probes?

| Aspect | Liveness Probe | Readiness Probe |
|--------|---------------|-----------------|
| **Purpose** | Is the container alive? | Is the container ready to serve traffic? |
| **On Failure** | Container is killed and restarted | Pod removed from service endpoints (no restart) |
| **Use Case** | Detect deadlocks, hung processes | Handle startup delays, temporary unavailability |
| **Endpoint** | `/health` or `/healthz` | `/ready` or `/readiness` |
| **Failure Impact** | Downtime during restart | No downtime, just removed from load balancer |
| **Recovery** | Restart container | Wait for probe to succeed again |

**Example:**
- **Liveness**: Application hangs in infinite loop → Kill and restart
- **Readiness**: Database connection temporarily lost → Stop sending traffic until reconnected

---

## 6. What are Probe Configuration Parameters?

**Answer:**

```yaml
probe:
  initialDelaySeconds: 10  # Delay before first probe
  periodSeconds: 30        # How often to perform probe
  timeoutSeconds: 5        # Timeout for probe response
  successThreshold: 1      # Min consecutive successes to mark as successful
  failureThreshold: 3      # Min consecutive failures to mark as failed
```

### Parameter Details:

**1. initialDelaySeconds**
- Time to wait before starting probes
- Gives container time to start up
- Example: 10 seconds for backend, 30 seconds for database

**2. periodSeconds**
- How often to check
- Liveness: Usually 30-60s (less frequent)
- Readiness: Usually 10-15s (more frequent)

**3. timeoutSeconds**
- Max time to wait for response
- Should be less than periodSeconds
- Typical: 3-5 seconds

**4. failureThreshold**
- Consecutive failures before action
- Liveness: 3 (restart after 3 failures)
- Readiness: 2 (remove from service faster)

**5. successThreshold**
- Must be 1 for liveness probes
- For readiness: Can be higher to ensure stability

---

## 7. Explain your project's health check implementation

**Answer:**

### Backend Health Check Endpoint (`/health`):
```javascript
app.get('/health', (req, res) => {
  log('INFO', 'Health check - liveness probe');
  res.status(200).json({
    status: 'UP',
    service: 'age-calculator-backend',
    timestamp: new Date().toISOString()
  });
});
```

### Backend Readiness Endpoint (`/ready`):
```javascript
app.get('/ready', (req, res) => {
  log('INFO', 'Readiness check');
  res.status(200).json({
    status: 'READY',
    service: 'age-calculator-backend',
    personsCount: persons.length,
    timestamp: new Date().toISOString()
  });
});
```

### Kubernetes Configuration:
```yaml
# Backend Deployment
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2
```

### Frontend Health Check:
```nginx
# nginx.conf
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

---

## 8. What happens during a Rolling Update with Probes?

**Answer:**

### Rolling Update Process:
1. **New Pod Created**: Kubernetes creates new pod with updated image
2. **Container Starts**: Container starts, initialDelaySeconds begins
3. **Readiness Probe Starts**: After initialDelay, readiness probe checks `/ready`
4. **Pod Status**: Pod marked as "Running" but not "Ready"
5. **Probe Succeeds**: Once readiness probe succeeds, pod marked "Ready"
6. **Add to Service**: Pod added to Service endpoints, starts receiving traffic
7. **Old Pod Termination**: Old pod receives SIGTERM, stops receiving traffic
8. **Graceful Shutdown**: Old pod has 30s (terminationGracePeriodSeconds) to finish requests
9. **Pod Deleted**: Old pod removed

### With Probes:
```bash
kubectl rollout status deployment age-calculator-backend
# Waiting for deployment "age-calculator-backend" rollout to finish: 1 out of 2 new replicas have been updated...
# Waiting for deployment "age-calculator-backend" rollout to finish: 1 old replicas are pending termination...
# deployment "age-calculator-backend" successfully rolled out
```

**Zero Downtime Achieved!**

---

## 9. How to test probe failures?

**Answer:**

### Method 1: Modify Health Endpoint
```javascript
let isHealthy = true;

app.get('/health', (req, res) => {
  if (!isHealthy) {
    return res.status(503).json({ status: 'DOWN' });
  }
  res.status(200).json({ status: 'UP' });
});

// Endpoint to simulate failure
app.post('/simulate-failure', (req, res) => {
  isHealthy = false;
  res.json({ message: 'Health check will now fail' });
});
```

### Method 2: Using kubectl
```bash
# Check probe status
kubectl describe pod <pod-name>

# View events
kubectl get events --sort-by='.lastTimestamp'

# Watch pod restarts
kubectl get pods -w

# Check logs
kubectl logs <pod-name> --previous  # Previous crashed container
```

### Expected Behavior:
```
# Liveness failure:
Events:
  Type     Reason     Age   Message
  ----     ------     ----  -------
  Warning  Unhealthy  30s   Liveness probe failed: HTTP probe failed
  Normal   Killing    25s   Container backend failed liveness probe, will be restarted

# Readiness failure:
Events:
  Warning  Unhealthy  15s   Readiness probe failed: HTTP probe failed
```

---

## 10. What are best practices for Health Checks?

**Answer:**

### 1. **Endpoint Design**
- Keep health checks lightweight (< 100ms)
- Don't perform expensive operations
- Check critical dependencies only in readiness
```javascript
// BAD - Too expensive
app.get('/health', async (req, res) => {
  await performFullDatabaseScan();  // ❌ Too slow
  res.json({ status: 'UP' });
});

// GOOD - Quick check
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });  // ✅ Fast
});
```

### 2. **Timing Configuration**
```yaml
# For fast-starting apps (Node.js, Python)
initialDelaySeconds: 5-10
periodSeconds: 10-30

# For slow-starting apps (Java, Spring Boot)
initialDelaySeconds: 30-60
periodSeconds: 30-60
```

### 3. **Separate Endpoints**
- `/health` - Simple alive check
- `/ready` - Check dependencies (DB, cache, external APIs)
- `/metrics` - Detailed metrics (optional)

### 4. **Failure Thresholds**
```yaml
# Liveness: Be patient, avoid unnecessary restarts
failureThreshold: 3
periodSeconds: 30
# Requires 90s of failures before restart

# Readiness: React quickly to issues
failureThreshold: 2
periodSeconds: 10
# Removes from service after 20s
```

### 5. **Resource Limits**
Always set resource limits with health checks:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```
Without limits, OOMKilled pods can't be detected by probes.

---

## 11. Common Mistakes and How to Avoid Them

### ❌ Mistake 1: No initialDelaySeconds
```yaml
# BAD
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  # Missing initialDelaySeconds
```
**Result**: Container killed before it finishes starting

**Fix**: Add appropriate delay
```yaml
# GOOD
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 10  # ✅
```

### ❌ Mistake 2: Same configuration for Liveness and Readiness
```yaml
# BAD - Both same
livenessProbe:
  periodSeconds: 10
  failureThreshold: 3
readinessProbe:
  periodSeconds: 10
  failureThreshold: 3
```

**Fix**: Different strategies
```yaml
# GOOD
livenessProbe:
  periodSeconds: 30          # Less frequent
  failureThreshold: 3        # More patient
readinessProbe:
  periodSeconds: 10          # More frequent
  failureThreshold: 2        # React faster
```

### ❌ Mistake 3: Expensive Health Checks
```javascript
// BAD
app.get('/health', async (req, res) => {
  await checkAllDatabases();      // ❌
  await validateAllConnections(); // ❌
  await runDiagnostics();        // ❌
  res.json({ status: 'UP' });
});
```

**Fix**: Lightweight checks
```javascript
// GOOD
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });  // ✅ Fast
});

app.get('/ready', async (req, res) => {
  // Only check critical dependencies
  const dbOk = await quickDBPing();  // ✅ Quick check
  res.json({ status: dbOk ? 'READY' : 'NOT_READY' });
});
```

---

## 12. Real-World Scenario Questions

### Q: Your pod is in CrashLoopBackOff. What do you check?

**Answer:**
```bash
# 1. Check pod status
kubectl get pods
# NAME                         READY   STATUS             RESTARTS
# backend-xxx                  0/1     CrashLoopBackOff   5

# 2. Describe pod for events
kubectl describe pod backend-xxx
# Look for:
# - Liveness probe failed
# - Readiness probe failed
# - OOMKilled
# - Error messages

# 3. Check logs
kubectl logs backend-xxx
kubectl logs backend-xxx --previous  # Previous crashed container

# 4. Common causes:
# - initialDelaySeconds too short
# - Application crashes on startup
# - Health check endpoint not implemented
# - Port mismatch
```

**Fix:**
```yaml
# Increase initialDelaySeconds
livenessProbe:
  initialDelaySeconds: 30  # Give more time
  failureThreshold: 5      # Be more patient
```

---

## 13. Diagram: How Probes Work

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                        Pod                            │  │
│  │                                                       │  │
│  │  ┌────────────────────────────────────────────────┐ │  │
│  │  │           Container (Backend)                  │ │  │
│  │  │                                                │ │  │
│  │  │  ┌──────────────┐      ┌──────────────┐      │ │  │
│  │  │  │ /health      │      │ /ready       │      │ │  │
│  │  │  │ Endpoint     │      │ Endpoint     │      │ │  │
│  │  │  └──────────────┘      └──────────────┘      │ │  │
│  │  │         ▲                      ▲              │ │  │
│  │  └─────────┼──────────────────────┼──────────────┘ │  │
│  │            │                      │                 │  │
│  │            │                      │                 │  │
│  │    ┌───────┴────────┐    ┌───────┴────────┐       │  │
│  │    │ Liveness       │    │ Readiness      │       │  │
│  │    │ Probe          │    │ Probe          │       │  │
│  │    │ Every 30s      │    │ Every 10s      │       │  │
│  │    └───────┬────────┘    └───────┬────────┘       │  │
│  └────────────┼─────────────────────┼─────────────────┘  │
│               │                     │                     │
│               │ Fails               │ Fails               │
│               ▼                     ▼                     │
│       ┌───────────────┐     ┌─────────────────┐         │
│       │ Restart       │     │ Remove from     │         │
│       │ Container     │     │ Service         │         │
│       └───────────────┘     │ (No Restart)    │         │
│                             └─────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 14. Commands for Demonstration

```bash
# 1. Check probe configuration
kubectl describe deployment age-calculator-backend

# 2. Watch pod status during rollout
kubectl rollout status deployment age-calculator-backend

# 3. Check probe results
kubectl get pods
kubectl describe pod <pod-name> | grep -A 10 "Liveness\|Readiness"

# 4. View events
kubectl get events --sort-by='.lastTimestamp' | grep <pod-name>

# 5. Test health endpoints manually
kubectl port-forward pod/<pod-name> 4000:4000
curl http://localhost:4000/health
curl http://localhost:4000/ready

# 6. Simulate failure
kubectl exec -it <pod-name> -- curl -X POST http://localhost:4000/simulate-failure

# 7. Watch automatic recovery
kubectl get pods -w

# 8. Check restart count
kubectl get pods -o wide
```

---

## Summary: Key Points to Remember

✅ **Liveness Probe**: Detects if container needs restart (deadlock, crash)
✅ **Readiness Probe**: Detects if container can accept traffic (startup, dependencies)
✅ **Types**: HTTP GET, TCP Socket, Exec
✅ **Zero Downtime**: Readiness ensures traffic only goes to ready pods
✅ **Rolling Updates**: Probes enable safe, gradual deployment
✅ **Best Practices**: Lightweight checks, appropriate delays, separate endpoints
✅ **Monitoring**: Use `kubectl describe`, events, and logs

---

**Pro Tip for Viva**:
Always relate your answer back to your actual project implementation. Show the interviewer:
1. Your actual code (`/health` and `/ready` endpoints)
2. Your actual YAML configuration
3. Demonstrate with `kubectl` commands
4. Explain what happens during deployment

Good luck! 🚀
