import { act } from "react";
import { createRoot } from "react-dom/client";
import RayConstruction from "./RayConstruction";
import RayBoard from "./RayBoard";
import { makeRayScene, opticLessons, rayCrossing } from "@/lib/rayOptics";

jest.mock("react-router-dom", () => ({ useLocation: () => ({ state: null }) }));

test("a tap previews only the selected point, and a corrected example leads to a fresh attempt", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const priorPoint = global.DOMPoint;
  const priorAct = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("purradox_optics_intro_v1", "seen");
  // Screen and SVG coordinates coincide in this test. The browser handles the real viewport transform.
  global.DOMPoint = class {
    constructor(x,y) { this.x = x; this.y = y; }
    matrixTransform() { return this; }
  };
  try {
    act(() => root.render(<RayConstruction slug="sfericheskie-zerkala" focused/>));
    const board = host.querySelector(".ray-board");
    const svg = board.querySelector("svg");
    svg.getScreenCTM = () => ({ inverse: () => ({}) });
    const tap = (x,y) => act(() => svg.dispatchEvent(new MouseEvent("click", {
      bubbles: true, clientX: 180 + x*23, clientY: 143 - y*23,
    })));
    const click = selector => act(() => host.querySelector(selector).click());
    const confirm = () => click(".ray-submit");

    tap(-2,1);
    tap(-2,2);
    expect(board.dataset.step).toBe("0");
    expect(host.querySelector(".ray-selection").textContent).toContain("y = 2");
    click('button[aria-label="Отменить выбор точки"]');
    expect(host.querySelector(".ray-submit").disabled).toBe(true);

    tap(-2,-2);
    confirm();
    expect(board.dataset.step).toBe("1");
    tap(-2,-2);
    confirm();
    tap(-2,-2);
    expect(board.dataset.step).toBe("2");
    confirm();
    expect(board.dataset.step).toBe("result");
    expect(host.querySelector(".ray-feedback").textContent).toContain("точно отметил пересечение");
    expect(host.querySelectorAll(".ray-reference")).toHaveLength(2);
    expect([...host.querySelectorAll(".ray-steps button")].map(button => button.dataset.verdict)).toEqual(["wrong","wrong","partial"]);

    const oldSource = host.querySelector(".ray-data").textContent;
    click(".ray-next-task");
    expect(host.querySelector(".ray-data").textContent).not.toBe(oldSource);
    expect(board.dataset.step).toBe("0");
    expect(host.querySelector(".ray-submit").disabled).toBe(true);
    expect(host.querySelector(".ray-reference")).toBeNull();
  } finally {
    act(() => root.unmount());
    host.remove();
    localStorage.removeItem("purradox_optics_intro_v1");
    global.DOMPoint = priorPoint;
    global.IS_REACT_ACT_ENVIRONMENT = priorAct;
  }
});


test("the two drawn rays meet at the marked crossing even within one grid cell of the silver", () => {
  const scene = makeRayScene(opticLessons["sfericheskie-zerkala"][0], 0);
  const values = ["-4", "5", "", ""];
  const crossing = rayCrossing(scene, Number(values[0]), Number(values[1]));
  expect(Math.abs(crossing[0])).toBeLessThan(.8);
  const host = document.createElement("div");
  const root = createRoot(host);
  const priorAct = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(() => root.render(<RayBoard scene={scene} values={values} step={2} confirmed={[true,true,false]} crossing={crossing} />));
    const paths = host.querySelectorAll(".ray-outgoing");
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      const coords = path.getAttribute("d").match(/-?[\d.]+/g).map(Number);
      expect(coords).toHaveLength(4);
      const [surfaceX,surfaceY,endX,endY] = coords;
      const incoming = path.parentNode.querySelector(".ray-incoming").getAttribute("d").match(/-?[\d.]+/g).map(Number);
      expect(incoming.slice(-2)).toEqual([surfaceX,surfaceY]);
      const screenX = 180 + 23*crossing[0];
      expect(screenX).toBeLessThan(surfaceX);
      const drawnY = surfaceY + (endY - surfaceY)*(screenX - surfaceX)/(endX - surfaceX);
      expect(drawnY).toBeCloseTo(143 - 23*crossing[1], 7);
    }
  } finally {
    act(() => root.unmount());
    global.IS_REACT_ACT_ENVIRONMENT = priorAct;
  }
});
