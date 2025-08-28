# Production Setup Guide - Simple Approach

## What We Did

Instead of updating every single API call in your app, we created a **centralized axios client** that automatically handles the base URL and authentication.

## How It Works

### 1. Configured Axios Client (`frontend/src/config/api.js`)
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Automatically add auth token to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { apiClient };
```

### 2. Simple Usage in Components
Instead of changing every API call, just:

**Before:**
```javascript
import axios from 'axios';
// Complex URL construction and manual auth headers
axios.get('/api/inventory/events', { headers: { Authorization: `Bearer ${token}` }})
```

**After:**
```javascript
import { apiClient } from '../config/api';
// Simple relative URLs, auth is automatic
apiClient.get('/api/inventory/events')
```

## For Your Remaining Components

For any other components making API calls, just:

1. **Replace** `import axios from 'axios'` with `import { apiClient } from '../config/api'`
2. **Replace** `axios.get/post/put/delete` with `apiClient.get/post/put/delete`
3. **Remove** manual Authorization headers (they're added automatically)
4. **Keep** your existing relative URLs like `/api/auth/login`

## Production Deployment

### 1. Update Backend URL
```bash
# Edit frontend/.env.production
REACT_APP_API_URL=https://your-actual-backend-domain.com
```

### 2. Build and Deploy
```bash
cd frontend
npm run build
# Deploy the build folder to your hosting service
```

### 3. Backend CORS Configuration
```javascript
// In your server.js
app.use(cors({
  origin: [
    'http://localhost:3001', // Development
    'https://your-frontend-domain.com' // Production
  ],
  credentials: true
}));
```

## Benefits of This Approach

✅ **No need to update every API call** - just change the import  
✅ **Automatic authentication** - tokens added to all requests  
✅ **Automatic error handling** - 401 errors redirect to login  
✅ **Environment-aware** - automatically uses correct URL  
✅ **Easy to maintain** - all API config in one place  

## Quick Migration for Remaining Files

Search your codebase for `import axios from 'axios'` and replace with `import { apiClient } from '../config/api'`, then replace `axios.` with `apiClient.`. That's it!