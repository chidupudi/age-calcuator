# Age Calculator Application - Kubernetes Cluster Architecture

## Cluster Flow Diagram

```mermaid
flowchart TB
    subgraph Browser["🌐 User Browser"]
        USER[User]
    end

    subgraph MinikubeTunnel["🔌 Minikube Service Tunnels"]
        FE_TUNNEL["Frontend Tunnel<br/>127.0.0.1:64328"]
        BE_TUNNEL["Backend Tunnel<br/>127.0.0.1:61807"]
    end

    subgraph Minikube["☸️ Minikube Cluster (Docker Driver)<br/>IP: 192.168.49.2"]

        subgraph Ingress["Ingress Controller"]
            INGRESS_CTRL[Ingress Nginx<br/>Controller]
        end

        subgraph Services["🔷 Kubernetes Services"]
            FE_SVC["frontend-service<br/>NodePort: 30450<br/>Type: NodePort"]
            BE_SVC["backend-service<br/>NodePort: 30400<br/>Type: NodePort"]
        end

        subgraph Frontend["🎨 Frontend Deployment"]
            FE_POD1["Frontend Pod 1<br/>age-calculator-frontend:v4<br/>Port: 4500"]
            FE_POD2["Frontend Pod 2<br/>age-calculator-frontend:v4<br/>Port: 4500"]

            subgraph FE_Container["Frontend Container"]
                NGINX["Nginx Server<br/>Port: 4500"]
                REACT["React App<br/>(Vite Build)"]
                PROXY["Nginx Reverse Proxy<br/>/api/* → backend-service:4000<br/>/backend-health → backend-service:4000/health"]
            end
        end

        subgraph Backend["⚙️ Backend Deployment"]
            BE_POD1["Backend Pod 1<br/>age-calculator-backend<br/>Port: 4000"]
            BE_POD2["Backend Pod 2<br/>age-calculator-backend<br/>Port: 4000"]

            subgraph BE_Container["Backend Container"]
                EXPRESS["Express.js API<br/>Port: 4000"]
                ROUTES["Routes:<br/>/health<br/>/ready<br/>/api/persons"]
            end
        end

        subgraph Probes["🏥 Health Monitoring"]
            LIVENESS["Liveness Probe<br/>GET /health<br/>Every 30s"]
            READINESS["Readiness Probe<br/>GET /ready<br/>Every 10s"]
        end
    end

    USER -->|Access Frontend| FE_TUNNEL
    FE_TUNNEL -->|Port Forward| FE_SVC
    BE_TUNNEL -.->|Optional Direct Access| BE_SVC

    FE_SVC -->|Load Balance| FE_POD1
    FE_SVC -->|Load Balance| FE_POD2

    FE_POD1 --> NGINX
    FE_POD2 --> NGINX
    NGINX --> REACT
    NGINX --> PROXY

    PROXY -->|Internal DNS<br/>backend-service:4000| BE_SVC

    BE_SVC -->|Load Balance| BE_POD1
    BE_SVC -->|Load Balance| BE_POD2

    BE_POD1 --> EXPRESS
    BE_POD2 --> EXPRESS
    EXPRESS --> ROUTES

    LIVENESS -.->|Check Health| BE_POD1
    LIVENESS -.->|Check Health| BE_POD2
    LIVENESS -.->|Check Health| FE_POD1
    LIVENESS -.->|Check Health| FE_POD2

    READINESS -.->|Check Readiness| BE_POD1
    READINESS -.->|Check Readiness| BE_POD2
    READINESS -.->|Check Readiness| FE_POD1
    READINESS -.->|Check Readiness| FE_POD2

    style Minikube fill:#e1f5ff
    style Frontend fill:#ffe1f5
    style Backend fill:#f5ffe1
    style Services fill:#fff5e1
    style Probes fill:#ff9999
    style MinikubeTunnel fill:#ccccff
```

## Request Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Tunnel as Minikube Tunnel
    participant FE_Service as Frontend Service
    participant FE_Pod as Frontend Pod (Nginx)
    participant BE_Service as Backend Service
    participant BE_Pod as Backend Pod (Express)

    User->>Browser: Access http://127.0.0.1:64328
    Browser->>Tunnel: HTTP Request
    Tunnel->>FE_Service: Forward to frontend-service:4500
    FE_Service->>FE_Pod: Load balance to pod
    FE_Pod->>Browser: Return React App (HTML/JS/CSS)

    Note over Browser,FE_Pod: User interacts with UI

    Browser->>FE_Pod: POST /api/persons
    Note over FE_Pod: Nginx Reverse Proxy
    FE_Pod->>BE_Service: Proxy to backend-service:4000/api/persons
    BE_Service->>BE_Pod: Load balance to pod
    BE_Pod->>BE_Pod: Process request
    BE_Pod->>BE_Service: Return JSON response
    BE_Service->>FE_Pod: Forward response
    FE_Pod->>Browser: Return response
    Browser->>User: Display result

    Note over User,BE_Pod: Health Check Flow

    loop Every 30 seconds
        FE_Service->>FE_Pod: Liveness Probe: GET /health
        FE_Pod->>FE_Service: 200 OK
    end

    loop Every 30 seconds
        BE_Service->>BE_Pod: Liveness Probe: GET /health
        BE_Pod->>BE_Service: 200 OK {status: 'UP'}
    end
```

## Component Details

### Frontend (React + Nginx)
- **Image**: `age-calculator-frontend:v4`
- **Replicas**: 2
- **Port**: 4500
- **Features**:
  - Nginx serves static React app
  - Reverse proxy for API calls
  - Health endpoint at `/health`
  - Liveness & Readiness probes configured

### Backend (Node.js + Express)
- **Image**: `age-calculator-backend:latest`
- **Replicas**: 2
- **Port**: 4000
- **Endpoints**:
  - `GET /health` - Health check (liveness)
  - `GET /ready` - Readiness check
  - `GET /api/persons` - List all persons
  - `POST /api/persons` - Add new person
  - `DELETE /api/persons/:id` - Delete person

### Services
- **frontend-service**: NodePort (30450) - Exposes frontend to outside cluster
- **backend-service**: NodePort (30400) - Exposes backend to outside cluster

### Health Probes
- **Liveness Probe**: Restarts container if fails
  - Initial delay: 10s
  - Period: 30s
  - Timeout: 5s

- **Readiness Probe**: Removes from service if fails
  - Initial delay: 5s
  - Period: 10s
  - Timeout: 3s

## Architecture Benefits

1. **High Availability**: 2 replicas of each service
2. **Load Balancing**: Kubernetes automatically distributes traffic
3. **Health Monitoring**: Automatic restart of unhealthy containers
4. **Service Discovery**: Internal DNS (backend-service:4000)
5. **Reverse Proxy**: Nginx handles CORS and routing
6. **Zero Downtime**: Rolling updates with readiness checks

## Network Flow Summary

```
User Browser
    ↓
Windows Minikube Tunnel (127.0.0.1:64328)
    ↓
Minikube Cluster (192.168.49.2)
    ↓
Frontend Service (NodePort 30450)
    ↓
Frontend Pods (Nginx + React)
    ↓ (via Nginx proxy)
Backend Service (ClusterIP → NodePort 30400)
    ↓
Backend Pods (Express API)
```
