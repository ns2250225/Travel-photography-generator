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
    // 调用开源搜索接口
    const res = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        format: 'json',
        q: query,
        limit: 5 // Return multiple results
      }
    });

    return res.data;
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
