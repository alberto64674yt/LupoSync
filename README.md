# LupoSync 🐺 

> **Secure, serverless, Peer-to-Peer file transfer. | Transferencia de archivos P2P, segura y sin servidores.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Production](https://img.shields.io/badge/Status-Production_Ready-success)]()

---

### 🌍 Language / Idioma
[🇬🇧 **English**](#-english) | [🇪🇸 **Español**](#-español)

---

<a name="english"></a>
## 🇬🇧 English

**LupoSync** is a modern, privacy-focused web application for transferring files directly between devices without uploading them to any cloud server. It utilizes **WebRTC** technology to establish a direct Peer-to-Peer (P2P) connection, ensuring your data moves only from Sender to Receiver.

### ✨ Key Features

* **Serverless & Private:** Files are never stored on any server. Connection is direct (P2P).
* **Unlimited File Size:** Implements the **File System Access API (Streams)**.
    * *Desktop:* Writes chunks directly to disk, allowing multi-GB transfers without crashing RAM.
    * *Mobile/Legacy:* Intelligent fallback to RAM buffering for broad compatibility.
* **Cross-Platform & Mobile Ready:** Works on iOS, Android, Windows, Mac, and Linux.
    * Includes **Wake Lock API** to keep the device awake during transfers.
    * **Vibration API** feedback on completion or error.
* **PWA (Progressive Web App):** Installable as a native app on mobile and desktop. Works offline.
* **User Experience:**
    * Glassmorphism UI design.
    * QR Code & Magic Links for instant connection.
    * Transfer History (Local Storage).
    * Bilingual (English/Spanish).

### 🚀 How it Works

1.  **Signaling:** Uses `PeerJS` and public STUN servers to handshake and discover peers.
2.  **Transfer:** Once connected, a Data Channel is opened. Files are split into **64KB chunks**.
3.  **Saving:** The receiver reconstructs the file using streams (efficient) or blobs (compatible), ensuring data integrity.

### 🛠️ Tech Stack

* **Core:** HTML5, CSS3 (Variables, Animations), Vanilla JavaScript (ES6+).
* **P2P Logic:** PeerJS (WebRTC wrapper).
* **Utilities:** QRCode.js, FontAwesome.

### 📦 Deployment & Updates

This project is static and can be hosted on **Netlify**, **Vercel**, or **GitHub Pages**.

> **⚠️ Note for Developers:**
> Since this project uses a **Service Worker** for PWA capabilities, users might see cached versions of the app. When deploying a new update (HTML/CSS/JS changes), **always increment the `CACHE_NAME` version** inside `sw.js` (e.g., change `v2` to `v3`). This forces the browser to discard the old cache and load the new features immediately.

### 🤝 Contributing

Feel free to fork this project! It's designed to be a clean example of how to build serverless transfer tools.
1.  Fork the repo.
2.  Create your feature branch.
3.  Submit a Pull Request.

---

<a name="español"></a>
## 🇪🇸 Español

**LupoSync** es una aplicación web moderna y centrada en la privacidad para transferir archivos directamente entre dispositivos sin subirlos a ninguna nube. Utiliza tecnología **WebRTC** para establecer una conexión Peer-to-Peer (P2P) directa, asegurando que tus datos viajan únicamente del Emisor al Receptor.

### ✨ Características Principales

* **Sin Servidores y Privado:** Los archivos nunca tocan un servidor de almacenamiento. La conexión es directa.
* **Tamaño de Archivo Ilimitado:** Implementa la **File System Access API (Streams)**.
    * *Escritorio:* Escribe los datos directamente en el disco duro a medida que llegan, permitiendo enviar archivos de 50GB+ sin saturar la memoria RAM.
    * *Móvil/Antiguos:* Fallback inteligente a memoria RAM para máxima compatibilidad.
* **Multiplataforma y Móvil:** Funciona en iOS, Android, Windows, Mac y Linux.
    * Incluye **Wake Lock API** para evitar que la pantalla se apague durante el envío.
    * **Vibración** táctil al completar o fallar transferencias.
* **PWA (Progressive Web App):** Se puede instalar como una app nativa en tu móvil u ordenador. Funciona offline.
* **Experiencia de Usuario:**
    * Diseño Glassmorphism.
    * Códigos QR y "Magic Links" para conexión instantánea.
    * Historial de transferencias (Local).
    * Bilingüe (Inglés/Español).

### 🚀 Cómo Funciona

1.  **Señalización:** Usa `PeerJS` y servidores STUN públicos solo para encontrar al otro dispositivo en la red.
2.  **Transferencia:** Una vez conectados, se abre un canal de datos directo. Los archivos se dividen en **trozos (chunks) de 64KB**.
3.  **Guardado:** El receptor reconstruye el archivo usando streams (eficiencia) o blobs (compatibilidad), garantizando la integridad de los datos.

### 🛠️ Tecnologías

* **Core:** HTML5, CSS3 (Variables, Animaciones), Vanilla JavaScript (ES6+).
* **Lógica P2P:** PeerJS (WebRTC).
* **Utilidades:** QRCode.js, FontAwesome.

### 📦 Despliegue y Actualizaciones

Este proyecto es estático y puede alojarse fácilmente en **Netlify**, **Vercel** o **GitHub Pages**.

> **⚠️ Nota para Desarrolladores:**
> Dado que el proyecto usa un **Service Worker** para funcionar como App (PWA), los navegadores guardan la web en caché agresivamente. Al subir una actualización o mejora, **recuerda siempre incrementar la versión de `CACHE_NAME`** dentro del archivo `sw.js` (ej. cambiar `v2` a `v3`). Esto obliga al navegador a borrar la caché vieja y cargar tus cambios al instante.

### 🤝 Contribuciones

¡Siéntete libre de hacer un fork de este proyecto! Está diseñado para ser un ejemplo limpio y transparente de cómo crear herramientas sin servidores. Úsalo para aprender o crear tu propia versión.

---

<p align="center">
  Made with ❤️ by alberto64674yt
</p>
