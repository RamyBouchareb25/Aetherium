# Kubernetes Deployment for Aetherium

This directory contains Kubernetes manifests for deploying Aetherium to a Kubernetes cluster.

## 📁 Files Overview

| File | Description |
|------|-------------|
| `deployment.yaml` | Main deployment configuration with 3 replicas |
| `configmap.yaml` | Application configuration and environment variables |
| `ingress.yaml` | Ingress configuration for external access |
| `hpa.yaml` | Horizontal Pod Autoscaler for automatic scaling |
| `pdb.yaml` | Pod Disruption Budget for high availability |
| `kustomization.yaml` | Kustomize configuration for managing resources |

## 🚀 Quick Deployment

### Prerequisites
- Kubernetes cluster (1.19+)
- kubectl configured
- NGINX Ingress Controller (for ingress)
- Metrics Server (for HPA)

### Deploy Everything
```bash
# Apply all manifests directly from GitHub
kubectl apply -f https://raw.githubusercontent.com/RamyBouchareb25/Aetherium/main/k8s/

# Or using kustomize (recommended)
kubectl apply -k https://github.com/RamyBouchareb25/Aetherium/k8s
```

### Check Deployment Status
```bash
# Check pods
kubectl get pods -l app=aetherium

# Check services
kubectl get svc -l app=aetherium

# Check ingress
kubectl get ingress aetherium-ingress

# Check HPA
kubectl get hpa aetherium-hpa
```

## 🔧 Configuration

### Environment Variables
Modify `configmap.yaml` to adjust application settings:

```yaml
data:
  NODE_ENV: "production"
  PORT: "3000"
  HOSTNAME: "0.0.0.0"
  NEXT_TELEMETRY_DISABLED: "1"
```

### Resource Limits
Adjust resource requests and limits in `deployment.yaml`:

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Scaling Configuration
Modify `hpa.yaml` for auto-scaling behavior:

```yaml
minReplicas: 2
maxReplicas: 10
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
```

## 🌐 Ingress Configuration

### Update Domain
Replace `aetherium.yourdomain.com` in `ingress.yaml` with your actual domain:

```yaml
rules:
- host: your-actual-domain.com
  http:
    paths:
    - path: /
      pathType: Prefix
      backend:
        service:
          name: aetherium-service
          port:
            number: 80
```

### TLS Certificate
For HTTPS, ensure you have a TLS secret:

```bash
# Create TLS secret (example with Let's Encrypt)
kubectl create secret tls aetherium-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

## 📊 Monitoring & Observability

### Health Checks
The deployment includes:
- **Liveness Probe**: Checks if the container is running
- **Readiness Probe**: Checks if the container is ready to serve traffic

### Metrics
If you have Prometheus in your cluster, add these annotations to the deployment:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/api/metrics"
```

## 🛡️ Security Considerations

### Pod Security Standards
Add security context to the deployment:

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: aetherium
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
```

### Network Policies
Create network policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: aetherium-netpol
spec:
  podSelector:
    matchLabels:
      app: aetherium
  policyTypes:
  - Ingress
  - Egress
```

## 🔄 CI/CD Integration

### Using with GitOps (ArgoCD, Flux)
The kustomization.yaml file makes it easy to integrate with GitOps tools:

```yaml
# ArgoCD Application example
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: aetherium
spec:
  source:
    repoURL: https://github.com/RamyBouchareb25/aetherium
    path: k8s
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

### Image Updates
Update the image tag in kustomization.yaml:

```yaml
images:
- name: aetherium
  newTag: v1.2.3
```

## 🐛 Troubleshooting

### Common Issues

1. **Pods not starting**:
   ```bash
   kubectl describe pod -l app=aetherium
   kubectl logs -l app=aetherium
   ```

2. **Service not accessible**:
   ```bash
   kubectl get endpoints aetherium-service
   kubectl port-forward svc/aetherium-service 3000:80
   ```

3. **HPA not scaling**:
   ```bash
   kubectl describe hpa aetherium-hpa
   kubectl top pods
   ```

4. **Ingress not working**:
   ```bash
   kubectl describe ingress aetherium-ingress
   kubectl get ingressclass
   ```

### Useful Commands

```bash
# Watch pod status
kubectl get pods -l app=aetherium -w

# Check resource usage
kubectl top pods -l app=aetherium

# Access logs from all pods
kubectl logs -l app=aetherium --all-containers=true

# Delete everything
kubectl delete -k k8s/
```

## 📝 Customization

### Development Environment
For development, you might want to:
- Reduce replicas to 1
- Disable resource limits
- Use NodePort service type
- Disable ingress

### Production Environment
For production, consider:
- Adding resource quotas
- Implementing pod security policies
- Setting up monitoring and alerting
- Using external-dns for automatic DNS management
- Implementing proper backup strategies

## 🔗 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize Documentation](https://kustomize.io/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
