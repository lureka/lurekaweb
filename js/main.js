import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from "@tweenjs/tween.js";

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 150, 250);

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

let camera;
let controls;
const tweenGroup = new TWEEN.Group();

const loader = new GLTFLoader();
loader.load("./3d/modelo-osoco.glb", (gltf) => {
    const ciudad = gltf.scene;
    scene.add(ciudad);
    ciudad.scale.set(10, 10, 10);
    
    ciudad.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
        }
    });

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.copy(INITIAL_CAMERA_POSITION);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 200;
    controls.maxDistance = 600;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2.5;

    const luz1 = ciudad.getObjectByName("luz1");
    const luz2 = ciudad.getObjectByName("luz2");
    const luz3 = ciudad.getObjectByName("luz3");
    const ambientLight = new THREE.AmbientLight(0x777777, 2);
    
    scene.add(ambientLight);

    if (luz1 && luz1.isLight) {
        luz1.color = new THREE.Color(0xefffff);
        luz1.intensity = 6;
        luz1.shadow.bias = -0.00001;
        luz1.shadow.normalBias = 0.05;
        luz1.castShadow = true;
        luz1.shadow.mapSize.width = 4000;
        luz1.shadow.mapSize.height = 4000;
        luz1.shadow.camera.left = -4500;
        luz1.shadow.camera.right = 4500;
        luz1.shadow.camera.top = 4500;
        luz1.shadow.camera.bottom = -4500;
        luz1.shadow.camera.near = 10;
        luz1.shadow.camera.far = 200000;
    }
    if (luz2) {
        luz2.intensity = 1;
        luz2.castShadow = true;
        luz2.shadow.camera.far = 200000;
    }
    if (luz3) {
        luz3.intensity = 1;
        luz3.castShadow = false;
    }

    animate();
}, undefined, (error) => {
    console.error("Error al cargar el modelo:", error);
});

function animate() {
    requestAnimationFrame(animate);
    tweenGroup.update();
    if (controls) controls.update();
    renderer.render(scene, camera);
}
const fogColor = new THREE.Color("#87e2fa");
scene.fog = new THREE.FogExp2(fogColor, 0.00025);
renderer.setClearColor(fogColor);

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
});
