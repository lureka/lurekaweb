// Variable para guardar el elemento actual
let currentImgElement = null;

// Función para abrir una imagen en el popup
function openImage(imgElement) {
  const image = imgElement.querySelector('img');
  if (!image) return;
  
  const imgPopup = document.querySelector('.img-popup');
  const veloPopup = document.querySelector('.velo-popup');
  const existingImg = imgPopup.querySelector('.img-bigger');
  const imageSrc = image.currentSrc;
  const biggerImgSrc = imageSrc.replace(/-s(\.[a-z]+)$/i, '$1');
  
  if (existingImg) { existingImg.remove(); }
  
  const biggerImg = document.createElement('img');
  biggerImg.src = biggerImgSrc;
  biggerImg.className = 'img-bigger';
  biggerImg.alt = image.alt || '';
  
  veloPopup.classList.add('active', 'has-img-popup');
  document.body.classList.add('no-scroll');
  imgPopup.appendChild(biggerImg);
  
  // Guardar referencia al elemento actual
  currentImgElement = imgElement;
  
  // Actualizar estado de los botones de navegación
  updateNavigationButtons();
}

// Función para actualizar el estado de los botones de navegación
function updateNavigationButtons() {
  const nextBtn = document.querySelector('.next');
  const prevBtn = document.querySelector('.prev');
  
  if (!nextBtn || !prevBtn || !currentImgElement) return;
  
  // Obtener todos los elementos .js-with-img
  const allImgElements = Array.from(document.querySelectorAll('.js-with-img'));
  const currentIndex = allImgElements.indexOf(currentImgElement);
  
  // Actualizar botón siguiente
  if (currentIndex === allImgElements.length - 1) {
    nextBtn.classList.add('disabled');
  } else {
    nextBtn.classList.remove('disabled');
  }
  
  // Actualizar botón anterior
  if (currentIndex === 0) {
    prevBtn.classList.add('disabled');
  } else {
    prevBtn.classList.remove('disabled');
  }
}

// Función para navegar a la siguiente imagen
function navigateNext() {
  if (!currentImgElement) return;
  
  const allImgElements = Array.from(document.querySelectorAll('.js-with-img'));
  const currentIndex = allImgElements.indexOf(currentImgElement);
  
  if (currentIndex < allImgElements.length - 1) {
    openImage(allImgElements[currentIndex + 1]);
  }
}

// Función para navegar a la imagen anterior
function navigatePrev() {
  if (!currentImgElement) return;
  
  const allImgElements = Array.from(document.querySelectorAll('.js-with-img'));
  const currentIndex = allImgElements.indexOf(currentImgElement);
  
  if (currentIndex > 0) {
    openImage(allImgElements[currentIndex - 1]);
  }
}

// Event listener para abrir imagen al hacer clic
document.addEventListener('click', function(e) {
  if (window.innerWidth <= 647) return;
  
  const clickedElement = e.target.closest('.js-with-img');
  if (clickedElement) {
    openImage(clickedElement);
  }
});

// Event listener para cerrar popup
document.addEventListener('click', function(e) {
  if (window.innerWidth <= 647) return;
  
  // No cerrar si se hace clic en los botones de navegación
  if (e.target.closest('.next') || e.target.closest('.prev')) {
    return;
  }
  
  // Cerrar si se hace clic en el botón de cerrar o en el fondo (velo-popup pero no en img-popup)
  if (e.target.closest('.js-close-img-popup')) {
    const veloPopup = document.querySelector('.velo-popup');
    veloPopup.classList.remove('active');
    document.body.classList.remove('no-scroll');
    veloPopup.classList.remove('active', 'has-img-popup');
    currentImgElement = null;
  } else if (e.target.closest('.velo-popup') && !e.target.closest('.img-popup')) {
    const veloPopup = document.querySelector('.velo-popup');
    veloPopup.classList.remove('active');
    document.body.classList.remove('no-scroll');
    veloPopup.classList.remove('active', 'has-img-popup');
    currentImgElement = null;
  }
});

// Event listener para navegación siguiente/anterior
document.addEventListener('click', function(e) {
  if (window.innerWidth <= 647) return;
  
  const nextBtn = e.target.closest('.next');
  const prevBtn = e.target.closest('.prev');
  
  if (nextBtn && !nextBtn.classList.contains('disabled')) {
    e.stopPropagation();
    navigateNext();
  }
  
  if (prevBtn && !prevBtn.classList.contains('disabled')) {
    e.stopPropagation();
    navigatePrev();
  }
});

