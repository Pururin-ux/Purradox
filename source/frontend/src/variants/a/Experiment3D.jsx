import { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Move3d, Pause, Play, RotateCcw } from "lucide-react";
import { Graph, MotionModel, PRESETS, Slider, T, TH, kin, useClock } from "@/components/shared/MotionModel";
import { fmt } from "@/lib/format";

const L = 34;
const X0 = -L / 2 + 2.6;
const RUN = L - 5.4;

function useMats() {
  return useMemo(() => {
    const gradientMap = new THREE.DataTexture(new Uint8Array([60, 140, 255]), 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
    return {
      red: toon("#e63946"),
      white: toon("#f1f5f9"),
      dark: toon("#1b2340"),
      glass: toon("#0b3a5a", { emissive: "#0a7fa8", emissiveIntensity: 0.7 }),
      light: new THREE.MeshBasicMaterial({ color: "#fff3c4" }),
      rail: toon("#9aa3c7"),
      sleeper: toon("#3b2a22"),
      post: toon("#2b3150"),
      amber: new THREE.MeshBasicMaterial({ color: "#FFB830" }),
      ground: toon("#0c1430"),
      platform: toon("#262f52"),
      outline: new THREE.MeshBasicMaterial({ color: "#04060c", side: THREE.BackSide }),
    };
  }, []);
}

function Train({ m, xRef }) {
  const ref = useRef(null);
  const g = useMemo(() => ({
    body: new RoundedBoxGeometry(4.2, 1.25, 1.35, 4, 0.3),
    stripe: new THREE.BoxGeometry(4.16, 0.16, 1.38),
    win: new THREE.BoxGeometry(0.62, 0.38, 1.39),
    front: new RoundedBoxGeometry(0.34, 0.62, 1.04, 2, 0.12),
    bogie: new THREE.BoxGeometry(1.1, 0.3, 1.0),
    rod: new THREE.BoxGeometry(0.95, 0.06, 0.06),
    lamp: new THREE.SphereGeometry(0.12, 14, 14),
  }), []);
  useFrame(() => {
    if (ref.current) ref.current.position.x = xRef.current;
  });
  return (
    <group ref={ref} position={[X0, 1.02, 0]}>
      <mesh geometry={g.body} material={m.red} />
      <mesh geometry={g.body} material={m.outline} scale={[1.025, 1.08, 1.08]} />
      <mesh geometry={g.stripe} material={m.white} position={[0, -0.2, 0]} />
      {[-1.4, -0.6, 0.2, 1.0].map((x) => <mesh key={x} geometry={g.win} material={m.glass} position={[x, 0.2, 0]} />)}
      <mesh geometry={g.front} material={m.glass} position={[1.98, 0.18, 0]} />
      <mesh geometry={g.lamp} material={m.light} position={[2.12, -0.32, 0.42]} />
      <mesh geometry={g.lamp} material={m.light} position={[2.12, -0.32, -0.42]} />
      {[-1.3, 1.3].map((x) => <mesh key={x} geometry={g.bogie} material={m.dark} position={[x, -0.75, 0]} />)}
      <group position={[0, 0.66, 0]}>
        <mesh geometry={g.rod} material={m.dark} rotation={[0, 0, 0.55]} position={[-0.22, 0.22, 0]} />
        <mesh geometry={g.rod} material={m.dark} rotation={[0, 0, -0.55]} position={[0.22, 0.22, 0]} />
        <mesh geometry={g.rod} material={m.dark} position={[0, 0.48, 0]} />
      </group>
    </group>
  );
}

function Track({ m }) {
  const sleepers = useRef(null);
  const g = useMemo(() => ({ rail: new THREE.BoxGeometry(L, 0.12, 0.12), sleeper: new THREE.BoxGeometry(0.28, 0.1, 1.7), platform: new THREE.BoxGeometry(L, 0.5, 2.4) }), []);
  const n = Math.floor(L / 0.7);
  useEffect(() => {
    const d = new THREE.Object3D();
    for (let i = 0; i < n; i += 1) {
      d.position.set(-L / 2 + 0.35 + i * 0.7, 0.05, 0);
      d.updateMatrix();
      sleepers.current.setMatrixAt(i, d.matrix);
    }
    sleepers.current.instanceMatrix.needsUpdate = true;
  }, [n]);
  return (
    <group>
      <instancedMesh ref={sleepers} args={[g.sleeper, m.sleeper, n]} />
      <mesh geometry={g.rail} material={m.rail} position={[0, 0.16, 0.55]} />
      <mesh geometry={g.rail} material={m.rail} position={[0, 0.16, -0.55]} />
      <mesh geometry={g.platform} material={m.platform} position={[0, 0.25, -2.4]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={m.ground}>
        <planeGeometry args={[90, 50]} />
      </mesh>
    </group>
  );
}

function Marks({ m, xs }) {
  const g = useMemo(() => ({ pole: new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8), orb: new THREE.SphereGeometry(0.17, 16, 16) }), []);
  return xs.map((x, k) => (
    <group key={k} position={[x, 0, 1.35]}>
      <mesh geometry={g.pole} material={m.post} position={[0, 0.75, 0]} />
      <mesh geometry={g.orb} material={m.amber} position={[0, 1.6, 0]} />
    </group>
  ));
}

function Stars() {
  const geo = useMemo(() => {
    const p = new Float32Array(1200);
    for (let i = 0; i < 400; i += 1) {
      const r = 60 + Math.random() * 30;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.48;
      p[i * 3] = r * Math.sin(ph) * Math.cos(th);
      p[i * 3 + 1] = r * Math.cos(ph);
      p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.4} color="#cfe9ff" transparent opacity={0.85} />
    </points>
  );
}

function Controls() {
  const { camera, gl } = useThree();
  const ref = useRef(null);
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.enablePan = false;
    c.minDistance = 12;
    c.maxDistance = 44;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = 1.42;
    c.target.set(0, 0.8, 0);
    c.update();
    ref.current = c;
    return () => c.dispose();
  }, [camera, gl]);
  useFrame(() => ref.current?.update());
  return null;
}

function World({ xRef, marks }) {
  const m = useMats();
  return (
    <>
      <color attach="background" args={["#070b18"]} />
      <fog attach="fog" args={["#070b18", 34, 90]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 14, 10]} intensity={2.1} color="#ffe2b0" />
      <directionalLight position={[-10, 6, -8]} intensity={0.8} color="#7fdcff" />
      <Stars />
      <Track m={m} />
      <Marks m={m} xs={marks} />
      <Train m={m} xRef={xRef} />
      <Controls />
    </>
  );
}

class Guard extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
};

function Lab({ onTap }) {
  const [v0, setV0] = useState(0);
  const [a, setA] = useState(0.5);
  const [preset, setPreset] = useState("train");
  const k = kin(v0, a);
  const { t, playing, setPlaying, restart } = useClock([v0, a]);
  const scale = RUN / Math.max(k.xAt(T), 10);
  const xRef = useRef(X0);
  xRef.current = X0 + k.xAt(t) * scale;
  const sec = Math.floor(t);
  const marks = useMemo(() => Array.from({ length: sec + 1 }, (_, i) => X0 + kin(v0, a).xAt(i) * scale), [sec, v0, a, scale]);

  const applyPreset = (p) => {
    setPreset(p.id);
    setV0(p.v0);
    setA(p.a);
    onTap?.();
  };

  return (
    <div className="mm-wrap" data-nodrag data-testid="motion-model">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => applyPreset(p)} className={`mm-chip ${preset === p.id ? "is-active" : ""}`} data-testid={`sim-preset-${p.id}`}>{p.label}</button>
        ))}
      </div>
      <div className="x3d mt-3" data-testid="experiment-3d-canvas">
        <Canvas camera={{ position: [-7, 9, 21], fov: 40 }} dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }}>
          <World xRef={xRef} marks={marks} />
        </Canvas>
        <span className="x3d-hint"><Move3d size={14} /> крути сцену</span>
      </div>
      <svg viewBox="0 128 640 244" className="mt-2 w-full" role="img" aria-label="График скорости">
        <Graph th={TH.a} kinematics={k} t={t} v0={v0} />
      </svg>
      <div className="mt-1 grid grid-cols-3 gap-2" data-testid="sim-readouts">
        <div className="mm-read"><span>t</span><b>{fmt(t, 1)} с</b></div>
        <div className="mm-read"><span>υ</span><b>{fmt(k.vAt(t), 1)} м/с</b></div>
        <div className="mm-read"><span>Δr</span><b>{fmt(k.xAt(t), 1)} м</b></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Slider id="sim-slider-v0" label="Начальная скорость υ₀" value={v0} min={0} max={20} step={1} unit="м/с" onChange={(v) => { setV0(v); setPreset(""); }} />
        <Slider id="sim-slider-acceleration" label="Ускорение a" value={a} min={-6} max={3} step={0.5} unit="м/с²" onChange={(v) => { setA(v); setPreset(""); }} />
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" className="mm-btn" onClick={() => setPlaying((p) => !p)} data-testid="sim-play-pause-btn">
          {playing ? <Pause size={18} /> : <Play size={18} />}<span>{playing ? "Пауза" : "Пуск"}</span>
        </button>
        <button type="button" className="mm-btn" onClick={restart} data-testid="sim-restart-btn"><RotateCcw size={18} /><span>Сначала</span></button>
      </div>
      {a < 0 && v0 === 0 && <p className="mm-note mt-3" data-testid="sim-note">Электричка стоит: тормозить нечего. Добавь начальную скорость.</p>}
    </div>
  );
}

export default function Experiment3D({ onTap }) {
  const fallback = <MotionModel theme="a" onTap={onTap} />;
  if (!hasWebGL()) return fallback;
  return <Guard fallback={fallback}><Lab onTap={onTap} /></Guard>;
}
