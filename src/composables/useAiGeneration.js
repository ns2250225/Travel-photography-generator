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
      // Use proxy path configured in vite.config.js
      const response = await fetch('/api/generate', {
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
             // 此处假设返回的是纯 JSON 对象片段. 
             // If it's SSE format (data: ...), we might need to strip 'data: ' prefix.
             // The design doc assumes direct JSON chunks, but typically SSE has 'data: '.
             // I'll try to parse directly first, as per design doc.
             let jsonStr = line;
             if (line.startsWith('data: ')) {
                jsonStr = line.slice(6);
             }
             if (jsonStr === '[DONE]') continue;

             const data = JSON.parse(jsonStr);
             
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
             // console.warn('JSON parse error', jsonError);
           }
        }
      }
    } catch (e) {
      status.value = 'error';
      alert('生成失败: ' + e.message);
      console.error(e);
    }
  };

  return { generationResult, progress, status, generatePhoto };
}
