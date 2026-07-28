import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <main class="shell" aria-labelledby="app-title">
      <p class="eyebrow">Praia, vento e teimosia</p>
      <h1 id="app-title">Vai Dar Volei?</h1>
      <p>Carregando a quadra...</p>
    </main>
  `;
}
