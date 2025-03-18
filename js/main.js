import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from "@tweenjs/tween.js";

// Posición inicial de la cámara
const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 150, 250);


// Crear escena y renderizador
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Configuración de sombras
renderer.shadowMap.enabled = true; // Activar sombras
renderer.shadowMap.autoUpdate = true; // Desactivar actualización automática
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Variables globales
let camera;
let controls;
let isOrbiting = false;
let isPopupOpen = false;
let isMouseDown = false; // Nueva variable para saber si se presionó el mouse
let hasOrbited = false;
let lastCameraPosition = new THREE.Vector3();

// Crear un grupo de Tween
const tweenGroup = new TWEEN.Group();

// Cargar el modelo 3D
const loader = new GLTFLoader();
loader.load("./3d/modelo-osoco.glb", (gltf) => {
    const ciudad = gltf.scene;
    scene.add(ciudad);
    
    // console.log("Modelo cargado:", ciudad);

    // ciudad.traverse((object) => {
    //     if (object.isMesh) {
    //         console.log("Mesh encontrado:", object.name);
    //     }
    // });
    // ciudad.traverse((child) => {
    //     console.log("Objeto encontrado:", child.name);
    // });
    // ciudad.traverse((object) => {
    //     if (object.isLight) {
    //         console.log(`Luz encontrada: ${object.name} - Tipo: ${object.type}`);
    //     }
    // });

    ciudad.scale.set(1, 1, 1);
    
    ciudad.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
        }
    });

    // Obtener la cámara del modelo
    const modelCamera = ciudad.getObjectByName("Camera");
    // if (modelCamera && modelCamera.isCamera) {
    //     // console.log("Cámara del modelo encontrada:", modelCamera);
    //     camera = modelCamera.clone();
    //     camera.position.set(camera.position.x, camera.position.y + 10, camera.position.z + 30);
    //     // console.warn("Cámara en el modelo cargada.");
    // } else {
        // console.warn("No se encontró la cámara en el modelo. Usando una por defecto.");
        const fov = 39.6; // 50mm
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        camera.position.copy(INITIAL_CAMERA_POSITION); // Usar la constante
    // }

    // Configurar controles de órbita
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 20;
    controls.maxDistance = 40;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2.5;

    controls.addEventListener('start', () => {
        isOrbiting = true;
    });

    controls.addEventListener('end', () => {
        isOrbiting = false;
        // console.log(`Nueva posición de cámara: new THREE.Vector3(${camera.position.x}, ${camera.position.y}, ${camera.position.z})`);
    });

    // Obtener y modificar las luces del modelo
    const luz1 = ciudad.getObjectByName("luz1");
    const luz2 = ciudad.getObjectByName("luz2");
    const luz3 = ciudad.getObjectByName("luz3");
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    
    scene.add(ambientLight);

    if (luz1 && luz1.isLight) {
        luz1.color = new THREE.Color(0xffffff);
        luz1.intensity = 7;
        luz1.shadow.bias = -0.00005;
        luz1.shadow.normalBias = 0.02; 
        luz1.castShadow = true;
        luz1.shadow.mapSize.width = 3000;
        luz1.shadow.mapSize.height = 3000;
        luz1.shadow.camera.left = -550;
        luz1.shadow.camera.right = 550;
        luz1.shadow.camera.top = 550;
        luz1.shadow.camera.bottom = -550;
        luz1.shadow.camera.near = 0.0001;
        luz1.shadow.camera.far = 10000;
    }
    if (luz2) {
        luz2.intensity = 1;
        luz2.castShadow = false;
    }

    // Animación de todos los elementos con "globo" en su nombre
ciudad.traverse((child) => {
    if (child.name.toLowerCase().includes("globo")) {
        animateBuilding(child);
        //console.log("Posición inicial del", child.name, ":", child.position);
    }
});

animate();
}, undefined, (error) => {
    console.error("Error al cargar el modelo:", error);
});

// Función para animar el globo
function animateBuilding(building) {
    // console.log("Animando edificio:", building.name);
    const initialPosition = building.position.y;
    const targetPosition = initialPosition + 1;

    const tweenUp = new TWEEN.Tween(building.position, tweenGroup)
        .to({ y: targetPosition }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        // .onStart(() => console.log("Animación de subida iniciada"))
        // .onComplete(() => console.log("Animación de subida completada"));

    const tweenDown = new TWEEN.Tween(building.position, tweenGroup)
        .to({ y: initialPosition }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        // .onStart(() => console.log("Animación de bajada iniciada"))
        // .onComplete(() => console.log("Animación de bajada completada"));

    tweenUp.chain(tweenDown);
    tweenDown.chain(tweenUp);

    tweenUp.start();
}

// Raycaster para detección de clics en edificios
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let hoveredObject = null;

// Función para detectar si el ratón está sobre un objeto interactivo
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let found = false;
    if (intersects.length > 0) {
        for (const intersect of intersects) {
            const object = intersect.object;

            if (object.name.toLowerCase().includes("edificio")) {
                if (hoveredObject !== object) {
                    resetHoveredObject(); // Restaurar el anterior objeto
                    hoveredObject = object;
                    document.body.style.cursor = "pointer"; // Cambiar cursor
                }
                found = true;
                break;
            }
        }
    }

    if (!found) {
        resetHoveredObject();
    }
}

// Función para restaurar el objeto cuando el ratón sale
function resetHoveredObject() {
    if (hoveredObject) {
        document.body.style.cursor = "default"; // Restaurar cursor
        hoveredObject.scale.set(1, 1, 1); // Restaurar tamaño
        hoveredObject = null;
    }
}


function onMouseClick(event) {
    if (isOrbiting || isPopupOpen) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let clickedObject = intersects[0].object;

        while (clickedObject.parent && clickedObject.parent !== scene) {
            if (clickedObject.parent.name.toLowerCase().includes("edificio")) {
                clickedObject = clickedObject.parent;
                break;
            }
            clickedObject = clickedObject.parent;
        }

        if (clickedObject.name.toLowerCase().includes("edificio")) {
            selectedObject = clickedObject;

            const buildingName = selectedObject.name.split("_")[0];
            // console.log("Edificio seleccionado:", buildingName);

            updateActiveBuildingClass(buildingName);

            animateZoom(selectedObject);

            isPopupOpen = true;
        }
    }
}

function updateActiveBuildingClass(buildingName) {
    if (!buildingName) return;

    const buildingElements = document.querySelectorAll("[class*='edificio']");

    buildingElements.forEach((element) => {
        if (element.classList.contains(buildingName)) {
            element.classList.add("active");
        } else {
            element.classList.remove("active");
        }
    });
}

function closePopup() {
    const activeElements = document.querySelectorAll(".active");
    activeElements.forEach((element) => {
        element.classList.remove("active");
    });
    animateZoomOut()

    isPopupOpen = false;
}

document.addEventListener("click", (event) => {
    if (event.target.classList.contains("js-close-popup")) {
        closePopup();
    }
});

function animateZoom(target) {
    const targetPosition = target.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(100, 300, 300));
    new TWEEN.Tween(camera.position, tweenGroup)
        .to(targetPosition, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}


function animateZoomOut() {
    new TWEEN.Tween(camera.position, tweenGroup)
        .to(INITIAL_CAMERA_POSITION, 1000) // Usar la constante
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

const fogColor = new THREE.Color("#87e2fa");
scene.fog = new THREE.FogExp2(fogColor, 0.0025);
renderer.setClearColor(fogColor);


function animate() {
    requestAnimationFrame(animate);
    tweenGroup.update();
    // console.log("TWEEN.update() ejecutado");
    // console.log(camera.position);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (camera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
});
// Bloquea zoom con scroll + Ctrl
window.addEventListener("wheel", (event) => {
    if (event.ctrlKey) {
        event.preventDefault();
    }
}, { passive: false });

// Bloquea zoom con botón derecho + Ctrl y evita panorámica
window.addEventListener("mousedown", (event) => {
    if (event.ctrlKey && event.button === 2) { // Ctrl + botón derecho
        event.preventDefault();
    }
    if (event.button === 2) { // Bloquea botón derecho siempre (sin Ctrl)
        event.preventDefault();
    }
    if (event.ctrlKey && event.button === 0) { // Ctrl + clic izquierdo
        event.preventDefault();
    }
}, { passive: false });

// Detecta cuando se presiona el botón izquierdo
window.addEventListener("mousedown", (event) => {
    if (event.button === 0) { // Solo el botón izquierdo
        isMouseDown = true;
    }
});

// Detecta cuando se presiona el botón izquierdo
window.addEventListener("mousedown", (event) => {
    if (event.button === 0) { // Solo botón izquierdo
        isMouseDown = true;
        hasOrbited = false;
        lastCameraPosition.copy(camera.position); // Guarda la posición inicial de la cámara
    }
});

// Detecta cuando se mueve la cámara (para saber si el usuario orbitó)
window.addEventListener("mousemove", () => {
    if (isMouseDown) {
        const cameraMoved = !camera.position.equals(lastCameraPosition);
        if (cameraMoved) {
            hasOrbited = true; // Si la cámara se ha movido, se ha orbitado
        }
    }
});

// Detecta cuando se suelta el botón izquierdo
window.addEventListener("mouseup", (event) => {
    if (event.button === 0) { // Solo botón izquierdo
        if (isMouseDown && !hasOrbited && !isPopupOpen) {
            onMouseClick(event); // Solo ejecuta si NO se orbitó
        }
        isMouseDown = false; // Restablece la variable
    }
});

window.addEventListener("mousemove", onMouseMove);