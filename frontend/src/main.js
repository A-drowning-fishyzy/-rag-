import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import zhCn from "element-plus/dist/locale/zh-cn.mjs";
import App from "./App.vue";
import "./assets/style.css";

createApp(App).use(ElementPlus, { locale: zhCn }).mount("#app");
