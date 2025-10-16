# Age Calculator Application - K8s Ready POC

A simple React frontend and Node.js backend application for calculating age from birth dates, designed for Kubernetes deployment.

## Features

- **React Frontend (Port 4500)**
  - Form 1: Add person with name and birth date
  - Form 2: View all persons with calculated ages
  - Real-time age calculation (years, months, days)
  - Health status monitoring
  - Responsive UI with logging

- **Node.js Backend (Port 4000)**
  - RESTful API for person management
  - In-memory storage (no database)
  - Comprehensive logging (JSON format)
  - Health check endpoints (/health, /ready, /metrics)
  - CORS enabled
  - Graceful shutdown handling

## Project Structure

```
.
├── backend/
│   ├── server.js           # Express server with health checks
│   ├── package.json        # Backend dependencies
│   ├── Dockerfile          # Backend Docker image
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main application
│   │   ├── main.jsx        # Entry point
│   │   ├── index.css       # Styling
│   │   └── components/
│   │       ├── AddPersonForm.jsx    # Form to add persons
│   │       ├── PersonList.jsx       # List with age calculation
│   │       └── HealthStatus.jsx     # Health monitoring
│   ├── package.json        # Frontend dependencies
│   ├── vite.config.js      # Vite configuration
│   ├── nginx.conf          # Nginx configuration for production
│   ├── Dockerfile          # Frontend Docker image
│   └── .dockerignore
├── k8s/
│   ├── backend-deployment.yaml      # Backend K8s deployment
│   ├── frontend-deployment.yaml     # Frontend K8s deployment
│   └── configmap.yaml               # Configuration
├── docker-compose.yaml     # Docker Compose for local testing
└── README.md
```

## Quick Start

### Local Development (Without Docker)

#### Backend

```bash
cd backend
npm install
npm start
# Backend runs on http://localhost:4000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:4500
```

### Using Docker Compose

```bash
# Build and run both services
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- Frontend: http://localhost:4500
- Backend API: http://localhost:4000
- Backend Health: http://localhost:4000/health
- Backend Metrics: http://localhost:4000/metrics

### Kubernetes Deployment

#### 1. Build Docker Images

```bash
# Build backend image
cd backend
docker build -t age-calculator-backend:latest .

# Build frontend image
cd ../frontend
docker build -t age-calculator-frontend:latest .
```

#### 2. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply individually
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

#### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -l app=age-calculator

# Check services
kubectl get svc -l app=age-calculator

# View logs
kubectl logs -l component=backend -f
kubectl logs -l component=frontend -f

# Check health
kubectl exec -it <backend-pod-name> -- wget -qO- http://localhost:4000/health
```

#### 4. Access Application

```bash
# Get NodePort
kubectl get svc frontend-service

# Access frontend (using NodePort 30450)
# http://<node-ip>:30450

# For Minikube
minikube service frontend-service --url
```

## API Endpoints

### Health & Monitoring

- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe
- `GET /metrics` - Application metrics

### Person Management

- `GET /api/persons` - Get all persons
- `POST /api/persons` - Add new person
  ```json
  {
    "name": "John Doe",
    "birthDate": "1990-01-15"
  }
  ```
- `GET /api/persons/:id` - Get person by ID
- `DELETE /api/persons/:id` - Delete person by ID
- `DELETE /api/persons` - Clear all persons

## Kubernetes Configuration

### Backend Deployment
- **Replicas**: 2
- **Resources**:
  - Requests: 128Mi memory, 100m CPU
  - Limits: 256Mi memory, 200m CPU
- **Probes**:
  - Liveness: `/health` every 30s
  - Readiness: `/ready` every 10s

### Frontend Deployment
- **Replicas**: 2
- **Resources**:
  - Requests: 64Mi memory, 50m CPU
  - Limits: 128Mi memory, 100m CPU
- **Probes**:
  - Liveness: `/health` every 30s
  - Readiness: `/health` every 10s

### Services
- **backend-service**: ClusterIP (internal only)
- **frontend-service**: NodePort (external access on port 30450)

## Logging

Both applications implement comprehensive logging:

### Backend Logs (JSON Format)
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Person added successfully",
  "id": "1234567890",
  "name": "John Doe"
}
```

Log levels: INFO, WARN, ERROR

### Frontend Logs
Console logs with prefixes:
- `[Health Check]` - Health monitoring
- `[Fetch]` - Data fetching
- `[Add]` - Person addition
- `[Delete]` - Person deletion
- `[List]` - List operations
- `[Form]` - Form submissions

## Testing Health Checks

```bash
# Backend health
curl http://localhost:4000/health
curl http://localhost:4000/ready
curl http://localhost:4000/metrics

# Frontend health
curl http://localhost:4500/health

# In Kubernetes
kubectl port-forward svc/backend-service 4000:4000
curl http://localhost:4000/health
```

## Scaling

```bash
# Scale backend
kubectl scale deployment age-calculator-backend --replicas=3

# Scale frontend
kubectl scale deployment age-calculator-frontend --replicas=3

# Check status
kubectl get pods -l app=age-calculator
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -l app=age-calculator
kubectl describe pod <pod-name>
```

### View Logs
```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous  # Previous container logs
```

### Test Connectivity
```bash
# Backend to frontend
kubectl exec -it <frontend-pod> -- wget -qO- http://backend-service:4000/health

# Frontend to backend
kubectl exec -it <backend-pod> -- wget -qO- http://localhost:4000/health
```

### Common Issues

1. **Images not found**: Ensure images are built and available
   ```bash
   docker images | grep age-calculator
   ```

2. **Frontend can't reach backend**: Check service names and environment variables
   ```bash
   kubectl get svc
   kubectl describe svc backend-service
   ```

3. **Pods not ready**: Check health check endpoints
   ```bash
   kubectl logs <pod-name>
   kubectl describe pod <pod-name>
   ```

## Environment Variables

### Backend
- `NODE_ENV`: Environment (default: development)
- `PORT`: Server port (default: 4000)

### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:4000)

## Production Considerations

This is a POC application. For production:

1. **Persistence**: Add database (MongoDB, PostgreSQL)
2. **Security**: Add authentication, rate limiting, input validation
3. **Ingress**: Use Ingress controller instead of NodePort
4. **TLS**: Enable HTTPS with certificates
5. **Monitoring**: Add Prometheus, Grafana
6. **CI/CD**: Automate builds and deployments
7. **Image Registry**: Push images to registry (Docker Hub, ECR, GCR)
8. **Resource Limits**: Adjust based on load testing
9. **Backup**: Implement data backup strategy
10. **Error Handling**: Enhanced error pages and recovery

## Tech Stack

- **Frontend**: React 18, Vite, Axios
- **Backend**: Node.js, Express, Morgan
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Web Server**: Nginx (production)

## License

MIT

## Author

POC for Kubernetes deployment
