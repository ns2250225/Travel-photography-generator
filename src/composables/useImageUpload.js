import { ref } from 'vue';
import axios from 'axios';

export function useImageUpload() {
  const uploadUrl = ref('');
  const isUploading = ref(false);

  const uploadImage = async (file) => {
    isUploading.value = true;
    const formData = new FormData();
    formData.append('image', file);
    // Change to jpg to avoid strict file size limits on png and reduce size
    formData.append('outputFormat', 'jpg');

    try {
      // Use proxy path configured in vite.config.js
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        uploadUrl.value = res.data.url;
        return res.data.url;
      } else {
        // Use the message from the API if available
        throw new Error(res.data.message || 'Upload reported failure');
      }
    } catch (e) {
      console.error(e);
      alert('图片上传失败: ' + (e.message || 'Unknown error'));
    } finally {
      isUploading.value = false;
    }
  };

  return { uploadUrl, isUploading, uploadImage };
}
