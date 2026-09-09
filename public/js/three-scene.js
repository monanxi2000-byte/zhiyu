/* ============================================================
   知遇 ZhiYu · 3D 可拖拽展示区
   Three.js 立方体：刘看山三视图（正/侧/背）+ 产品信息
   交互：鼠标拖拽旋转、滚轮缩放、自动缓慢旋转
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('hero3d');
  if (!canvas || typeof THREE === 'undefined') return;

  // ---------- 场景 / 相机 / 渲染器 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.6, 5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // ---------- 光照 ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
  fillLight.position.set(-5, -3, -5);
  scene.add(fillLight);

  // ---------- 文字纹理生成（Canvas） ----------
  function makeTextTexture(lines, opts = {}) {
    const size = 1024;
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext('2d');

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, opts.bg1 || '#0747A6');
    grad.addColorStop(1, opts.bg2 || '#0084FF');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 装饰圆
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(size * 0.8, size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.15, size * 0.85, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const total = lines.length;
    lines.forEach((line, i) => {
      const y = size * 0.5 + (i - (total - 1) / 2) * (opts.lineHeight || 110);
      ctx.font = `${opts.weights?.[i] || 800} ${opts.sizes?.[i] || 72}px "Microsoft YaHei", "PingFang SC", sans-serif`;
      ctx.fillStyle = opts.colors?.[i] || '#fff';
      ctx.fillText(line, size / 2, y);
    });

    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    return tex;
  }

  // ---------- 图片纹理加载 ----------
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  function loadImgTex(url) {
    return new Promise((resolve) => {
      loader.load(
        url,
        (tex) => {
          tex.anisotropy = 8;
          resolve(tex);
        },
        undefined,
        () => resolve(null) // 加载失败返回 null，用纯色兜底
      );
    });
  }

  // ---------- 创建立方体 ----------
  // 面顺序：right(+x), left(-x), top(+y), bottom(-y), front(+z), back(-z)
  const defaultMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 });

  const geometry = new THREE.BoxGeometry(2.2, 2.8, 2.2);
  const cube = new THREE.Mesh(geometry, [defaultMat, defaultMat, defaultMat, defaultMat, defaultMat, defaultMat]);
  scene.add(cube);

  // 外层发光边框（线框）
  const edges = new THREE.EdgesGeometry(geometry);
  const edgeLines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x0084FF, transparent: true, opacity: 0.4 })
  );
  cube.add(edgeLines);

  // ---------- 加载纹理并赋值 ----------
  Promise.all([
    loadImgTex('/assets/mascot/kanshan-side.jpg'),   // right
    loadImgTex('/assets/mascot/kanshan-c8d9.jpg'),    // left（干净侧面白底）
    Promise.resolve(makeTextTexture(['知遇', 'ZhiYu'], {
      sizes: [120, 64], weights: [900, 400],
      bg1: '#0747A6', bg2: '#0084FF',
    })), // top
    Promise.resolve(makeTextTexture(['新领域的', '第一位引路人'], {
      sizes: [72, 72], weights: [700, 700],
      bg1: '#FF8C42', bg2: '#FF6B35',
    })), // bottom
    loadImgTex('/assets/mascot/kanshan-front.jpg'),  // front
    loadImgTex('/assets/mascot/kanshan-back.jpg'),   // back
  ]).then((textures) => {
    const mats = textures.map((tex, i) => {
      if (tex) {
        // 图片纹理用白色底色材质，文字纹理自带背景
        const isImg = i < 2 || i >= 4; // right/left/front/back 是图片
        return new THREE.MeshStandardMaterial({
          map: tex,
          roughness: isImg ? 0.85 : 0.5,
          metalness: 0.05,
        });
      }
      return defaultMat;
    });
    cube.material = mats;
  });

  // ---------- 轨道控制器 ----------
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 8;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.rotateSpeed = 0.7;

  // ---------- 自动旋转 + 交互暂停 ----------
  let autoRotate = true;
  let idleTimer = null;

  function pauseAuto() {
    autoRotate = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { autoRotate = true; }, 3000);
  }
  canvas.addEventListener('pointerdown', pauseAuto);
  canvas.addEventListener('wheel', pauseAuto, { passive: true });

  // ---------- 响应式 ----------
  function resize() {
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- 渲染循环 ----------
  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) {
      cube.rotation.y += 0.004;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
})();
