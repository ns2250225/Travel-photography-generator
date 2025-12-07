<template>
  <div class="map-container">
    <div id="map"></div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix for Leaflet default icon issues in Webpack/Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const emit = defineEmits(['coords-selected']);

const map = ref(null);
const marker = ref(null);

// 初始化地图
const initMap = () => {
  // 默认定位 (例如北京)
  map.value = L.map('map', {
    zoomControl: false // Move zoom control if needed, or keep default
  }).setView([39.9042, 116.4074], 12);
  
  // Move zoom control to bottom right or somewhere else if left is occupied?
  // Default is top-left. Since our sidebar is on left, maybe move zoom control to top-right.
  L.control.zoom({
    position: 'topright'
  }).addTo(map.value);

  // 加载 Esri World Street Map (全球覆盖，国内访问较稳定)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  }).addTo(map.value);

  // 监听地图点击事件
  map.value.on('click', (e) => {
    updateSelection(e.latlng.lat, e.latlng.lng);
  });
};

// 更新选中点状态
const updateSelection = (lat, lng) => {
  // 移除旧标记，添加新标记
  if (marker.value) map.value.removeLayer(marker.value);
  marker.value = L.marker([lat, lng]).addTo(map.value);
  
  // 触发父组件的回调，将坐标传出去
  emit('coords-selected', { lat, lng });
};

const flyTo = (lat, lng) => {
  if (map.value) {
    map.value.setView([lat, lng], 13);
    updateSelection(lat, lng);
  }
};

// 搜索功能 (使用 Nominatim API)
const searchLocation = async (query) => {
  if (!query) return [];
  
  try {
    // 混合搜索模式: 优先使用高德(国内精准), 同时使用 Photon(国外覆盖)
    const amapKey = 'cff941a4399e578070c8482300404288'; // Web服务 Key
    
    // 1. 并行发起请求
    const [amapRes, photonRes] = await Promise.allSettled([
      axios.get('/amap-search', {
        params: { keywords: query, key: amapKey, datatype: 'all' }
      }),
      axios.get('/photon', {
        params: { q: query, limit: 5 }
      })
    ]);

    let results = [];

    // 2. 处理高德结果 (优先展示)
    if (amapRes.status === 'fulfilled' && amapRes.value.data && amapRes.value.data.tips) {
      const amapResults = amapRes.value.data.tips
        .filter(t => t.location && t.location.length > 0)
        .map(t => {
          const [lng, lat] = t.location.split(',');
          return {
            lat: parseFloat(lat),
            lon: parseFloat(lng),
            display_name: `[国内] ${t.name} (${t.district || ''})`
          };
        });
      results = [...results, ...amapResults];
    }

    // 3. 处理 Photon 结果 (补充国外数据)
    if (photonRes.status === 'fulfilled' && photonRes.value.data && photonRes.value.data.features) {
      const photonResults = photonRes.value.data.features.map(f => ({
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        display_name: `[全球] ${[f.properties.name, f.properties.city, f.properties.country].filter(Boolean).join(', ')}`
      }));
      results = [...results, ...photonResults];
    }

    // 4. 去重 (可选，这里简单合并)
    return results;
  } catch (error) {
    console.error('搜索失败', error);
    throw error;
  }
};

defineExpose({
  searchLocation,
  flyTo
});

onMounted(() => {
  initMap();
});
</script>

<style scoped>
.map-container { 
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}
#map { 
  width: 100%; 
  height: 100%; 
}
</style>
