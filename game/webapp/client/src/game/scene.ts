// Style reminder: Babylon renders the cold physical city layer; React owns the worn-paper command UI above it.

import { ASSETS } from "./assets";

declare global {
  interface Window { BABYLON?: any }
}

export type GameHandle = { scene: any; dispose: () => void };

export async function createGameScene(engine: any, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const B = window.BABYLON;
  if (!B) throw new Error("Babylon runtime is unavailable");
  const scene = new B.Scene(engine);
  scene.clearColor = new B.Color4(0.047, 0.063, 0.086, 1);

  const camera = new B.ArcRotateCamera("city-camera", -Math.PI / 2, 1.12, 22, new B.Vector3(0, 0, 0), scene);
  camera.lowerRadiusLimit = 18;
  camera.upperRadiusLimit = 26;
  camera.wheelPrecision = 100;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);

  const light = new B.HemisphericLight("moon-light", new B.Vector3(-0.4, 1, -0.3), scene);
  light.intensity = 0.62;
  light.diffuse = new B.Color3(0.53, 0.59, 0.69);
  light.groundColor = new B.Color3(0.08, 0.06, 0.05);

  const ground = B.MeshBuilder.CreateGround("ground", { width: 26, height: 20 }, scene);
  const groundMaterial = new B.StandardMaterial("ground-material", scene);
  const groundTexture = new B.Texture(ASSETS.ground, scene);
  groundTexture.uScale = 5;
  groundTexture.vScale = 4;
  groundMaterial.diffuseTexture = groundTexture;
  groundMaterial.specularColor = new B.Color3(0.03, 0.03, 0.03);
  ground.material = groundMaterial;

  const buildingUrls = [ASSETS.buildings.hq, ASSETS.buildings.lumbermill, ASSETS.buildings.quarry, ASSETS.buildings.barracks];
  const positions = [new B.Vector3(-5, 2.6, -2), new B.Vector3(1, 2.1, -1.7), new B.Vector3(-3.3, 2, 3.4), new B.Vector3(4.5, 2.3, 2.3)];
  buildingUrls.forEach((url: string, index: number) => {
    const plane = B.MeshBuilder.CreatePlane(`building-${index}`, { width: 4.2, height: 4.2 }, scene);
    plane.position = positions[index];
    plane.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    const material = new B.StandardMaterial(`building-material-${index}`, scene);
    material.diffuseTexture = new B.Texture(url, scene);
    material.opacityTexture = material.diffuseTexture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = new B.Color3(0.08, 0.07, 0.05);
    material.backFaceCulling = false;
    plane.material = material;
  });

  const horizon = B.MeshBuilder.CreatePlane("horizon", { width: 18, height: 7 }, scene);
  horizon.position = new B.Vector3(0, 1.3, 7);
  horizon.rotation = new B.Vector3(Math.PI / 2, 0, 0);
  const horizonMaterial = new B.StandardMaterial("horizon-material", scene);
  horizonMaterial.diffuseTexture = new B.Texture(ASSETS.city, scene);
  horizonMaterial.opacityTexture = horizonMaterial.diffuseTexture;
  horizonMaterial.useAlphaFromDiffuseTexture = true;
  horizonMaterial.backFaceCulling = false;
  horizon.material = horizonMaterial;

  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  return { scene, dispose: () => { window.removeEventListener("resize", resize); camera.detachControl(); scene.dispose(); } };
}
