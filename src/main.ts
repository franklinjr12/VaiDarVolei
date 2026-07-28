import "./styles.css";
import { startApp } from "./app";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  void startApp(app);
}
