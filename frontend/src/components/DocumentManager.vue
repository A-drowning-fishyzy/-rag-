<script setup>
import { ref, onMounted } from "vue";
import { Upload, Refresh, Document } from "@element-plus/icons-vue";
import { fetchDocuments, uploadDocument } from "@/api/rag";
import { showError, showSuccess } from "@/api/http";

const documents = ref([]);
const loading = ref(false);
const uploading = ref(false);

async function loadDocuments() {
  loading.value = true;
  try {
    documents.value = await fetchDocuments();
  } catch (err) {
    showError(err.message);
    documents.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleUpload(options) {
  uploading.value = true;
  try {
    const data = await uploadDocument(options.file);
    showSuccess(data.message);
    await loadDocuments();
  } catch (err) {
    showError(err.message);
  } finally {
    uploading.value = false;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

onMounted(loadDocuments);

defineExpose({ loadDocuments });
</script>

<template>
  <div class="sidebar-panel">
    <div class="panel-header">
      <h2>知识库</h2>
      <el-button :icon="Refresh" circle size="small" :loading="loading" @click="loadDocuments" />
    </div>

    <el-upload
      class="upload-area"
      drag
      :show-file-list="false"
      accept=".txt,.md,.docx"
      :http-request="handleUpload"
      :disabled="uploading"
    >
      <el-icon class="upload-icon"><Upload /></el-icon>
      <div class="upload-text">拖拽文件到此处，或点击上传</div>
      <div class="upload-hint">支持 .txt / .md / .docx</div>
    </el-upload>

    <div class="doc-section">
      <div class="doc-count">共 {{ documents.length }} 个文档</div>
      <el-scrollbar v-loading="loading" class="doc-scroll">
        <el-empty v-if="!loading && documents.length === 0" description="暂无文档" :image-size="64" />
        <div v-for="doc in documents" :key="doc.name" class="doc-item">
          <el-icon class="doc-icon"><Document /></el-icon>
          <div class="doc-info">
            <span class="doc-name" :title="doc.name">{{ doc.name }}</span>
            <span class="doc-size">{{ formatSize(doc.size) }}</span>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<style scoped>
.sidebar-panel {
  display: flex;
  flex-direction: column;
  max-height: 60vh;
  gap: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  border-radius: 12px;
  border: 2px dashed rgba(37, 99, 235, 0.25);
  background: rgba(255, 255, 255, 0.5);
  padding: 24px 16px;
  transition: border-color 0.2s, background 0.2s;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: var(--blue-600);
  background: rgba(239, 246, 255, 0.8);
}

.upload-icon {
  font-size: 36px;
  color: var(--blue-600);
  margin-bottom: 8px;
}

.upload-text {
  font-size: 14px;
  color: #475569;
}

.upload-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.doc-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.doc-count {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.doc-scroll {
  max-height: 200px;
}

.doc-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.45);
  transition: background 0.15s;
}

.doc-item:hover {
  background: rgba(239, 246, 255, 0.8);
}

.doc-icon {
  font-size: 20px;
  color: var(--blue-600);
  flex-shrink: 0;
}

.doc-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.doc-name {
  font-size: 13px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-size {
  font-size: 11px;
  color: #94a3b8;
}
</style>
