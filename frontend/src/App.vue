<script setup>
import { ref, onMounted, nextTick } from "vue";
import { FolderOpened } from "@element-plus/icons-vue";
import ChatHistory from "./components/ChatHistory.vue";
import ChatPanel from "./components/ChatPanel.vue";
import DocumentManager from "./components/DocumentManager.vue";
import { initSessions, createSession } from "@/api/rag";
import { showError } from "@/api/http";

const currentSessionId = ref(null);
const docDialogVisible = ref(false);
const historyRef = ref(null);
const chatPanelRef = ref(null);
const docManagerRef = ref(null);
const bootstrapping = ref(true);

async function bootstrap() {
  bootstrapping.value = true;
  try {
    const data = await initSessions();
    currentSessionId.value = data.session_id;
    await nextTick();
    await historyRef.value?.loadSessions(data.sessions);
  } catch (err) {
    showError(err.message);
  } finally {
    bootstrapping.value = false;
  }
}

onMounted(bootstrap);

function handleSelectSession(id) {
  currentSessionId.value = id;
}

async function handleNewChat() {
  try {
    const data = await createSession("新对话");
    currentSessionId.value = data.session_id;
    chatPanelRef.value?.resetMessages();
    await historyRef.value?.loadSessions(data.sessions);
  } catch (err) {
    showError(err.message);
  }
}

async function handleDeleted(data) {
  currentSessionId.value = data.session_id;
  chatPanelRef.value?.resetMessages();
  await historyRef.value?.loadSessions(data.sessions);
}

function handleMessageSent() {
  historyRef.value?.loadSessions();
}

async function openDocDialog() {
  docDialogVisible.value = true;
  await nextTick();
  docManagerRef.value?.loadDocuments();
}
</script>

<template>
  <div v-loading="bootstrapping" class="app-layout">
    <header class="app-header">
      <div class="logo">
        <span class="logo-icon">✦</span>
        <span class="logo-text">RAG 智能问答</span>
      </div>
      <span class="logo-sub">检索增强 · 流式对话</span>
    </header>

    <main class="app-main">
      <aside class="app-sidebar">
        <ChatHistory
          ref="historyRef"
          :active-session-id="currentSessionId"
          @select="handleSelectSession"
          @new-chat="handleNewChat"
          @deleted="handleDeleted"
        />
        <div class="sidebar-footer">
          <el-button :icon="FolderOpened" class="doc-btn" @click="openDocDialog">
            文档管理
          </el-button>
        </div>
      </aside>

      <section class="app-chat">
        <ChatPanel
          v-if="currentSessionId"
          ref="chatPanelRef"
          :session-id="currentSessionId"
          @message-sent="handleMessageSent"
        />
      </section>
    </main>

    <el-dialog
      v-model="docDialogVisible"
      title="知识库文档管理"
      width="520px"
      destroy-on-close
      align-center
    >
      <DocumentManager ref="docManagerRef" />
    </el-dialog>
  </div>
</template>

<style scoped>
.app-layout {
  position: relative;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background:
    linear-gradient(rgba(255, 255, 255, 0.45) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.45) 1px, transparent 1px),
    linear-gradient(145deg, #eef4fb 0%, #dce8f5 48%, #c5daf0 100%);
  background-size: 48px 48px, 48px 48px, 100% 100%;
}

.app-layout::before,
.app-layout::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}

.app-layout::before {
  width: 520px;
  height: 520px;
  top: -120px;
  right: -100px;
  background: rgba(59, 130, 246, 0.28);
}

.app-layout::after {
  width: 420px;
  height: 420px;
  bottom: 5%;
  left: 15%;
  background: rgba(37, 99, 235, 0.18);
}

.app-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 28px;
  background: var(--glass-bg);        /* 和侧边栏、聊天区一致 */
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--glass-border);  /* 边框也统一 */
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 22px;
  color: var(--blue-600);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-sub {
  font-size: 13px;
  color: #64748b;
}

.app-main {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  min-height: 0;
}

.app-sidebar {
  width: 280px;
  flex-shrink: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  flex-shrink: 0;
}

.doc-btn {
  width: 100%;
}

.app-chat {
  flex: 1;
  min-width: 0;
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
}
@media (max-width: 768px) {
  .app-main {
    flex-direction: column;
  }

  .app-sidebar {
    width: 100%;
    max-height: 240px;
  }

  .logo-sub {
    display: none;
  }
}
</style>
