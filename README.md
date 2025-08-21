
# `Hecho en Oaxaca`

Bienvenido a **HechoenOaxaca-icp**, un marketplace descentralizado construido sobre **Internet Computer (ICP)**.  
La plataforma conecta a **artesanos oaxaqueños** con consumidores globales, garantizando **transparencia, autenticidad y comercio justo** gracias a la tecnología blockchain.  

---

## 🚀 Funcionalidades principales
- **Registro de usuarios** con distintos roles:  
  - **Productores Artesanos**: Venden productos auténticos hechos en Oaxaca.  
  - **Socios Estratégicos**: Apoyan en comercialización y distribución.  
  - **Consumidores**: Compran productos exclusivos directamente de los artesanos.  
- **Gestión de productos**: creación, edición, eliminación y visualización con soporte de imágenes.  
- **Autenticación segura** con Internet Identity.  
- **Pagos integrados** mediante **Ledger Canister** con ICP reales o de prueba.  
- **Despliegue en Mainnet o Local Replica** para pruebas y producción.  

---

## 📦 Requisitos Previos
Asegúrate de tener instalado:  

- **Node.js y npm** → para ejecutar el frontend.  
- **DFX SDK** → para compilar y desplegar canisters.  
- **Ubuntu/WSL2 (en Windows)** → para entorno compatible.  
- **Git** → para clonar y gestionar el repositorio.  

---

## 🛠️ Instalación y Ejecución

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/HechoenOaxaca-icp.git
cd HechoenOaxaca-icp
````

### 2. Iniciar la réplica local

```bash
dfx start --background
```

### 3. Desplegar los canisters

```bash
dfx deploy
```

Esto desplegará:

* **Backend (Motoko)**
* **Frontend (React)**
* **Internet Identity**
* **Ledger Canister** (para pruebas de transacciones en ICP)

### 4. Iniciar el frontend

```bash
npm install
npm run start
```

La aplicación estará disponible en:

* `http://localhost:3000` → interfaz de usuario
* `http://127.0.0.1:4943` → replica local de ICP

---

## 💳 Pagos con ICP (Ledger)

Este proyecto integra el **Ledger Canister** para manejar pagos:

* **Pagos de consumidores a artesanos** utilizando ICP.
* **Transferencias seguras** gracias al ledger estándar de ICP.
* Compatible con **Mainnet** y **Local replica** para pruebas.

Ejemplo de despliegue del ledger local:

```bash
dfx ledger create-canister
dfx ledger fabricate-cycles --amount 100T
```

---

## 📂 Estructura del Proyecto

* `src/backend/` → Lógica de negocio en **Motoko**.
* `src/frontend/` → Interfaz en **React + JavaScript/TypeScript**.
* `dfx.json` → Configuración del proyecto y canisters.

---

## 👩‍💻 Desarrollo y Contribución

* Modifica el backend y genera nuevas interfaces Candid con:

  ```bash
  npm run generate
  ```
* Para contribuir:

  1. Haz un fork del repositorio.
  2. Crea una rama (`feature/nueva-funcionalidad`).
  3. Haz un Pull Request con la mejora.

---

## 📚 Recursos

* [Internet Computer Docs](https://internetcomputer.org/docs/current/developer-docs/setup/install)
* [Motoko Language Guide](https://internetcomputer.org/docs/current/motoko/main/motoko)
* [Ledger Canister Reference](https://internetcomputer.org/docs/current/references/ledger)



