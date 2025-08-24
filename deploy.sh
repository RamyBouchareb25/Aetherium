#!/bin/bash

# Build and deployment script for Aetherium
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="ramybouchareb/aetherium"
IMAGE_TAG="latest"
REGISTRY="docker.io"
NAMESPACE="default"
CONTEXT="."

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Aetherium Build & Deploy Script"
    echo ""
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  build         Build Docker image"
    echo "  push          Push Docker image to registry"
    echo "  deploy        Deploy to Kubernetes"
    echo "  dev           Start development environment"
    echo "  clean         Clean up Docker images and containers"
    echo ""
    echo "Options:"
    echo "  -t, --tag TAG        Docker image tag (default: latest)"
    echo "  -r, --registry REG   Docker registry (default: none)"
    echo "  -n, --namespace NS   Kubernetes namespace (default: default)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build -t v1.0.0"
    echo "  $0 push -r docker.io/username -t v1.0.0"
    echo "  $0 deploy -n production"
}

build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
    
    if docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" "${CONTEXT}"; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

push_image() {
    if [[ -z "$REGISTRY" ]]; then
        log_error "Registry not specified. Use -r option to specify registry"
        exit 1
    fi
    
    FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Tagging image: ${FULL_IMAGE_NAME}"
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE_NAME}"
    
    log_info "Pushing image: ${FULL_IMAGE_NAME}"
    if docker push "${FULL_IMAGE_NAME}"; then
        log_success "Image pushed successfully"
    else
        log_error "Failed to push image"
        exit 1
    fi
}

deploy_k8s() {
    log_info "Deploying to Kubernetes namespace: ${NAMESPACE}"
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Apply Kubernetes manifests
    if kubectl apply -k k8s/ -n "${NAMESPACE}"; then
        log_success "Deployment successful"
        
        log_info "Checking deployment status..."
        kubectl rollout status deployment/aetherium-deployment -n "${NAMESPACE}"
        
        log_info "Getting service information..."
        kubectl get svc -l app=aetherium -n "${NAMESPACE}"
    else
        log_error "Failed to deploy to Kubernetes"
        exit 1
    fi
}

start_dev() {
    log_info "Starting development environment..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose --profile dev up --build
    elif command -v docker compose &> /dev/null; then
        docker compose --profile dev up --build
    else
        log_error "Docker Compose is not installed"
        exit 1
    fi
}

clean_docker() {
    log_info "Cleaning up Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove build cache
    docker builder prune -f
    
    log_success "Docker cleanup completed"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        build)
            COMMAND="build"
            shift
            ;;
        push)
            COMMAND="push"
            shift
            ;;
        deploy)
            COMMAND="deploy"
            shift
            ;;
        dev)
            COMMAND="dev"
            shift
            ;;
        clean)
            COMMAND="clean"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute command
case "${COMMAND:-}" in
    build)
        build_image
        ;;
    push)
        push_image
        ;;
    deploy)
        deploy_k8s
        ;;
    dev)
        start_dev
        ;;
    clean)
        clean_docker
        ;;
    *)
        log_error "No command specified"
        show_help
        exit 1
        ;;
esac
