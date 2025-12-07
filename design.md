# 技术实现方案：AI 智能旅游照生成应用 (Vue + OpenStreetMap 版)

## 1. 项目概述
本项目开发一款基于 Vue.js 的 Web 应用。应用集成开源地图服务 (OSM)，允许用户在地图上选点或搜索地点获取经纬度，结合用户上传的人物照片，调用 `nano-banana-pro` AI 模型生成用户在当地旅游的真实感照片。

## 2. 技术栈架构
*   **前端核心**: Vue 3 (Composition API), Vite, TypeScript (可选)
*   **UI 框架**: Vant UI (移动端适配) 或 Element Plus (PC 端)
*   **地图引擎**: **Leaflet.js** (轻量级开源地图库)
*   **地图图源**: **OpenStreetMap** (免费开源)
*   **地址搜索 (Geocoding)**: **Nominatim API** (OSM 官方提供的搜索服务)
*   **HTTP 请求**: Axios (用于文件上传), Fetch (用于流式生图)

## 3. 核心业务流程
1.  **地图交互**: 加载 OSM 地图 -> 点击地图或搜索地址 -> 获取目标 `lat` (纬度), `lon` (经度)。
2.  **照片上传**: 用户上传参考图 -> 调用 `img.scdn.io` 接口 -> 获得图片 URL。
3.  **参数构建**: 将经纬度填入 Prompt 模板。
4.  **AI 生成**: 调用 `nano-banana-pro` 接口 -> 监听流式响应 (SSE) 更新进度条。
5.  **结果渲染**: 展示最终生成的合成图片。

## 4. 地图服务集成方案 (Leaflet + OSM)

由于使用开源地图，我们需要引入 `leaflet` 库及对应的 CSS。

### 4.1 安装依赖
```bash
npm install leaflet
# 可选：安装搜索插件
npm install leaflet-control-geocoder
```

### 4.2 Vue 地图组件实现
此组件负责渲染地图、处理点击事件获取坐标、以及地址搜索跳转。

```vue
<template>
  <div class="map-container">
    <!-- 搜索框 -->
    <div class="search-box">
      <input v-model="searchQuery" @keyup.enter="searchLocation" placeholder="搜索目的地 (如: Paris)" />
      <button @click="searchLocation">去这里</button>
    </div>
    <!-- 地图容器 -->
    <div id="map" style="height: 400px; width: 100%;"></div>
    
    <div v-if="selectedCoords" class="info-panel">
      已选坐标: {{ selectedCoords.lat.toFixed(4) }}, {{ selectedCoords.lng.toFixed(4) }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const map = ref(null);
const marker = ref(null);
const selectedCoords = ref(null);
const searchQuery = ref('');

// 初始化地图
const initMap = () => {
  // 默认定位 (例如北京)
  map.value = L.map('map').setView([39.9042, 116.4074], 12);

  // 加载 OpenStreetMap 图层
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map.value);

  // 监听地图点击事件
  map.value.on('click', (e) => {
    updateSelection(e.latlng.lat, e.latlng.lng);
  });
};

// 更新选中点状态
const updateSelection = (lat, lng) => {
  selectedCoords.value = { lat, lng };
  
  // 移除旧标记，添加新标记
  if (marker.value) map.value.removeLayer(marker.value);
  marker.value = L.marker([lat, lng]).addTo(map.value);
  
  // 可以在这里触发父组件的回调，将坐标传出去
  // emit('coords-selected', { lat, lng });
};

// 搜索功能 (使用 Nominatim API)
const searchLocation = async () => {
  if (!searchQuery.value) return;
  
  try {
    // 调用开源搜索接口
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: searchQuery.value,
        limit: 1
      }
    });

    if (res.data && res.data.length > 0) {
      const { lat, lon } = res.data[0];
      const newLat = parseFloat(lat);
      const newLng = parseFloat(lon);
      
      // 地图跳转
      map.value.setView([newLat, newLng], 13);
      updateSelection(newLat, newLng);
    } else {
      alert('未找到该地点');
    }
  } catch (error) {
    console.error('搜索失败', error);
  }
};

onMounted(() => {
  initMap();
});
</script>

<style scoped>
/* 修复 Leaflet 默认图标在 Webpack/Vite 下的路径问题需额外处理，此处省略 */
.map-container { position: relative; }
.search-box { position: absolute; top: 10px; left: 50px; z-index: 1000; background: white; padding: 5px; }
</style>
```

## 5. 接口调用逻辑 (Vue Composition API)

### 5.1 上传图片 (Multipart/form-data)
```javascript
// useImageUpload.js
import { ref } from 'vue';
import axios from 'axios';

export function useImageUpload() {
  const uploadUrl = ref('');
  const isUploading = ref(false);

  const uploadImage = async (file) => {
    isUploading.value = true;
    const formData = new FormData();
    formData.append('image', file);
    formData.append('outputFormat', 'png');

    try {
      const res = await axios.post('https://img.scdn.io/api/v1.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        uploadUrl.value = res.data.url;
        return res.data.url;
      } else {
        throw new Error('Upload reported failure');
      }
    } catch (e) {
      console.error(e);
      alert('图片上传失败');
    } finally {
      isUploading.value = false;
    }
  };

  return { uploadUrl, isUploading, uploadImage };
}
```

### 5.2 AI 生图 (流式响应处理)
```javascript
// useAiGeneration.js
import { ref } from 'vue';

export function useAiGeneration() {
  const generationResult = ref(null);
  const progress = ref(0);
  const status = ref('idle'); // idle, generating, success, error

  const generatePhoto = async (lat, lng, imgUrl) => {
    status.value = 'generating';
    progress.value = 0;
    generationResult.value = null;

    // 1. 构建 Prompt
    const prompt = `请根据纬度和经度 【${lat}, ${lng}】 的实际地点，生成符合该地点当前时间氛围与实时天气的真实照片。让指定的角色自然融入场景，看起来像正在当地旅游。`;

    // 2. 准备参数
    const payload = {
      model: "nano-banana-pro",
      prompt: prompt,
      aspectRatio: "auto",
      imageSize: "1K",
      urls: [imgUrl]
    };

    try {
      const response = await fetch('https://grsai.dakka.com.cn/v1/draw/nano-banana', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer sk-b7182e2c0c3248b6aafcedad465af768"
        },
        body: JSON.stringify(payload)
      });

      // 3. 处理流式响应
      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // 解析可能存在的多行数据
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
           try {
             // 某些流式接口会带有 "data: " 前缀 (SSE)，如果是纯 JSON 流则直接 parse
             // 此处假设返回的是纯 JSON 对象片段
             const data = JSON.parse(line);
             
             if (data.progress) progress.value = data.progress;
             
             if (data.status === 'succeeded' && data.results?.length) {
               generationResult.value = data.results[0].url;
               status.value = 'success';
               progress.value = 100;
             }
             
             if (data.status === 'failed' || data.error) {
               throw new Error(data.failure_reason || data.error);
             }
           } catch (jsonError) {
             // 忽略非 JSON 数据行
           }
        }
      }
    } catch (e) {
      status.value = 'error';
      alert('生成失败: ' + e.message);
    }
  };

  return { generationResult, progress, status, generatePhoto };
}
```

## 6. Vue 主页面整合示例
将上述逻辑整合到 `App.vue` 或主视图中。

```vue
<template>
  <div class="app-layout">
    <h2>🗺️ AI 全球旅拍生成器</h2>
    
    <!-- 步骤1: 地图选点 -->
    <section class="step">
      <h3>1. 选择目的地</h3>
      <MapComponent @coords-selected="handleCoords" />
    </section>

    <!-- 步骤2: 上传照片 -->
    <section class="step" v-if="coords">
      <h3>2. 上传人物照</h3>
      <input type="file" @change="handleFileSelect" accept="image/*" />
      <p v-if="isUploading">上传中...</p>
      <img v-if="uploadUrl" :src="uploadUrl" class="preview-img" />
    </section>

    <!-- 步骤3: 生成 -->
    <section class="step" v-if="coords && uploadUrl">
      <h3>3. 魔法生成</h3>
      <button @click="startGeneration" :disabled="status === 'generating'">
        {{ status === 'generating' ? '正在生成...' : '开始生成' }}
      </button>
      
      <!-- 进度条 -->
      <div v-if="status === 'generating'" class="progress-bar">
        <div class="fill" :style="{ width: progress + '%' }"></div>
        <span>{{ progress }}%</span>
      </div>
    </section>

    <!-- 结果展示 -->
    <div v-if="generationResult" class="result-area">
      <h3>✨ 您的旅拍照片:</h3>
      <img :src="generationResult" alt="Result" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MapComponent from './components/MapComponent.vue'; // 引入上面定义的地图组件
import { useImageUpload } from './composables/useImageUpload';
import { useAiGeneration } from './composables/useAiGeneration';

const coords = ref(null);
const { uploadUrl, isUploading, uploadImage } = useImageUpload();
const { generationResult, progress, status, generatePhoto } = useAiGeneration();

const handleCoords = (data) => {
  coords.value = data; // { lat, lng }
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await uploadImage(file);
  }
};

const startGeneration = () => {
  if (coords.value && uploadUrl.value) {
    generatePhoto(coords.value.lat, coords.value.lng, uploadUrl.value);
  }
};
</script>

<style>
/* 简单的样式布局 */
.step { margin: 20px 0; padding: 10px; border: 1px solid #eee; }
.preview-img { width: 100px; height: 100px; object-fit: cover; margin-top: 10px; }
.progress-bar { width: 100%; height: 20px; background: #ddd; margin-top: 10px; position: relative; }
.progress-bar .fill { height: 100%; background: #4caf50; transition: width 0.3s; }
.result-area img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
</style>
```

## 7. 重要注意事项
1.  **CORS 跨域问题**:
    *   在开发环境 (`localhost`) 直接调用第三方 API (`img.scdn.io` 或 `dakka.com.cn`) 可能会遇到跨域拦截。
    *   **解决方案**: 在 Vite 配置 (`vite.config.js`) 中设置 `server.proxy` 代理请求，或者在生产环境使用 Nginx 反向代理。
2.  **API Key 安全**:
    *   当前方案为纯前端实现，Authorization Token 暴露在前端代码中。建议生产环境通过自己的后端 (Node/Go/Python) 进行转发，隐藏 Key。
3.  **Leaflet 坐标系**:
    *   OSM 使用 WGS84 坐标系，与 API 要求的经纬度标准一致，通常无需转换（如果是对接高德/百度地图则需要 GCJ-02/BD-09 转换）。