// Инициализация Telegram Mini App
Telegram.WebApp.ready();
Telegram.WebApp.expand();

// Конфигурация Three.js
let scene, camera, renderer, currentModel;
const clock = new THREE.Clock();

// Инициализация сцены
function initThreeJS() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Загрузка 3D-модели
function loadModel(modelName) {
  if (currentModel) scene.remove(currentModel);
  
  const loader = new THREE.GLTFLoader();
  loader.load(`models/${modelName}.glb`, (gltf) => {
    currentModel = gltf.scene;
    currentModel.scale.set(0.5, 0.5, 0.5);
    scene.add(currentModel);
  });
}

// Трекинг позы через MediaPipe
const video = document.getElementById('camera');
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true
});

pose.onResults((results) => {
  if (results.poseLandmarks && currentModel) {
    const nose = results.poseLandmarks[0]; // Точка носа
    currentModel.position.set(
      (nose.x * window.innerWidth) - (window.innerWidth / 2),
      -(nose.y * window.innerHeight) + (window.innerHeight / 2),
      0
    );
  }
});

// Захват видео с камеры
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      // Запуск трекинга
      setInterval(() => {
        pose.send({ image: video });
      }, 100);
    };
  });

// Анимация
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Инициализация
initThreeJS();
animate();
