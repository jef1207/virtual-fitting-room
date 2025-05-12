// Инициализация глобальных переменных
let scene, camera, renderer, currentModel;
let isRotating = false;
let isZoomed = false;
let poseTrackerInterval = null;
const clock = new THREE.Clock();

// Инициализация приложения
async function initApp() {
    try {
        showLoading(true);
        await initCamera();
        initThreeJS();
        initPoseTracking();
        initGestureControls();
        showLoading(false);
    } catch (error) {
        showError(`Ошибка инициализации: ${error.message}`);
    }
}

// Показ/скрытие загрузки
function showLoading(visible) {
    document.getElementById('loading').style.display = visible ? 'flex' : 'none';
}

// Показ ошибок
function showError(message) {
    const alert = document.getElementById('errorAlert');
    alert.textContent = message;
    alert.style.display = 'block';
    setTimeout(() => alert.style.display = 'none', 5000);
}

// Инициализация Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('canvas3d'),
        alpha: true,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
}

// Загрузка 3D-моделей
function loadModel(modelName) {
    if (currentModel) scene.remove(currentModel);
    
    const loader = new THREE.GLTFLoader();
    loader.load(`models/${modelName}.glb`,
        (gltf) => {
            currentModel = gltf.scene;
            currentModel.scale.set(0.5, 0.5, 0.5);
            scene.add(currentModel);
        },
        null,
        (error) => showError(`Ошибка загрузки модели: ${error.message}`)
    );
}

// Инициализация камеры устройства
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        const video = document.getElementById('camera');
        video.srcObject = stream;
        await new Promise(resolve => video.onloadedmetadata = resolve);
    } catch (error) {
        throw new Error('Доступ к камере запрещен!');
    }
}

// Трекинг позы с MediaPipe
function initPoseTracking() {
    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: true
    });

    pose.onResults((results) => {
        if (results.poseLandmarks && currentModel) {
            updateModelPosition(results.poseLandmarks);
        }
    });

    poseTrackerInterval = setInterval(() => {
        const video = document.getElementById('camera');
        if (video.readyState >= 2) pose.send({ image: video });
    }, 150);
}

// Обновление позиции модели
function updateModelPosition(landmarks) {
    const shoulderLeft = landmarks[11];
    const shoulderRight = landmarks[12];
    const hipLeft = landmarks[23];
    
    // Позиционирование
    currentModel.position.set(
        (shoulderLeft.x + shoulderRight.x) / 2 * window.innerWidth - window.innerWidth / 2,
        -(shoulderLeft.y + hipLeft.y) / 2 * window.innerHeight + window.innerHeight / 2,
        0
    );

    // Масштабирование
    const shoulderWidth = Math.abs(shoulderLeft.x - shoulderRight.x) * window.innerWidth;
    currentModel.scale.set(shoulderWidth * 0.005, shoulderWidth * 0.005, 1);
}

// Жесты (зум и вращение)
function initGestureControls() {
    const hammer = new Hammer(document.body);
    
    // Пинч-зум
    hammer.get('pinch').set({ enable: true });
    hammer.on('pinch', (e) => {
        if (!currentModel) return;
        currentModel.scale.multiplyScalar(e.scale);
    });

    // Вращение
    hammer.on('panrotate', (e) => {
        if (!currentModel) return;
        currentModel.rotation.y += e.rotation * 0.1;
    });
}

// Переключение зума
function toggleZoom() {
    isZoomed = !isZoomed;
    camera.fov = isZoomed ? 45 : 75;
    camera.updateProjectionMatrix();
}

// Автовращение
function toggleRotate() {
    isRotating = !isRotating;
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    
    if (isRotating && currentModel) {
        currentModel.rotation.y += clock.getDelta();
    }
    
    renderer.render(scene, camera);
}

// Очистка при закрытии
Telegram.WebApp.onEvent('viewportChanged', () => {
    if (!Telegram.WebApp.isExpanded) {
        clearInterval(poseTrackerInterval);
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
});

// Запуск
initApp();
animate();
