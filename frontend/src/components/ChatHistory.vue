<script setup>
import { ref } from "vue";
import { Plus, Delete, ChatLineRound } from "@element-plus/icons-vue";
import { fetchSessions, deleteSession } from "@/api/rag";
import { showError, showSuccess } from "@/api/http";

const props = defineProps({
  activeSessionId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["select", "new-chat", "deleted"]);

const sessions = ref([]);
const loading = ref(false);

async function loadSessions(presetSessions) {
  loading.value = true;
  try {
    if (presetSessions) {
      sessions.value = presetSessions;
    } else {
      const data = await fetchSessions();
      sessions.value = data.sessions || [];
    }
  } catch (err) {
    sessions.value = [];
    if (!loadSessions._warned) {
      showError(err.message);
      loadSessions._warned = true;
    }
  } finally {
    loading.value = false;
  }
}

function handleSelect(session) {
  emit("select", session.id);
}

function handleNewChat() {
  emit("new-chat");
}

async function handleDelete(session, e) {
  e.stopPropagation();
  try {
    const data = await deleteSession(session.id);
    showSuccess("已删除对话");
    sessions.value = data.sessions || [];
    emit("deleted", data);
  } catch (err) {
    showError(err.message);
  }
}

function formatTime(str) {
  if (!str) return "";
  return str.slice(0, 16);
}

defineExpose({ loadSessions });
</script>

<template>
  <div class="history-panel">
    <div class="history-header">
      <h2>历史对话</h2>
      <el-button
        type="primary"
        :icon="Plus"
        size="small"
        @click="handleNewChat"
      >
        新对话
      </el-button>
    </div>

    <el-scrollbar v-loading="loading" class="history-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="history-item"
        :class="{ active: activeSessionId === session.id }"
        @click="handleSelect(session)"
      >
        <el-icon class="history-icon"><ChatLineRound /></el-icon>
        <div class="history-info">
          <span class="history-title" :title="session.title">{{ session.title }}</span>
          <span class="history-time">{{ formatTime(session.updated_at) }}</span>
        </div>
        <el-button
          class="delete-btn"
          :icon="Delete"
          text
          type="danger"
          size="small"
          :disabled="sessions.length <= 1"
          @click="handleDelete(session, $event)"
        />
      </div>
    </el-scrollbar>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 16px;
  gap: 12px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.history-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.history-list {
  flex: 1;
  min-height: 0;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.5);
}

.history-item.active {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.25);
}

.history-icon {
  font-size: 18px;
  color: var(--blue-600);
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-title {
  font-size: 13px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: #94a3b8;
}

.delete-btn {
  flex-shrink: 0;
  opacity: 0;
}

.history-item:hover .delete-btn {
  opacity: 1;
}
</style>
