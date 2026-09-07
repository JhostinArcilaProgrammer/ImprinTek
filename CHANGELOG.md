# Notas de lanzamiento

## ImprinTek 1.0.0

**Fecha:** 6 de septiembre de 2026

Primera versión funcional de ImprinTek, una aplicación de escritorio para preparar fotografías para impresión.

### Funcionalidades principales

- Modo Grilla para repetir fotografías con medidas configurables.
- Modo Libre para mover, escalar, rotar, recortar, duplicar y eliminar fotografías.
- Selección múltiple de elementos en el lienzo.
- Añadir y eliminar páginas en Modo Libre.
- Configuración de tamaño de papel Carta, Oficio, A4, A3 y personalizado.
- Orientación vertical u horizontal.
- Medidas de fotografías, separación entre elementos y número de copias.
- Autocompletado de hojas y dirección de llenado por filas o columnas.
- Líneas de corte o guías visuales activables.
- Impresión mediante el diálogo del sistema.
- Zoom del lienzo entre 50% y 200%.
- Atajos de teclado para zoom: `Ctrl +`, `Ctrl -` y `Ctrl + 0`.
- Historial de deshacer para las acciones del Modo Libre.
- Limpieza completa del documento actual.

### Guardado de proyectos

- Guardar proyectos en archivos `.imprintek`.
- Abrir proyectos guardados posteriormente.
- Conservación de configuraciones, imágenes, páginas y elementos editables.
- Proyectos portables: las imágenes se guardan dentro del archivo como datos del proyecto.
- Formato de proyecto versionado para permitir futuras migraciones.

### Distribución para Windows

- Instalador Windows generado con `electron-builder`.
- Instalación con opción para elegir la carpeta de destino.
- Comprobación automática de actualizaciones en versiones instaladas.
- Comunicación segura entre la interfaz y el proceso principal mediante `preload.js`.

### Limitaciones conocidas

- Las actualizaciones automáticas requieren publicar el instalador y sus metadatos en GitHub Releases o en un servidor compatible.
- El proyecto todavía usa Tailwind CSS desde CDN; algunas funciones visuales requieren conexión a Internet.
- Las imágenes se almacenan como datos dentro del archivo `.imprintek`, por lo que proyectos con muchas fotografías pueden ocupar bastante espacio.
- SQLite e imágenes separadas quedan como una mejora futura para proyectos de mayor tamaño.

### Requisitos

- Windows 10 o posterior para el instalador actual.
- Para desarrollo: Node.js y npm.
