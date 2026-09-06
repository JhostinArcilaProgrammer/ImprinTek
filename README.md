# Imprintek

Aplicación de escritorio para preparar fotografías para impresión en modo grilla y modo libre.

## Estado actual

- Modo Grilla para repetir fotografías con medidas configurables.
- Modo Libre para mover, escalar, rotar, recortar, duplicar y eliminar elementos.
- Añadir y eliminar hojas en Modo Libre.
- Limpiar el documento actual sin recargar la aplicación.
- Impresión mediante el diálogo del sistema.

## Desarrollo

Requisitos: Node.js y npm.

```powershell
npm install
npm start
```

## Construcción para Windows

```powershell
npm run build:windows
```

El instalador se genera con `electron-builder` en `dist/`. La aplicación comprueba actualizaciones automáticamente cuando está instalada y empaquetada.

Para distribuir actualizaciones hay que publicar el instalador y sus archivos de metadatos en GitHub Releases o en un servidor compatible, y añadir una configuración `publish` al bloque `build` de `package.json`. El código no descarga actualizaciones durante `npm start` ni en modo desarrollo.

## Próximas etapas

1. Sustituir Tailwind CDN por una compilación local.
2. Separar la interfaz, el estado y los motores de Grilla y Modo Libre.
3. Migrar el archivo `.imprintek` a un contenedor con SQLite e imágenes separadas si los proyectos crecen mucho.

## Modelo de proyecto previsto

Los proyectos actuales usan archivos `.imprintek` versionados. Conservan la configuración de papel, orientación, medidas de impresión, catálogo de imágenes, elementos del lienzo, número de hojas y versión del formato de datos. Las imágenes se guardan como Data URL para mantener el proyecto portable y editable.
