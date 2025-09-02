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

// Referencias para animación de coches (4 por carril)
let carObjects = []; // Array de 4 coches del carril 1
let car2Objects = []; // Array de 4 coches del carril 2
let carPath1 = null; // ruta carril 1
let carPath2 = null; // ruta carril 2
let carSpeed = 2.5; // unidades/seg
let car2Speed = 2.5; // unidades/seg para car2
let carTrackMargin = 2; // distancia al borde del asfalto
let carLaneOffset = 1; // separación entre carriles
let carSegments = null; // [{start:Vec3,end:Vec3,dir:Vec3,len:number}]
let carSegmentIndex = 0;
let carSegmentDistance = 0;
let carLastTime = null;
const carOrientationOffsetY = -Math.PI / 2; // corrige orientación del modelo (giro -90º)

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
    // Actualiza animación del coche si hay ruta
    updateCarAlongPath();
    renderer.render(scene, camera);
}

// Configurar niebla y color de fondo
const fogColor = new THREE.Color("#87e2fa");
scene.fog = new THREE.FogExp2(fogColor, 0.0025);
renderer.setClearColor(fogColor);

// Cargar el modelo 3D
loader.load("./3d/modelo.glb", (gltf) => {
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

    // Localiza coches y asfalto y construye dos rutas paralelas (rectángulos redondeados) por el interior con márgenes
    const carOriginal = ciudad.getObjectByName('car');
    const car2Original = ciudad.getObjectByName('car2');
    const asfalto = ciudad.getObjectByName('asfalto');
    if ((carOriginal || car2Original) && asfalto) {
        const bbox = new THREE.Box3().setFromObject(asfalto);
        const center = bbox.getCenter(new THREE.Vector3());
        const refObj = carOriginal || car2Original;
        const y = refObj.getWorldPosition(new THREE.Vector3()).y || center.y;

        const min = bbox.min.clone();
        const max = bbox.max.clone();

        // Carril 1 (más próximo al borde exterior)
        const m1 = carTrackMargin;
        const left1 = min.x + m1;
        const right1 = max.x - m1;
        const near1 = min.z + m1;
        const far1 = max.z - m1;

        // Carril 2 (más hacia el borde exterior, separado del carril 1)
        const m2 = carTrackMargin - carLaneOffset; // Restamos para ir hacia fuera
        const left2 = min.x + m2;
        const right2 = max.x - m2;
        const near2 = min.z + m2;
        const far2 = max.z - m2;

        // Determina el lado inicial según orientación actual del coche
        // Asumimos eje X/Z en plano y eje Y como altura
        const carPos = carOriginal ? carOriginal.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
        // Proyecta posición al perímetro más cercano (carril 1 como referencia)
        const clampedX = Math.min(Math.max(carPos.x, left1), right1);
        const clampedZ = Math.min(Math.max(carPos.z, near1), far1);

        // Genera rutas con esquinas redondeadas
        const radius1 = Math.min((right1 - left1), (far1 - near1)) * 0.12;
        const radius2 = Math.min((right2 - left2), (far2 - near2)) * 0.12;
        carPath1 = buildRoundedRectPath(left1, right1, near1, far1, y, radius1);
        carPath2 = buildRoundedRectPath(left2, right2, near2, far2, y, radius2);

        // Crear 6 coches para carril 1 (duplicando car original)
        if (carOriginal) {
            carObjects = [];
            const carOffsets = [0, 0.18, 0.35, 0.52, 0.69, 0.86]; // Distancias aleatorias pero separadas
            
            for (let i = 0; i < 6; i++) {
                const carClone = carOriginal.clone();
                carClone.name = `car_${i}`;
                ciudad.add(carClone);
                carObjects.push(carClone);
                
                // Distribuir con distancias aleatorias
                const startT = carOffsets[i] % 1;
                const initPos = carPath1.getPointAt(startT);
                const initTan = carPath1.getTangentAt(startT).normalize();
                carClone.position.copy(initPos);
                carClone.lookAt(initPos.clone().add(initTan));
                carClone.rotateY(carOrientationOffsetY);
                carClone.userData.ignoreRaycast = true;
                carClone.userData.carIndex = i;
                carClone.userData.offset = carOffsets[i];
            }
            // Ocultar el original
            carOriginal.visible = false;
        }

        // Crear 6 coches para carril 2 (duplicando car2 original)
        if (car2Original) {
            car2Objects = [];
            const car2Offsets = [0.12, 0.29, 0.46, 0.63, 0.80, 0.97]; // Distancias aleatorias pero separadas
            
            for (let i = 0; i < 6; i++) {
                const car2Clone = car2Original.clone();
                car2Clone.name = `car2_${i}`;
                ciudad.add(car2Clone);
                car2Objects.push(car2Clone);
                
                // Distribuir con distancias aleatorias en sentido contrario
                const startT2 = (car2Offsets[i] + 0.5) % 1; // +0.5 para sentido contrario
                const initPos2 = carPath2.getPointAt(startT2);
                const initTan2 = carPath2.getTangentAt(startT2).normalize().negate();
                car2Clone.position.copy(initPos2);
                car2Clone.lookAt(initPos2.clone().add(initTan2));
                car2Clone.rotateY(carOrientationOffsetY);
                car2Clone.userData.ignoreRaycast = true;
                car2Clone.userData.carIndex = i;
                car2Clone.userData.offset = car2Offsets[i];
            }
            // Ocultar el original
            car2Original.visible = false;
        }

        carLastTime = performance.now() * 0.001;
    }

    // Iniciar la animación
    animate();
    
    // Construir menús dinámicos y activar sección por defecto
    buildMainMenus();
    attachMenuLinkHandlers();
    attachMainNavigationHandlers();
    
    // En primera carga enfocamos el section, no el botón de cierre
    updateActiveBuildingClass("edificio-globo", false);
}, undefined, (error) => {
    console.error("Error al cargar el modelo:", error);
});


// Raycaster para detección de clics en edificios
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
let hoveredObject = null;
let lastFocusedTrigger = null;
let hasShownInfoPopup = false;
let infoPopupClickHandlerAttached = false;
const hoverTooltipEl = document.querySelector('.hover-tooltip');


// Función para detectar si el ratón está sobre un objeto interactivo
function onMouseMove(event) {
    // No mostrar tooltip si hay un popup activo
    if (isPopupOpen) {
        if (hoverTooltipEl) {
            hoverTooltipEl.removeAttribute('data-visible');
            hoverTooltipEl.setAttribute('aria-hidden', 'true');
        }
        return;
    }
    if (!camera) return;
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

                // Tooltip con título del edificio
                if (hoverTooltipEl) {
                    const buildingRoot = getBuildingRoot(object);
                    const buildingTitle = getBuildingTitleFromClass(buildingRoot?.name);
                    hoverTooltipEl.textContent = buildingTitle || (buildingRoot?.name || 'Edificio');
                    hoverTooltipEl.style.left = `${event.clientX}px`;
                    hoverTooltipEl.style.top = `${event.clientY}px`;
                    hoverTooltipEl.setAttribute('data-visible', 'true');
                    hoverTooltipEl.setAttribute('aria-hidden', 'false');
                }
                break;
            }
        }
    }

    if (!found) {
        resetHoveredObject();
        if (hoverTooltipEl) {
            hoverTooltipEl.removeAttribute('data-visible');
            hoverTooltipEl.setAttribute('aria-hidden', 'true');
        }
    }
}

// Construye el menú de navegación principal según el orden del DOM
function buildMainMenus() {
    const allBuildingSections = Array.from(document.querySelectorAll('section.popup'));
    const menuItems = allBuildingSections.map((section) => {
        const classes = Array.from(section.classList);
        const buildingClass = classes.find((c) => c.startsWith('edificio')) || '';
        const titleEl = section.querySelector('h1');
        const title = titleEl ? titleEl.textContent.trim() : buildingClass;
        return { buildingClass, title };
    }).filter(item => item.buildingClass);

    // Genera el menú hamburguesa
    const navMenu = document.querySelector('#nav-menu');
    if (navMenu) {
        // Limpia contenido previo
        navMenu.innerHTML = '';

        menuItems.forEach(({ buildingClass, title }) => {
            const li = document.createElement('li');
            li.setAttribute('role', 'none');
            
            const a = document.createElement('a');
            a.href = '#';
            a.setAttribute('role', 'menuitem');
            a.dataset.building = buildingClass;
            a.textContent = title;
            a.setAttribute('aria-label', `Ver ${title.toLowerCase()}`);
            
            li.appendChild(a);
            navMenu.appendChild(li);
        });
    }

    // Refleja la sección activa en el menú
    const activeBuilding = getActiveBuildingClass();
    setMenuActiveFor(activeBuilding);
}

// Maneja los clics en los enlaces del menú para activar la sección y zoom si existe el objeto 3D
function attachMenuLinkHandlers() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('nav.main-navigation a[data-building]');
        if (!link) return;
        e.preventDefault();
        const buildingClass = link.dataset.building;

        // Scroll al principio de la página
        window.scrollTo(0, 0);

        // Activa la section y velo
        updateActiveBuildingClass(buildingClass);

        // Si existe objeto 3D con ese nombre, hacer zoom
        const edificio = scene ? scene.getObjectByName(buildingClass) : null;
        if (edificio) {
            selectedObject = edificio;
            animateZoom(edificio);
            isPopupOpen = true;
        }
        
        // Cierra el menú móvil si está abierto
        closeMobileMenu();
    });
}

// Maneja el menú móvil principal
function attachMainNavigationHandlers() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', !isExpanded);
            navMenu.setAttribute('aria-hidden', isExpanded);
        });
        
        // Cierra el menú al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Cierra el menú con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });
    }
}

// Cierra el menú móvil
function closeMobileMenu() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-hidden', 'true');
    }
}

// Obtiene la clase del edificio actualmente activo (por ejemplo "edificio-globo")
function getActiveBuildingClass() {
    const activeSection = document.querySelector('section.popup.active');
    if (!activeSection) return null;
    const classes = Array.from(activeSection.classList);
    return classes.find((c) => c.startsWith('edificio')) || null;
}

// Marca como active el enlace del menú correspondiente y limpia el resto
function setMenuActiveFor(buildingClass) {
    const allMenuLinks = document.querySelectorAll('nav.main-navigation a[data-building]');
    allMenuLinks.forEach((a) => {
        if (buildingClass && a.dataset.building === buildingClass) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}


document.querySelectorAll(".tooltip-3d").forEach((box) => {
    box.addEventListener("click", function (event) {
        event.stopPropagation(); // Evita interferencias con otros eventos

        // Obtener el nombre del edificio desde el ID del tooltip
        let edificioId = this.id.replace("tooltip-", ""); 
        let edificio = scene.getObjectByName(edificioId);

        if (edificio) {
            lastFocusedTrigger = this;
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

function updateActiveBuildingClass(buildingName, focusCloseButton = true) {
    if (!buildingName) return;

    const buildingElements = document.querySelectorAll("[class*='edificio']");
    const veloPopup = document.querySelector(".velo-popup"); 

    let hasActive = false; // Variable para saber si algún edificio está activo

    buildingElements.forEach((element) => {
        // Verificar si el elemento tiene una clase que contenga el nombre del edificio
        let hasBuildingClass = false;
        element.classList.forEach((className) => {
            if (className.includes(buildingName)) {
                hasBuildingClass = true;
            }
        });
        
        if (hasBuildingClass) {
            element.classList.add("active");
            hasActive = true; // Hay al menos un edificio activo
            element.setAttribute("aria-hidden", "false");
            // Enfoque accesible al abrir
            const closeBtn = element.querySelector('.js-close-popup');
            if (focusCloseButton && closeBtn) {
                closeBtn.focus();
            } else {
                element.focus();
            }
        } else {
            element.classList.remove("active");
            if (element.matches('section.popup')) {
                element.setAttribute("aria-hidden", "true");
            }
        }
    });

    // Si hay un edificio activo, añadir la clase active al veloPopup, si no, quitarla
    if (veloPopup) {
        if (hasActive) {
            veloPopup.classList.add("active");
            veloPopup.setAttribute("aria-hidden", "false");
        } else {
            veloPopup.classList.remove("active");
            veloPopup.setAttribute("aria-hidden", "true");
        }
    }

    // Sincroniza flag global de popup abierto (necesario para estados iniciales)
    isPopupOpen = hasActive;

    // Sincroniza aria-expanded en los triggers (puntos)
    const triggers = document.querySelectorAll('.pointers .tooltip-3d');
    triggers.forEach((btn) => {
        btn.setAttribute('aria-expanded', btn.id === buildingName ? 'true' : 'false');
    });

    // Actualiza estado active en menús de navegación
    setMenuActiveFor(buildingName);

    // Oculta tooltip al abrir popup
    if (hoverTooltipEl) {
        hoverTooltipEl.removeAttribute('data-visible');
        hoverTooltipEl.setAttribute('aria-hidden', 'true');
    }
}
function closePopup() {
    const activeElements = document.querySelectorAll(".active");
    activeElements.forEach((element) => {
        element.classList.remove("active");
        if (element.matches('section.popup')) {
            element.setAttribute('aria-hidden', 'true');
        }
    });
    animateZoomOut()

    isPopupOpen = false;

    // Actualiza velo y triggers
    const veloPopup = document.querySelector('.velo-popup');
    if (veloPopup) veloPopup.setAttribute('aria-hidden', 'true');
    const triggers = document.querySelectorAll('.pointers .tooltip-3d');
    triggers.forEach((btn) => btn.setAttribute('aria-expanded', 'false'));

    // Devuelve el foco al disparador si existe
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
        lastFocusedTrigger.focus();
    }

    // Muestra info-popup solo la primera vez que se cierra un popup
    if (!hasShownInfoPopup) {
        showInfoPopupOnce();
        hasShownInfoPopup = true;
    }
}

function showInfoPopupOnce() {
    const info = document.querySelector('.info-popup');
    if (!info) return;
    info.style.display = 'flex';
    info.setAttribute('aria-hidden', 'false');
    
    // Aplicar blur al canvas y a los tooltip-3d
    const canvas = renderer.domElement;
    const tooltips = document.querySelectorAll('.tooltip-3d');
    
    if (canvas) canvas.style.filter = 'blur(4px)';
    tooltips.forEach(tooltip => {
        tooltip.style.filter = 'blur(4px)';
    });
    
    // Cerrar al primer clic en cualquier parte del documento
    if (!infoPopupClickHandlerAttached) {
        infoPopupClickHandlerAttached = true;
        setTimeout(() => {
            const onAnyClick = () => {
                hideInfoPopup();
                document.removeEventListener('click', onAnyClick, true);
                infoPopupClickHandlerAttached = false;
            };
            document.addEventListener('click', onAnyClick, true);
        }, 0);
    }
}

function hideInfoPopup() {
    const info = document.querySelector('.info-popup');
    if (!info) return;
    info.style.display = 'none';
    info.setAttribute('aria-hidden', 'true');
    
    // Quitar blur progresivamente del canvas y tooltip-3d
    const canvas = renderer.domElement;
    const tooltips = document.querySelectorAll('.tooltip-3d');
    
    if (canvas) {
        canvas.style.transition = 'filter 0.5s ease-out';
        canvas.style.filter = '';
    }
    
    tooltips.forEach(tooltip => {
        tooltip.style.transition = 'filter 0.5s ease-out';
        tooltip.style.filter = '';
    });
    
    // Limpiar la transición después de que termine
    setTimeout(() => {
        if (canvas) canvas.style.transition = '';
        tooltips.forEach(tooltip => {
            tooltip.style.transition = '';
        });
    }, 500);
}

document.addEventListener("click", (event) => {
    const closeBtn = event.target.closest(".js-close-popup");
    const velo = event.target.closest(".velo-popup");
    
    if (closeBtn) {
        event.preventDefault();
        closePopup();
    } else if (velo && velo.classList.contains("active")) {
        event.preventDefault();
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

function getBuildingRoot(object) {
    let current = object;
    while (current?.parent && current.parent !== scene) {
        if (current.parent.name.toLowerCase().includes('edificio')) {
            return current.parent;
        }
        current = current.parent;
    }
    return current;
}

function getBuildingTitleFromClass(buildingName) {
    if (!buildingName) return null;
    const className = buildingName.split('_')[0];
    const section = Array.from(document.querySelectorAll('section.popup')).find(sec => sec.classList.contains(className));
    const title = section?.querySelector('h1');
    return title ? title.textContent.trim() : null;
}

function findClosestTOnCurve(curve, point, samples = 200) {
    let bestT = 0;
    let bestD = Infinity;
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const p = curve.getPointAt(t);
        const d = p.distanceToSquared(point);
        if (d < bestD) { bestD = d; bestT = t; }
    }
    return bestT;
}

// Construye curva cerrada de rectángulo con esquinas redondeadas
function buildRoundedRectPath(left, right, near, far, y, r) {
    const pts = [];
    const addArc = (cx, cz, startAngle, endAngle, segments = 8) => {
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const a = startAngle + (endAngle - startAngle) * t;
            pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r));
        }
    };
    // Lados rectos (implícitos) y esquinas en sentido horario: TL->TR->BR->BL
    // Arcos: TL: 180->270, TR: 270->360, BR: 0->90, BL: 90->180 (radianes)
    // Top-left corner arc center
    addArc(left + r, near + r, Math.PI, Math.PI * 1.5);
    // Top-right corner
    addArc(right - r, near + r, Math.PI * 1.5, Math.PI * 2);
    // Bottom-right corner
    addArc(right - r, far - r, 0, Math.PI * 0.5);
    // Bottom-left corner
    addArc(left + r, far - r, Math.PI * 0.5, Math.PI);

    return new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.0);
}

function estimateCurveLength(curve, samples = 100) {
    let len = 0;
    let prev = curve.getPointAt(0);
    for (let i = 1; i <= samples; i++) {
        const p = curve.getPointAt(i / samples);
        len += p.distanceTo(prev);
        prev = p;
    }
    return len;
}

// Distancia de un punto a un segmento en planta XZ
function pointToSegmentDistanceXZ(p, a, b) {
    const apx = p.x - a.x; const apz = p.z - a.z;
    const abx = b.x - a.x; const abz = b.z - a.z;
    const ab2 = abx*abx + abz*abz;
    const dot = apx*abx + apz*abz;
    let t = ab2 > 0 ? dot / ab2 : 0;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + abx * t; const cz = a.z + abz * t;
    const dx = p.x - cx; const dz = p.z - cz;
    return Math.hypot(dx, dz);
}

// Proyección escalar t en [0,1] de un punto sobre un segmento en XZ
function projectTOnSegmentXZ(p, a, b) {
    const apx = p.x - a.x; const apz = p.z - a.z;
    const abx = b.x - a.x; const abz = b.z - a.z;
    const ab2 = abx*abx + abz*abz;
    const dot = apx*abx + apz*abz;
    if (ab2 === 0) return 0;
    let t = dot / ab2;
    return Math.max(0, Math.min(1, t));
}

function updateCarAlongPath() {
    if (!carPath1 && !carPath2) return;
    const now = performance.now() * 0.001;
    if (carLastTime == null) { carLastTime = now; }
    const dt = Math.min(0.05, Math.max(0, now - carLastTime));
    carLastTime = now;

    // Actualizar 4 coches del carril 1
    if (carPath1 && carObjects.length > 0) {
        const len1 = estimateCurveLength(carPath1);
        const adv1 = (carSpeed * dt) / len1;
        updateCarAlongPath.t = (updateCarAlongPath.t || 0) + adv1;
        if (updateCarAlongPath.t > 1) updateCarAlongPath.t -= 1;
        
        carObjects.forEach((car, index) => {
            const offset = car.userData.offset || 0;
            const t1 = (updateCarAlongPath.t + offset) % 1;
            const pos1 = carPath1.getPointAt(t1);
            const tan1 = carPath1.getTangentAt(t1).normalize();
            car.position.copy(pos1);
            car.lookAt(pos1.clone().add(tan1));
            car.rotateY(carOrientationOffsetY);
        });
    }

    // Actualizar 4 coches del carril 2 (sentido contrario)
    if (carPath2 && car2Objects.length > 0) {
        const len2 = estimateCurveLength(carPath2);
        const adv2 = (car2Speed * dt) / len2;
        updateCarAlongPath.t2 = (updateCarAlongPath.t2 || 0) - adv2;
        if (updateCarAlongPath.t2 < 0) updateCarAlongPath.t2 += 1;
        
        car2Objects.forEach((car2, index) => {
            const offset = car2.userData.offset || 0;
            const t2 = (updateCarAlongPath.t2 + offset) % 1;
            const pos2 = carPath2.getPointAt(t2);
            const tan2 = carPath2.getTangentAt(t2).normalize().negate();
            car2.position.copy(pos2);
            car2.lookAt(pos2.clone().add(tan2));
            car2.rotateY(carOrientationOffsetY);
        });
    }
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