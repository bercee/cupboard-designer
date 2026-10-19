import { createCupboardForm } from "./cupboard-form";
import { createCutListTable } from "./cut-list-table";
import { createDesignList } from "./design-list";
import { createOrder } from "./order-state";
import type { Order } from "./order-state";

/** Mount the whole application into `root`. Returns the order for tests. */
export function mountApp(root: HTMLElement): Order {
  const order = createOrder();

  const header = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = "Konyhaszekrény szabáslista";
  const intro = document.createElement("p");
  intro.textContent =
    "Adja meg a szekrények adatait a megrendelés összeállításához. Minden méret milliméterben értendő.";
  header.append(title, intro);

  const formPanel = document.createElement("section");
  formPanel.className = "panel";
  const form = createCupboardForm((design) => order.add(design));
  formPanel.append(form.element);

  const designList = createDesignList((id) => order.remove(id));
  const cutList = createCutListTable();

  const main = document.createElement("main");
  main.append(formPanel, designList.element, cutList.element);

  const render = () => {
    designList.update(order.getDesigns());
    cutList.update(order.getCutList());
  };
  order.subscribe(render);
  render();

  root.replaceChildren(header, main);
  return order;
}
