<template>
  <div class="app-container">
    <!-- Full Screen Map Background -->
    <MapComponent ref="mapRef" @coords-selected="handleCoords" />
    
    <!-- Top Center Search Container -->
    <div class="search-container">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          @keyup.enter="performSearch" 
          placeholder="输入地点 (如: Paris)" 
          class="search-input"
        />
        <button @click="performSearch" class="search-btn">🔍</button>
      </div>
      
      <!-- Search Results Dropdown -->
      <ul v-if="searchResults.length > 0" class="search-results">
        <li 
          v-for="(result, index) in searchResults" 
          :key="index" 
          @click="selectLocation(result)"
        >
          {{ result.display_name }}
        </li>
      </ul>
    </div>

    <!-- Instructions Panel -->
    <div class="instructions-panel">
      <h3>AI 旅拍生成器</h3>
      <div class="instruction-content">
        <p><strong>使用方法：</strong></p>
        <ol>
          <li>搜索目的地或直接点击地图的坐标</li>
          <li>上传参考人物图片</li>
          <li>点击生成等待结果</li>
        </ol>
      </div>
    </div>

    <!-- Action Modal Dialog -->
    <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <button class="close-dialog-btn" @click="closeDialog">×</button>
        <h2 class="title">🗺️ AI 旅拍生成器</h2>

        <!-- Location Info -->
        <div v-if="coords" class="coords-display">
           📍 已选位置: {{ coords.lat.toFixed(4) }}, {{ coords.lng.toFixed(4) }}
        </div>

        <!-- Step 2: Upload Photo -->
        <div class="control-group">
          <h3>📸 上传照片</h3>
          <div class="upload-wrapper">
            <input 
              type="file" 
              @change="handleFileSelect" 
              accept="image/*" 
              class="file-input"
            />
          </div>
          <div v-if="isUploading" class="uploading-text">☁️ 上传中...</div>
          <div v-if="localPreviewUrl || uploadUrl" class="preview-container" @click="openLightbox(localPreviewUrl || uploadUrl)">
            <img :src="localPreviewUrl || uploadUrl" class="preview-img" />
            <div class="overlay-icon">🔍</div>
          </div>
        </div>

        <!-- Step 3: Generate -->
        <div class="control-group" :class="{ disabled: !uploadUrl }">
          <h3>✨ 魔法生成</h3>
          <button 
            @click="startGeneration" 
            :disabled="!canGenerate || status === 'generating'" 
            class="generate-btn"
          >
            {{ status === 'generating' ? '🎨 正在绘图...' : '🚀 开始生成' }}
          </button>
          
          <div v-if="status === 'generating'" class="progress-bar">
            <div class="fill" :style="{ width: progress + '%' }"></div>
            <span class="progress-text">{{ progress }}%</span>
          </div>
          
          <div v-if="status === 'error'" class="error-msg">❌ 生成出错: {{ errorMsg }}</div>
        </div>

        <!-- Result Display -->
        <div v-if="generationResult" class="result-area">
          <h3>🎉 生成结果</h3>
          <div class="result-img-wrapper" @click="openLightbox(generationResult)">
            <img :src="generationResult" alt="Result" class="result-img" />
            <div class="overlay">🔍 点击预览</div>
          </div>
          <div class="action-buttons">
            <button @click="openLightbox(generationResult)" class="action-btn">预览</button>
            <a href="#" @click.prevent="downloadImage(generationResult)" class="action-btn primary">下载</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content">
        <img :src="lightboxImage" />
        <button class="close-btn" @click="closeLightbox">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import MapComponent from './components/MapComponent.vue';
import { useImageUpload } from './composables/useImageUpload';
import { useAiGeneration } from './composables/useAiGeneration';

const mapRef = ref(null);
const searchQuery = ref('');
const searchResults = ref([]);
const coords = ref(null);
const localPreviewUrl = ref(null);
const lightboxImage = ref(null);
const showDialog = ref(false);

const { uploadUrl, isUploading, uploadImage } = useImageUpload();
const { generationResult, progress, status, errorMsg, generatePhoto } = useAiGeneration();

const canGenerate = computed(() => coords.value && uploadUrl.value);

const handleCoords = (data) => {
  coords.value = data;
  showDialog.value = true;
};

const performSearch = async () => {
  if (mapRef.value && searchQuery.value) {
    const results = await mapRef.value.searchLocation(searchQuery.value);
    if (results && results.length > 0) {
      searchResults.value = results;
    } else {
      searchResults.value = [];
      alert('未找到该地点');
    }
  }
};

const selectLocation = (result) => {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  
  // Update map view
  if (mapRef.value) {
    mapRef.value.flyTo(lat, lng);
  }
  
  // Clear search results
  searchResults.value = [];
  searchQuery.value = result.display_name.split(',')[0];
  
  // Open dialog
  showDialog.value = true;
};

const closeDialog = () => {
  showDialog.value = false;
  
  // Reset state
  uploadUrl.value = '';
  localPreviewUrl.value = null;
  generationResult.value = null;
  progress.value = 0;
  status.value = 'idle';
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (file) {
    localPreviewUrl.value = URL.createObjectURL(file);
    await uploadImage(file);
  }
};

const startGeneration = () => {
  if (canGenerate.value) {
    generatePhoto(coords.value.lat, coords.value.lng, uploadUrl.value);
  }
};

const openLightbox = (url) => {
  lightboxImage.value = url;
};

const closeLightbox = () => {
  lightboxImage.value = null;
};

const downloadImage = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'travel-photo.png';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed', error);
    window.open(url, '_blank');
  }
};
</script>

<style>
.app-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* Search Container - Top Center */
.search-container {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  max-width: 90%;
  z-index: 1000;
}

.search-box {
  display: flex;
  gap: 8px;
  background: rgba(30, 30, 30, 0.85);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  backdrop-filter: blur(8px);
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #444;
  background: #222;
  color: white;
}

.search-btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: none;
  background: #646cff;
  color: white;
  cursor: pointer;
}

.search-results {
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  background: #333;
  border: 1px solid #444;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.search-results li {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #444;
  font-size: 0.9em;
  color: #eee;
  transition: background 0.2s;
}

.search-results li:hover {
  background: #444;
}

/* Instructions Panel */
.instructions-panel {
  position: absolute;
  top: 80px; /* Below search bar area */
  left: 20px;
  width: 280px;
  background: rgba(30, 30, 30, 0.5); /* Semi-transparent */
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 20px;
  border-radius: 12px;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 900;
  pointer-events: none; /* Let clicks pass through if needed, or remove if text should be selectable */
}

.instructions-panel h3 {
  margin: 0 0 12px 0;
  font-size: 1.2em;
  color: #fff;
  text-align: left;
}

.instruction-content {
  font-size: 0.9em;
  line-height: 1.6;
  color: #ddd;
}

.instruction-content ol {
  padding-left: 20px;
  margin: 8px 0 0 0;
}

.instruction-content li {
  margin-bottom: 6px;
}

/* Dialog Overlay */
.dialog-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.4); /* Dim background */
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s;
}

/* Dialog Content */
.dialog-content {
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 24px;
  border-radius: 16px;
  width: 380px;
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.close-dialog-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  color: #aaa;
  font-size: 24px;
  cursor: pointer;
}

.close-dialog-btn:hover {
  color: white;
}

.title {
  text-align: center;
  margin-bottom: 20px;
  font-size: 1.4em;
  font-weight: 600;
}

.coords-display {
  text-align: center;
  margin-bottom: 20px;
  color: #42b883;
  font-weight: bold;
}

.control-group {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.control-group:last-child {
  border-bottom: none;
}

.control-group.disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Reused Styles */
.file-input { width: 100%; padding: 8px; background: #222; border-radius: 6px; }
.preview-container { margin-top: 12px; text-align: center; position: relative; cursor: pointer; border-radius: 8px; overflow: hidden; display: inline-block; }
.preview-img { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #555; transition: transform 0.3s; display: block; }
.preview-container:hover .preview-img { transform: scale(1.05); filter: brightness(0.8); }
.overlay-icon { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.preview-container:hover .overlay-icon { opacity: 1; }

.generate-btn { width: 100%; padding: 12px; font-size: 1.1em; font-weight: bold; border: none; border-radius: 8px; background: linear-gradient(45deg, #646cff, #42b883); color: white; cursor: pointer; transition: transform 0.1s; }
.generate-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.generate-btn:disabled { background: #555; cursor: not-allowed; }

.progress-bar { width: 100%; height: 24px; background: #444; margin-top: 12px; position: relative; border-radius: 12px; overflow: hidden; }
.progress-bar .fill { height: 100%; background: #42b883; transition: width 0.3s ease-out; }
.progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: white; text-shadow: 0 0 4px rgba(0,0,0,0.5); }

.result-area { margin-top: 20px; text-align: center; animation: fadeIn 0.5s; }
.result-img-wrapper { position: relative; cursor: pointer; overflow: hidden; border-radius: 8px; margin-bottom: 12px; }
.result-img { width: 100%; display: block; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); transition: transform 0.3s; }
.result-img-wrapper:hover .result-img { transform: scale(1.02); }
.result-img-wrapper .overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); color: white; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; font-weight: bold; }
.result-img-wrapper:hover .overlay { opacity: 1; }

.action-buttons { display: flex; gap: 10px; justify-content: center; }
.action-btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #555; background: #333; color: white; cursor: pointer; text-decoration: none; font-size: 0.9em; transition: background 0.2s; }
.action-btn.primary { background: #646cff; border-color: #646cff; }
.action-btn:hover { filter: brightness(1.2); }

/* Lightbox */
.lightbox { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s; }
.lightbox-content { position: relative; max-width: 90vw; max-height: 90vh; }
.lightbox-content img { max-width: 100%; max-height: 90vh; border-radius: 4px; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
.close-btn { position: absolute; top: -40px; right: -40px; background: none; border: none; color: white; font-size: 30px; cursor: pointer; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 600px) {
  .dialog-content {
    width: 95%;
    max-width: 95%;
    padding: 16px;
    margin: 10px;
    max-height: 85vh;
  }

  .search-container {
    width: 95%;
    top: 10px;
  }

  .instructions-panel {
    display: none;
  }
  
  .lightbox-content img {
    max-width: 95vw;
  }
  
  .close-btn {
    top: -30px;
    right: 0;
  }
}
</style>
