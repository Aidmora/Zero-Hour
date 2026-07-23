# Zero Hour

Repositorio del proyecto Zero Hour, un juego 2D interactivo desarrollado en JavaScript utilizando el motor de videojuegos [Phaser 3](https://phaser.io/). 

Este proyecto fue estructurado utilizando módulos ES6 e implementa una arquitectura basada en escenas para gestionar los diferentes estados del juego.

---

## Características Principales

- **Físicas de Arcade**: Implementación de físicas 2D (gravedad, colisiones) proporcionadas por el motor de Phaser.
- **Gestión por Escenas**: Separación lógica de la interfaz y la jugabilidad:
  - `BootScene`: Carga inicial de assets.
  - `MenuScene`: Menú principal del juego.
  - `Nivel1Scene` y `Nivel2Scene`: Niveles del juego.
  - `UIScene`: Interfaz de usuario superpuesta (HUD).
  - `GameOverScene` y `CreditosScene`: Escenas de finalización y créditos.
- **Escalado Responsivo**: Adaptación a la pantalla conservando la relación de aspecto (`Phaser.Scale.FIT`).
- **Pixel Art Mode**: Renderizado optimizado para gráficos pixel art sin difuminado.

---

## Tecnologías y Herramientas Utilizadas

- **HTML5 & CSS3**: Estructura base y estilos para el contenedor del lienzo (Canvas).
- **JavaScript (ES6+)**: Lógica del juego estructurada en módulos.
- **Phaser 3**: Framework HTML5 para la creación de juegos 2D (Cargado vía CDN).
- **Tiled** (Opcional): Para el diseño de los mapas (`proyecto-01.tiled-project`).

---

## Estructura del Proyecto

```text
📁 Proyectos/00-2d
├── 📁 assets/               # Imágenes, sprites, audios y mapas
├── 📁 src/                  # Código fuente del juego
│   ├── 📁 config/           # Configuraciones y constantes (constans.js)
│   ├── 📁 scenes/           # Lógica de cada escena (Boot, Menu, Niveles, etc.)
│   └── 📄 main.js           # Punto de entrada y configuración de Phaser
├── 📄 index.html            # Archivo principal de visualización
├── 📄 proyecto-01.*         # Archivos de sesión y proyecto de Tiled
└── 📄 README.md             # Documentación del proyecto
```

---

## Cómo Ejecutar el Proyecto

Dado que el juego utiliza Módulos ES6 (`<script type="module">`), es necesario ejecutarlo a través de un servidor web local para evitar problemas de políticas de seguridad (CORS) en el navegador.

### Opción 1: Usando VS Code (Recomendado)
1. Instala la extensión [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).
2. Abre la carpeta raíz del proyecto (`00-2d`) en Visual Studio Code.
3. Haz clic derecho sobre el archivo `index.html` y selecciona **"Open with Live Server"**.
4. El juego se abrirá automáticamente en tu navegador predeterminado (por defecto en `http://127.0.0.1:5500`).

### Opción 2: Usando Node.js / Python
Si prefieres usar la terminal, puedes iniciar un servidor rápido:

**Con Python 3:**
```bash
# En la raíz del proyecto
python -m http.server 8000
```

**Con Node.js (usando http-server o serve):**
```bash
# En la raíz del proyecto
npx serve .
```
Luego, accede a `http://localhost:8000` o `http://localhost:3000` según corresponda.

---

## Controles del Juego

*(Los controles específicos dependen de la implementación en las escenas de nivel, a continuación un estándar general)*

- **Flechas Direccionales / WASD**: Movimiento del personaje.
- **Barra Espaciadora**: Saltar / Acción.
- **Enter**: Seleccionar opciones en el menú.
