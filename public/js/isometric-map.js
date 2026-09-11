/* ============================================================
   知遇 ZhiYu · 3D等距学习路径地图
   参考 Isometria 等距视角小岛 + 程序化生成
   ============================================================ */

(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let islands = [];
  let particles;
  let raycaster, mouse;
  let isInitialized = false;
  let currentStages = [];
  let onIslandClick = null;

  /* ========== 初始化 ========== */
  function init(containerId, stages, clickCallback) {
    const container = document.getElementById(containerId);
    if (!container || typeof THREE === 'undefined') return;

    currentStages = stages || [];
    onIslandClick = clickCallback;

    // 场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f4ff);
    scene.fog = new THREE.Fog(0xf0f4ff, 30, 80);

    // 相机（等距视角）
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    // 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 轨道控制
    if (typeof OrbitControls !== 'undefined') {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.5;
      controls.minDistance = 10;
      controls.maxDistance = 50;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    }

    // 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x9b59ff, 0.5, 50);
    pointLight.position.set(-10, 10, -10);
    scene.add(pointLight);

    // 射线检测（点击）
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 创建岛屿
    createIslands();

    // 创建粒子
    createParticles();

    // 创建水面
    createWater();

    // 事件
    renderer.domElement.addEventListener('click', onMouseClick);
    window.addEventListener('resize', onResize);

    isInitialized = true;
    animate();
  }

  /* ========== 创建漂浮岛屿 ========== */
  function createIslands() {
    const stageCount = Math.max(currentStages.length, 4);
    const colors = [0x0084ff, 0x9b59ff, 0xff6b9d, 0x00c9a7];
    const icons = ['📚', '🔧', '⚡', '🎯'];

    for (let i = 0; i < stageCount; i++) {
      const angle = (i / stageCount) * Math.PI * 2;
      const radius = 12;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(i * 1.5) * 2;

      const island = createIsland(i, colors[i % colors.length], icons[i % icons.length]);
      island.position.set(x, y, z);
      island.userData = {
        index: i,
        stage: currentStages[i] || { title: `阶段 ${i + 1}`, description: '' },
        baseY: y,
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
      };
      scene.add(island);
      islands.push(island);
    }
  }

  /* ========== 创建单个岛屿 ========== */
  function createIsland(index, color, icon) {
    const group = new THREE.Group();

    // 岛屿底座（圆柱）
    const baseGeo = new THREE.CylinderGeometry(3, 2.5, 1.5, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.75;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 岛屿顶部（草地）
    const topGeo = new THREE.CylinderGeometry(3, 3, 0.5, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: 0x7ec850 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.25;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // 中央建筑（阶段标志）
    const buildingGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const buildingMat = new THREE.MeshLambertMaterial({ color: color });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 1.5;
    building.castShadow = true;
    group.add(building);

    // 建筑顶部装饰
    const roofGeo = new THREE.ConeGeometry(1.2, 1, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 3;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // 发光环
    const ringGeo = new THREE.TorusGeometry(3.2, 0.1, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    group.add(ring);
    group.userData.ring = ring;

    // 阶段编号（用Sprite显示文字）
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index + 1, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 4.5, 0);
    sprite.scale.set(2, 2, 1);
    group.add(sprite);

    // 小树装饰
    for (let i = 0; i < 3; i++) {
      const tree = createTree();
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      tree.position.set(Math.cos(angle) * 2, 0.5, Math.sin(angle) * 2);
      tree.scale.set(0.6, 0.6, 0.6);
      group.add(tree);
    }

    return group;
  }

  /* ========== 创建小树 ========== */
  function createTree() {
    const tree = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4;
    trunk.castShadow = true;
    tree.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(0.5, 1, 6);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 1.2;
    leaves.castShadow = true;
    tree.add(leaves);

    return tree;
  }

  /* ========== 创建粒子 ========== */
  function createParticles() {
    const count = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorPalette = [
      new THREE.Color(0x0084ff),
      new THREE.Color(0x9b59ff),
      new THREE.Color(0xff6b9d),
      new THREE.Color(0x00c9a7),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  /* ========== 创建水面 ========== */
  function createWater() {
    const waterGeo = new THREE.PlaneGeometry(100, 100, 32, 32);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.3,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5;
    water.receiveShadow = true;
    scene.add(water);
  }

  /* ========== 鼠标点击 ========== */
  function onMouseClick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // 检测所有岛屿的子物体
    let clickedIsland = null;
    for (const island of islands) {
      const intersects = raycaster.intersectObjects(island.children, true);
      if (intersects.length > 0) {
        clickedIsland = island;
        break;
      }
    }

    if (clickedIsland && onIslandClick) {
      // 点击动画
      clickedIsland.userData.clickTime = Date.now();
      onIslandClick(clickedIsland.userData.stage, clickedIsland.userData.index);
    }
  }

  /* ========== 窗口大小变化 ========== */
  function onResize() {
    if (!renderer || !camera) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  /* ========== 动画循环 ========== */
  function animate() {
    if (!isInitialized) return;
    requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    // 岛屿漂浮动画
    for (const island of islands) {
      const { baseY, floatSpeed, floatOffset, clickTime } = island.userData;
      island.position.y = baseY + Math.sin(time * floatSpeed + floatOffset) * 0.5;
      island.rotation.y = Math.sin(time * 0.3 + floatOffset) * 0.1;

      // 点击弹跳动画
      if (clickTime) {
        const elapsed = (Date.now() - clickTime) / 1000;
        if (elapsed < 0.5) {
          island.position.y += Math.sin(elapsed * Math.PI * 4) * 0.5;
        } else {
          island.userData.clickTime = null;
        }
      }

      // 发光环旋转
      if (island.userData.ring) {
        island.userData.ring.rotation.z = time * 0.5;
      }
    }

    // 粒子动画
    if (particles) {
      particles.rotation.y = time * 0.05;
      const positions = particles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + i) * 0.01;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  /* ========== 销毁 ========== */
  function destroy() {
    if (!isInitialized) return;
    isInitialized = false;

    if (renderer) {
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    }

    window.removeEventListener('resize', onResize);
    islands = [];
    scene = null;
    camera = null;
    renderer = null;
    controls = null;
    particles = null;
  }

  /* ========== 暴露API ========== */
  window.IsometricMap = {
    init: init,
    destroy: destroy,
  };
})();
