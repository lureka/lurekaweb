/*
 * Comportamiento global para elementos colapsables tipo acordeón.
 *
 * Este script solo maneja la clase `js-active` para indicar el estado abierto/cerrado.
 * La visualización (ocultar/mostrar, animaciones, etc.) debe manejarse mediante CSS.
 *
 * Reglas de uso:
 * - Agrupa los elementos dentro de un contenedor opcional con la clase `js-collapsible`.
 *   Si hay varios acordeones dentro del mismo contenedor, solo uno podrá permanecer abierto a la vez.
 * - Cada disparador debe tener la clase `js-collapsible-header` y puede apuntar a su contenido:
 *   - Por defecto, al siguiente elemento hermano que tenga la clase `js-collapsible-content`.
 *   - O mediante el atributo `data-collapsible="ID"`, que debe corresponder con el `id` de un elemento
 *     que tenga la clase `js-collapsible-content`.
 * - Cuando un panel está abierto se añade la clase `js-active` tanto al header como al contenido asociado.
 * - Cuando está cerrado se quita la clase `js-active` de ambos elementos.
 */

(function () {
  function findContent(header) {
    const targetId = header.dataset.collapsible;
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target && target.classList.contains('js-collapsible-content')) {
        return target;
      }
    }

    let sibling = header.nextElementSibling;
    while (sibling) {
      if (sibling.classList && sibling.classList.contains('js-collapsible-content')) {
        return sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }

  function closeSection(header, content) {
    header.classList.remove('js-active');
    if (content) {
      content.classList.remove('js-active');
    }
  }

  function openSection(header, content) {
    header.classList.add('js-active');
    if (content) {
      content.classList.add('js-active');
    }
  }

  function setupHeader(header) {
    const content = findContent(header);
    if (!content) {
      return;
    }

    function toggle(open) {
      const container = header.closest('.js-collapsible');
      if (container) {
        const activeHeaders = Array.from(container.querySelectorAll('.js-collapsible-header.js-active'));
        activeHeaders.forEach((activeHeader) => {
          if (activeHeader !== header) {
            const activeContent = findContent(activeHeader);
            closeSection(activeHeader, activeContent);
          }
        });
      }

      if (open) {
        openSection(header, content);
      } else {
        closeSection(header, content);
      }
    }

    header.addEventListener('click', (event) => {
      event.preventDefault();
      const isActive = header.classList.contains('js-active');
      toggle(!isActive);
    });

    header.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const isActive = header.classList.contains('js-active');
        toggle(!isActive);
      }
    });
  }

  function init() {
    const headers = Array.from(document.querySelectorAll('.js-collapsible-header'));
    headers.forEach(setupHeader);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
