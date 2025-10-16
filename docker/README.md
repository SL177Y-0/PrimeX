# 🐳 Docker Setup for PrimeX

This directory contains Docker configurations for running PrimeX services.

---

## 📋 Services

### **Development Environment**
- **WebSocket Server** - Real-time data sync (port 8080)
- **Redis** - Caching and session storage (port 6379)
- **PostgreSQL** - Local database for development (port 5432)
- **Nginx** - Reverse proxy and load balancer (ports 80, 443)

### **Production Environment**
- Same services with production optimizations
- Health checks enabled
- Auto-restart policies
- Resource limits configured

---

## 🚀 Quick Start

### **Development**

```bash
# 1. Copy environment template
cp ../.env.example ../.env

# 2. Fill in required variables
# SUPABASE_URL=your-supabase-url
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 3. Start all services
docker-compose up -d

# 4. View logs
docker-compose logs -f

# 5. Stop all services
docker-compose down
```

### **Production**

```bash
# 1. Set up environment
cp ../.env.production.example ../.env.production

# 2. Start production stack
docker-compose -f docker-compose.production.yml up -d

# 3. Monitor health
docker-compose -f docker-compose.production.yml ps

# 4. View logs
docker-compose -f docker-compose.production.yml logs -f websocket
```

---

## 🔧 Service Details

### **WebSocket Server**

**Dockerfile**: `websocket/Dockerfile`  
**Port**: 8080  
**Health Check**: `http://localhost:8080/health`

**Environment Variables**:
```env
NODE_ENV=development|production
PORT=8080
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key
WS_PORT=8080
REDIS_URL=redis://redis:6379
LOG_LEVEL=debug|info|warn|error
```

**Features**:
- Real-time price updates
- Transaction notifications
- User presence tracking
- Auto-reconnection

---

### **Redis**

**Image**: `redis:7-alpine`  
**Port**: 6379  
**Data**: Persisted to `redis_data` volume

**Configuration**:
- Append-only file (AOF) enabled
- Max memory: 512MB
- Eviction policy: allkeys-lru

**Use Cases**:
- Price caching
- User sessions
- Rate limiting
- Transaction queues

---

### **PostgreSQL** (Development Only)

**Image**: `postgres:15-alpine`  
**Port**: 5432  
**Database**: `primex_dev`  
**User**: `primex`  
**Password**: `primex_dev_password` (change in production!)

**Migrations**: Auto-loaded from `../supabase/migrations`

**Note**: In production, use Supabase hosted database.

---

### **Nginx**

**Image**: `nginx:alpine`  
**Ports**: 80 (HTTP), 443 (HTTPS)  
**Config**: `nginx/nginx.conf`

**Features**:
- Reverse proxy to WebSocket server
- Rate limiting (100 req/s for API, 50 req/s for WS)
- Gzip compression
- SSL/TLS support (uncomment in nginx.conf)
- Health check endpoint

**Endpoints**:
- `/ws` - WebSocket connection
- `/api` - REST API
- `/health` - Health check

---

## 📊 Monitoring

### **Health Checks**

```bash
# Check all services
docker-compose ps

# Check specific service
curl http://localhost:8080/health  # WebSocket
curl http://localhost/health       # Nginx
docker-compose exec redis redis-cli ping  # Redis
```

### **Logs**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f websocket
docker-compose logs -f redis
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 websocket
```

### **Resource Usage**

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up
docker system prune -a --volumes
```

---

## 🔐 Security

### **Production Checklist**

- [ ] Change default PostgreSQL password
- [ ] Set strong Redis password
- [ ] Enable SSL/TLS in Nginx
- [ ] Use environment-specific secrets
- [ ] Enable firewall rules
- [ ] Set up log rotation
- [ ] Configure rate limiting
- [ ] Enable container security scanning

### **SSL/TLS Setup**

1. **Generate certificates** (Let's Encrypt recommended):
```bash
certbot certonly --standalone -d your-domain.com
```

2. **Copy to nginx/ssl directory**:
```bash
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

3. **Uncomment HTTPS server block** in `nginx/nginx.conf`

4. **Restart Nginx**:
```bash
docker-compose restart nginx
```

---

## 🐛 Troubleshooting

### **Service Won't Start**

```bash
# Check logs
docker-compose logs service-name

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart service-name

# Rebuild and restart
docker-compose up -d --build service-name
```

### **Port Already in Use**

```bash
# Find process using port
lsof -i :8080  # Linux/Mac
netstat -ano | findstr :8080  # Windows

# Kill process
kill -9 <PID>  # Linux/Mac
taskkill /F /PID <PID>  # Windows

# Or change port in docker-compose.yml
```

### **Out of Disk Space**

```bash
# Clean up unused images
docker image prune -a

# Remove stopped containers
docker container prune

# Remove unused volumes
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

### **Connection Issues**

```bash
# Check network
docker network ls
docker network inspect primex-network

# Restart network
docker-compose down
docker-compose up -d
```

---

## 🔄 Updates

### **Update Services**

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build

# Remove old images
docker image prune
```

### **Update Configuration**

```bash
# Edit docker-compose.yml or nginx.conf
vim docker-compose.yml

# Apply changes
docker-compose up -d --force-recreate

# Or restart specific service
docker-compose restart service-name
```

---

## 📈 Scaling

### **Horizontal Scaling**

```bash
# Scale WebSocket servers
docker-compose up -d --scale websocket=3

# Nginx will load balance automatically
```

### **Vertical Scaling**

Edit `docker-compose.yml`:
```yaml
services:
  websocket:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## 📝 Best Practices

### **Development**
- Use `docker-compose.yml`
- Mount volumes for hot reload
- Enable debug logging
- Use local PostgreSQL

### **Production**
- Use `docker-compose.production.yml`
- No volume mounts (use built images)
- Set log level to `warn` or `error`
- Use managed database (Supabase)
- Enable health checks
- Set resource limits
- Use SSL/TLS
- Configure monitoring
- Set up log aggregation

---

## 🔗 Related Documentation

- [Nginx Configuration](nginx/nginx.conf)
- [WebSocket Dockerfile](websocket/Dockerfile)
- [Environment Variables](../.env.example)
- [Main README](../README.md)

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review troubleshooting section above
3. Check Docker documentation
4. Contact DevOps team

---

**Last Updated**: October 16, 2025  
**Docker Compose Version**: 3.8  
**Status**: ✅ Production Ready
