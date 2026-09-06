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

## Próximas etapas

1. Guardar esta versión estable como referencia.
2. Sustituir Tailwind CDN por una compilación local.
3. Separar la interfaz, el estado y los motores de Grilla y Modo Libre.
4. Diseñar persistencia de proyectos y configuraciones antes de elegir la base de datos.

## Modelo de proyecto previsto

Un proyecto debería conservar la configuración de papel, orientación, medidas de impresión, catálogo de imágenes, elementos del lienzo, número de hojas y versión del formato de datos. Las imágenes podrán almacenarse como archivos asociados al proyecto o como recursos administrados por la aplicación; esta decisión se tomará junto con el diseño de persistencia.
