import axios from "axios";
import { ElMessage } from "element-plus";

const http = axios.create({
  baseURL: "/",
  timeout: 120000,
});

http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const detail = err.response?.data?.detail;
    let msg =
      (typeof detail === "string" ? detail : null) ||
      err.message ||
      "请求失败";
    if (err.response?.status === 404 && msg === "Not Found") {
      msg = "后端接口未找到，请重启 python ap.py 并访问 http://127.0.0.1:8000";
    }
    return Promise.reject(new Error(msg));
  }
);

export default http;

export function showSuccess(message) {
  ElMessage.success(message);
}

export function showError(message) {
  ElMessage.error(message);
}
