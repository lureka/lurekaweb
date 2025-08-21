import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as TWEEN from "@tweenjs/tween.js";

// Definir loader al principio
const loader = new GLTFLoader();

// Posición inicial de la cámara
const INITIAL_CAMERA_POSITION = new THREE.Vector3(15, 15, 25);

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

// Array con los edificios
const edificios = [];

// Función para obtener las posiciones de los edificios
const obtenerEdificios = () => {
    scene.traverse((object) => {
        if (object.name.toLowerCase().includes("edificio")) {
            const boundingBox = new THREE.Box3().setFromObject(object);
            const position = new THREE.Vector3();
            boundingBox.getCenter(position); // Obtener el centro del edificio
            position.y = boundingBox.max.y; // Usar el valor más alto en Y
            edificios.push({ name: object.name, position });
        }
    });
};

// Función para actualizar la posición de los divs
const MARGIN_THRESHOLD = 5; // Margen en píxeles para empezar a desvanecer

const updateDivPositions = () => {
    edificios.forEach((edificio) => {
        const div = document.getElementById(edificio.name);
        if (div) {
            const vector = edificio.position.clone().project(camera);

            // Si el objeto está detrás de la cámara, ocultarlo
            if (vector.z > 1) {
                div.style.display = "none";
                return;
            }

            const x = (vector.x + 1) / 2 * window.innerWidth;
            const y = (-vector.y + 1) / 2 * window.innerHeight;

            const minX = MARGIN_THRESHOLD;
            const maxX = window.innerWidth - MARGIN_THRESHOLD;
            const minY = MARGIN_THRESHOLD;
            const maxY = window.innerHeight - MARGIN_THRESHOLD;

            let opacity = 1;
            if (x < minX) opacity = Math.max(0, (x - minX + MARGIN_THRESHOLD) / MARGIN_THRESHOLD);
            if (x > maxX) opacity = Math.max(0, (maxX - x + MARGIN_THRESHOLD) / MARGIN_THRESHOLD);
            if (y < minY) opacity = Math.max(0, (y - minY + MARGIN_THRESHOLD) / MARGIN_THRESHOLD);
            if (y > maxY) opacity = Math.max(0, (maxY - y + MARGIN_THRESHOLD) / MARGIN_THRESHOLD);

            div.style.opacity = opacity;
            div.style.display = opacity === 0 ? "none" : "block";

            div.style.position = "absolute";
            div.style.left = `${x}px`;
            div.style.top = `${y}px`;
            div.style.transition = "opacity 0.3s ease-out";
        }
    });
};

// Función para animar el globo
function animateBuilding(building) {
    // console.log("Animando edificio:", building.name);
    const initialPosition = building.position.y;
    const targetPosition = initialPosition + 1;

    const tweenUp = new TWEEN.Tween(building.position, tweenGroup)
        .to({ y: targetPosition }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut);

    const tweenDown = new TWEEN.Tween(building.position, tweenGroup)
        .to({ y: initialPosition }, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut);

    tweenUp.chain(tweenDown);
    tweenDown.chain(tweenUp);

    tweenUp.start();
}

// Función de animación principal
function animate() {
    requestAnimationFrame(animate);
    tweenGroup.update();
    if (controls) controls.update();
    updateDivPositions(); // Actualizar posiciones de los divs
    renderer.render(scene, camera);
}

// Configurar niebla y color de fondo
const fogColor = new THREE.Color("#87e2fa");
scene.fog = new THREE.FogExp2(fogColor, 0.0025);
renderer.setClearColor(fogColor);

// Cargar el modelo 3D
loader.load("./3d/modelo-osoco.glb", (gltf) => {
    const ciudad = gltf.scene;
    scene.add(ciudad);

    // Obtener las posiciones de los edificios
    obtenerEdificios();

    // Código existente...
    ciudad.scale.set(1, 1, 1);

    ciudad.traverse((child) => {
        if (child.isMesh) {
            child.receiveShadow = true;
            child.castShadow = true;
        }
    });

    // Configurar cámara
    const fov = 39.6; // 50mm
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.copy(INITIAL_CAMERA_POSITION); // Usar la constante

    // Configurar controles de órbita
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 20;
    controls.maxDistance = 100;
    controls.screenSpacePanning = false;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2.5;

    controls.addEventListener('start', () => {
        isOrbiting = true;
    });

    controls.addEventListener('end', () => {
        isOrbiting = false;
    });

    // Obtener y modificar las luces del modelo
    const luz1 = ciudad.getObjectByName("luz1");
    const luz2 = ciudad.getObjectByName("luz2");
    const luz3 = ciudad.getObjectByName("luz3");
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    if (luz1 && luz1.isLight) {
        luz1.color = new THREE.Color(0xffffff);
        luz1.intensity = 5;
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
        luz2.intensity = 0.6;
        luz2.castShadow = false;
    }

    // Animación de todos los elementos con "globo" en su nombre
    ciudad.traverse((child) => {
        if (child.name.toLowerCase().includes("globo")) {
            animateBuilding(child);
        }
    });

    // Iniciar la animación
    animate();
}, undefined, (error) => {
    console.error("Error al cargar el modelo:", error);
});


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


document.querySelectorAll(".tooltip-3d").forEach((box) => {
    box.addEventListener("click", function (event) {
        event.stopPropagation(); // Evita interferencias con otros eventos

        // Obtener el nombre del edificio desde el ID del tooltip
        let edificioId = this.id.replace("tooltip-", ""); 
        let edificio = scene.getObjectByName(edificioId);

        if (edificio) {
            selectedObject = edificio;
            const buildingName = selectedObject.name.split("_")[0];
            updateActiveBuildingClass(buildingName);
            animateZoom(selectedObject);
            isPopupOpen = true;
        }
    });
});

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
            updateActiveBuildingClass(buildingName);
            animateZoom(selectedObject);
            isPopupOpen = true;
        }
    }
}

function updateActiveBuildingClass(buildingName) {
    if (!buildingName) return;

    const buildingElements = document.querySelectorAll("[class*='edificio']");
    const veloPopup = document.querySelector(".velo-popup"); 

    let hasActive = false; // Variable para saber si algún edificio está activo

    buildingElements.forEach((element) => {
        if (element.classList.contains(buildingName)) {
            element.classList.add("active");
            hasActive = true; // Hay al menos un edificio activo
        } else {
            element.classList.remove("active");
        }
    });

    // Si hay un edificio activo, añadir la clase active al veloPopup, si no, quitarla
    if (veloPopup) {
        if (hasActive) {
            veloPopup.classList.add("active");
        } else {
            veloPopup.classList.remove("active");
        }
    }
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
    const targetPosition = target.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(10, 10, 10));
    new TWEEN.Tween(camera.position, tweenGroup)
        .to(targetPosition, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}


function animateZoomOut() {
    new TWEEN.Tween(camera.position, tweenGroup)
        .to(INITIAL_CAMERA_POSITION, 1000) // Usar la constante
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
}

// Detectar el mouse sobre un edificio
window.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Usa el raycaster existente
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
});

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