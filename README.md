# ImprinTek

Aplicación de escritorio para organizar fotografías en hojas listas para imprimir. ImprinTek ofrece dos flujos de trabajo: composición automática en grilla y edición libre sobre una o varias páginas.

## Funcionalidades disponibles

- **Modo Grilla:** organiza copias de fotografías con dimensiones, separación, alineación y distribución configurables.
- **Modo Libre:** permite colocar, mover, redimensionar, rotar, recortar, duplicar y ajustar imágenes en distintas páginas.
- **Guías de corte:** activa o desactiva las guías y configura su color, grosor y estilo.
- **Tamaños de papel en SQLite:** Carta (21,59 × 27,94 cm), Oficio (21,6 × 33 cm), A4 (21 × 29,7 cm) y A3 (29,7 × 42 cm), además de formatos personalizados.
- **Medidas fotográficas iniciales:** Carnet, Pasaporte, Visa, Tarjeta de Presentación y Postal; se pueden agregar medidas adicionales.
- **Perfiles de trabajo:** guarda y vuelve a aplicar configuraciones de papel, orientación, grilla, medidas y guías.
- **Proyectos locales:** abre y guarda proyectos `.imprintek` para continuar una composición posteriormente.
- **Impresión por página:** prepara el lienzo en un documento de impresión independiente con el tamaño de papel seleccionado.
- **Aplicaciones para Windows:** se mantienen paquetes separados para Windows 10/11 y una variante de compatibilidad para Windows 7.

Los formatos y perfiles se guardan en una base SQLite local, dentro de los datos de usuario de la aplicación. En una instalación nueva, la base se crea al iniciar ImprinTek y se inicializa con los formatos estándar.

## Requisitos

- Windows 10/11 para la versión moderna o Windows 7 para la versión de compatibilidad.
- Node.js y npm para ejecutar o compilar desde el código fuente.
- Conexión a Internet al iniciar la interfaz: Tailwind CSS se carga desde su CDN.

## Ejecutar desde el código fuente

Instala dependencias y ejecuta la variante deseada desde su carpeta:

```powershell
cd ImprinTek-Win10
npm install
npm start
```

Para probar la versión de compatibilidad, usa `ImprinTek-Win7` en lugar de `ImprinTek-Win10`.

## Crear instaladores

Ejecuta el comando dentro de la carpeta de la variante que quieras compilar:

```powershell
npm run build:windows
```

El instalador se genera en la carpeta `dist-win10/` o `dist-win7/` correspondiente. Los archivos de instalación se crean localmente; no se publican automáticamente en GitHub Releases.

## Limitaciones conocidas y trabajo pendiente

- **El uso completamente sin conexión no está implementado.** La interfaz depende de Tailwind CSS servido por CDN y necesita acceso a Internet para cargar esos estilos. La base SQLite y los datos de usuario sí son locales, pero eso no hace que toda la aplicación funcione offline.
- No hay sincronización en la nube, cuentas de usuario ni activación comercial de licencias.
- La publicación de versiones y la distribución automática de actualizaciones todavía requieren configuración de lanzamiento y alojamiento.
- El resultado de impresión puede depender también del tamaño de papel, la escala, los márgenes y las capacidades del controlador de cada impresora. Revisa la vista previa del sistema antes de imprimir, especialmente para impresión sin bordes.
- Los instaladores generados previamente no incorporan cambios posteriores al código; es necesario volver a compilar y distribuir el instalador para actualizar una instalación existente.

## Licencia

Este repositorio declara la licencia ISC en los manifiestos del proyecto. Consulta los términos aplicables antes de redistribuir o integrar el software.
