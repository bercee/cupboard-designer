const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  const heading = document.createElement("h1");
  heading.textContent = "Kitchen Cupboard Cut-List";
  app.append(heading);
}
