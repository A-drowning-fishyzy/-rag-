<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { Promotion, User, Plus } from "@element-plus/icons-vue";
import { streamChat, fetchSessionMessages, fetchConfig } from "@/api/rag";
import { showError } from "@/api/http";

const props = defineProps({
  sessionId: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(["message-sent"]);

const question = ref("");
const messages = ref([]);
const sendingCount = ref(0);
const chatScrollRef = ref(null);
const enableWeb = ref(false);
const selectedModel = ref("");
const modelOptions = ref([]);

const MODE_TAG_TYPE = {
  rag: "success",
  llm: "info",
  web_search: "warning",
};

async function loadConfig() {
  try {
    const data = await fetchConfig();
    modelOptions.value = data.models || [];
    selectedModel.value = data.default_model || modelOptions.value[0]?.id || "";
  } catch (err) {
    showError(err.message);
  }
}

onMounted(() => {
  loadConfig();
  nextTick(() => {
    const wrap = chatScrollRef.value?.wrapRef;
    if (wrap) {
      wrap.addEventListener("scroll", markUserScroll, { passive: true });
    }
  });
});

const stickToBottom = ref(true);

function isNearBottom(wrap, threshold = 96) {
  return wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight <= threshold;
}

function markUserScroll() {
  const wrap = chatScrollRef.value?.wrapRef;
  if (wrap) stickToBottom.value = isNearBottom(wrap);
}

async function scrollToBottom(force = false) {
  await nextTick();
  const wrap = chatScrollRef.value?.wrapRef;
  if (!wrap) return;
  if (force) stickToBottom.value = true;
  if (force || stickToBottom.value) {
    wrap.scrollTop = wrap.scrollHeight;
  }
}

async function loadSessionMessages(id) {
  if (!id) {
    messages.value = [];
    return;
  }
  try {
    const data = await fetchSessionMessages(id);
    messages.value = (data.messages || []).map((m) => ({
      role: m.role,
      content:
        m.role === "assistant" && m.content.startsWith("[错误]")
          ? ""
          : m.content,
      mode: "",
      modeLabel: "",
      loading: false,
      error:
        m.role === "assistant" && m.content.startsWith("[错误]")
          ? m.content
          : "",
    }));
    await scrollToBottom();
  } catch (err) {
    showError(err.message);
    messages.value = [];
  }
}

watch(
  () => props.sessionId,
  (id) => {
    loadSessionMessages(id);
  },
  { immediate: true }
);

async function askStream() {
  const q = question.value.trim();
  if (!q || !props.sessionId) return;

  const sessionAtStart = props.sessionId;

  messages.value.push({ role: "user", content: q });
  messages.value.push({
    role: "assistant",
    content: "",
    mode: "",
    modeLabel: "",
    loading: true,
  });
  const assistantIdx = messages.value.length - 1;
  question.value = "";
  sendingCount.value += 1;
  await scrollToBottom(true);

  let streamOk = false;

  try {
    await streamChat(
      q,
      5,
      props.sessionId,
      {
        enableWeb: enableWeb.value,
        model: selectedModel.value || null,
      },
      {
        onEvent(payload) {
          if (props.sessionId !== sessionAtStart) return;
          const msg = messages.value[assistantIdx];
          if (!msg) return;
          if (payload.type === "meta") {
            msg.mode = payload.mode || "";
            msg.modeLabel = payload.mode_label || "";
            msg.loading = false;
          } else if (payload.type === "token") {
            msg.content += payload.content;
            msg.loading = false;
            scrollToBottom();
          } else if (payload.type === "done") {
            msg.loading = false;
            streamOk = true;
          } else if (payload.type === "error") {
            msg.loading = false;
            msg.error = payload.content || "生成失败";
          }
        },
      }
    );
    const msg = messages.value[assistantIdx];
    if (!msg.content && !msg.error) {
      msg.error = "未收到回答，请检查后端日志";
    } else if (msg.content) {
      streamOk = true;
    }
  } catch (err) {
    const msg = messages.value[assistantIdx];
    msg.content = "";
    msg.loading = false;
    msg.error = err.message;
    showError(err.message);
  } finally {
    sendingCount.value = Math.max(0, sendingCount.value - 1);

    if (props.sessionId !== sessionAtStart) {
      await loadSessionMessages(props.sessionId);
    } else if (streamOk) {
      emit("message-sent");
    }

    if (props.sessionId === sessionAtStart) {
      await scrollToBottom();
    }
  }
}

function onKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askStream();
  }
}

function resetMessages() {
  messages.value = [];
  question.value = "";
}

defineExpose({ resetMessages });
</script>

<template>
  <div class="chat-panel">
    <el-scrollbar ref="chatScrollRef" class="chat-messages">
      <div v-if="messages.length === 0" class="welcome">
        <div class="welcome-icon">💬</div>
        <h3>你好，有什么可以帮你的？</h3>
        <p>优先检索知识库；未命中时可走模型，开启联网后还可搜索网络。</p>
      </div>

      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="message-row"
        :class="msg.role"
      >
        <div class="avatar" :class="msg.role">
          <el-icon v-if="msg.role === 'user'"><User /></el-icon>
          <span v-else>AI</span>
        </div>
        <div class="bubble" :class="msg.role">
          <div v-if="msg.loading && !msg.content" class="typing">
            <span /><span /><span />
          </div>
          <div v-else-if="msg.error" class="error-text">{{ msg.error }}</div>
          <div v-else class="content">{{ msg.content }}</div>

          <div v-if="msg.modeLabel" class="mode-tag">
            <el-tag
              size="small"
              :type="MODE_TAG_TYPE[msg.mode] || 'info'"
              effect="plain"
              round
            >
              {{ msg.modeLabel }}
            </el-tag>
          </div>

        </div>
      </div>
    </el-scrollbar>

    <div class="chat-input-area">
      <div class="input-main">
        <div class="input-card" :class="{ 'web-on': enableWeb }">
          <el-popover
            placement="top-end"
            :width="240"
            trigger="click"
            popper-class="chat-options-popover"
          >
            <template #reference>
              <el-button
                class="options-btn"
                :icon="Plus"
                circle
                size="small"
              />
            </template>
            <div class="popover-options">
              <div class="option-row">
                <span class="option-label">联网搜索</span>
                <el-switch
                  v-model="enableWeb"
                  inline-prompt
                  active-text="开"
                  inactive-text="关"
                />
              </div>
              <div class="option-row">
                <span class="option-label">模型</span>
                <el-select
                  v-model="selectedModel"
                  size="small"
                  placeholder="选择模型"
                  :disabled="!modelOptions.length"
                  class="model-select"
                >
                  <el-option
                    v-for="item in modelOptions"
                    :key="item.id"
                    :label="item.label"
                    :value="item.id"
                  />
                </el-select>
              </div>
            </div>
          </el-popover>
          <span v-if="enableWeb" class="web-badge">联网</span>
          <el-input
            v-model="question"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="输入问题，Enter 发送，Shift+Enter 换行"
            @keydown="onKeydown"
          />
        </div>
        <el-button
          type="primary"
          :icon="Promotion"
          circle
          size="large"
          class="send-btn"
          :loading="sendingCount > 0"
          :disabled="!question.trim()"
          @click="askStream"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: transparent;
}

.chat-messages {
  flex: 1;
  min-height: 0;
}

.chat-messages :deep(.el-scrollbar__view) {
  padding: 24px;
}

.welcome {
  text-align: center;
  padding: 140px 20px 60px;
  color: #64748b;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome h3 {
  margin: 0 0 8px;
  color: #334155;
  font-size: 20px;
}

.welcome p {
  margin: 0;
  font-size: 14px;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
}

.avatar.user {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  color: #fff;
}

.avatar.assistant {
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  color: #fff;
}

.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.7;
  font-size: 14px;
}

.bubble.user {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.bubble.assistant {
  background: rgba(255, 255, 255, 0.65);
  color: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-bottom-left-radius: 4px;
}

.content {
  white-space: pre-wrap;
  word-break: break-word;
}

.error-text {
  color: #dc2626;
}

.mode-tag {
  margin-top: 8px;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--blue-500);
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing span:nth-child(1) { animation-delay: -0.32s; }
.typing span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input-area {
  padding: 12px 24px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.4);
}

.input-main {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.input-card {
  position: relative;
  flex: 1;
  min-width: 0;
}

.input-card :deep(.el-textarea__inner) {
  border-radius: 12px;
  padding: 12px 44px 12px 16px;
  font-size: 14px;
  box-shadow: none;
  background: rgba(255, 255, 255, 0.75);
  border-color: rgba(255, 255, 255, 0.8);
}

.input-card.web-on :deep(.el-textarea__inner) {
  border-color: rgba(59, 130, 246, 0.45);
  padding-left: 52px;
}

.options-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(148, 163, 184, 0.35);
}

.web-badge {
  position: absolute;
  top: 8px;
  left: 12px;
  z-index: 2;
  font-size: 11px;
  line-height: 1;
  padding: 3px 6px;
  border-radius: 999px;
  color: #2563eb;
  background: rgba(219, 234, 254, 0.85);
  border: 1px solid rgba(147, 197, 253, 0.6);
  pointer-events: none;
}

.popover-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.option-label {
  font-size: 13px;
  color: #475569;
  flex-shrink: 0;
}

.model-select {
  width: 150px;
}

.send-btn {
  flex-shrink: 0;
}
</style>
