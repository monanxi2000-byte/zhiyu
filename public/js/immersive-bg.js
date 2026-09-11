/* ============================================================
   知遇 ZhiYu · 沉浸式3D滚动背景
   参考 PEARL 东方明珠沉浸式滚动 (https://github.com/zsj23333/dfmz)
   程序化生成知识岛屿场景，滚动驱动相机移动
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('immersiveBg');
  if (!canvas || typeof THREE === 'undefined') return;

  // ---------- 场景 / 相机 / 渲染器 ----------
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf0f4ff, 0.015);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 5, 30);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- 光照 ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const pointLight1 = new THREE.PointLight(0x0084ff, 0.6, 50);
  pointLight1.position.set(-15, 8, -10);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x9b59ff, 0.6, 50);
  pointLight2.position.set(15, 8, -20);
  scene.add(pointLight2);

  // ---------- 创建知识岛屿 ----------
  const islands = [];
  const islandColors = [0x0084ff, 0x9b59ff, 0xff6b9d, 0x00c9a7, 0xffa500];

  function createIsland(x, z, color, scale = 1) {
    const group = new THREE.Group();

    // 岛屿底座（圆柱）
    const baseGeo = new THREE.CylinderGeometry(3 * scale, 2 * scale, 2 * scale, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -1 * scale;
    base.castShadow = true;
    group.add(base);

    // 岛屿顶部（草地）
    const topGeo = new THREE.CylinderGeometry(3 * scale, 3 * scale, 0.5 * scale, 8);
    const topMat = new THREE.MeshLambertMaterial({ color: 0x7ec850 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.25 * scale;
    top.castShadow = true;
    group.add(top);

    // 中央建筑（不同形状代表不同领域）
    const buildingTypes = ['box', 'cylinder', 'cone', 'sphere'];
    const type = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
    let buildingGeo;
    if (type === 'box') {
      buildingGeo = new THREE.BoxGeometry(1.5 * scale, 2.5 * scale, 1.5 * scale);
    } else if (type === 'cylinder') {
      buildingGeo = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 3 * scale, 8);
    } else if (type === 'cone') {
      buildingGeo = new THREE.ConeGeometry(1.2 * scale, 3 * scale, 6);
    } else {
      buildingGeo = new THREE.SphereGeometry(1.2 * scale, 12, 12);
    }
    const buildingMat = new THREE.MeshLambertMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.15,
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 1.8 * scale;
    building.castShadow = true;
    group.add(building);

    // 发光环
    const ringGeo = new THREE.TorusGeometry(3.2 * scale, 0.08 * scale, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5 * scale;
    group.add(ring);
    group.userData.ring = ring;

    // 小树装饰
    for (let i = 0; i < 3; i++) {
      const tree = createSmallTree(scale * 0.6);
      const angle = (i / 3) * Math.PI * 2 + Math.random();
      tree.position.set(
        Math.cos(angle) * 2 * scale,
        0.5 * scale,
        Math.sin(angle) * 2 * scale
      );
      group.add(tree);
    }

    group.position.set(x, Math.random() * 2, z);
    group.userData = {
      baseY: group.position.y,
      floatSpeed: 0.3 + Math.random() * 0.3,
      floatOffset: Math.random() * Math.PI * 2,
      ring: ring,
    };

    scene.add(group);
    islands.push(group);
  }

  function createSmallTree(scale) {
    const tree = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 0.8 * scale, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.4 * scale;
    tree.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(0.5 * scale, 1 * scale, 6);
    const leavesMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 1.2 * scale;
    tree.add(leaves);

    return tree;
  }

  // 创建5个岛屿，沿Z轴排列
  createIsland(-12, -5, islandColors[0], 1.2);
  createIsland(10, -15, islandColors[1], 1);
  createIsland(-8, -25, islandColors[2], 1.3);
  createIsland(12, -35, islandColors[3], 1.1);
  createIsland(0, -45, islandColors[4], 1.5);

  // ---------- 水面 ----------
  const waterGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
  const waterMat = new THREE.MeshLambertMaterial({
    color: 0x4da6ff,
    transparent: true,
    opacity: 0.15,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -3;
  scene.add(water);

  // ---------- 粒子（星星/光点） ----------
  const particleCount = 80;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const colorPalette = [
    new THREE.Color(0x0084ff),
    new THREE.Color(0x9b59ff),
    new THREE.Color(0xff6b9d),
    new THREE.Color(0x00c9a7),
  ];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 25;
    positions[i * 3 + 2] = -Math.random() * 60;
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ---------- 滚动驱动相机 ----------
  let scrollProgress = 0;
  let targetScrollProgress = 0;

  function onScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    targetScrollProgress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- 响应式 ----------
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // ---------- 动画循环 ----------
  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // 平滑滚动进度
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;

    // 相机沿Z轴移动，同时轻微上下浮动和左右摆动
    const targetZ = 30 - scrollProgress * 70;
    const targetY = 5 + Math.sin(time * 0.3) * 0.5 + scrollProgress * 3;
    const targetX = Math.sin(time * 0.2) * 2 + scrollProgress * 5;

    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.lookAt(0, 3, targetZ - 10);

    // 岛屿漂浮动画
    islands.forEach((island) => {
      const { baseY, floatSpeed, floatOffset, ring } = island.userData;
      island.position.y = baseY + Math.sin(time * floatSpeed + floatOffset) * 0.5;
      island.rotation.y = Math.sin(time * 0.2 + floatOffset) * 0.1;
      if (ring) ring.rotation.z = time * 0.3;
    });

    // 粒子缓慢旋转
    particles.rotation.y = time * 0.02;

    // 水面轻微波动
    water.position.y = -3 + Math.sin(time * 0.5) * 0.1;

    renderer.render(scene, camera);
  }

  animate();
  onScroll();

  console.log('🌊 知遇沉浸式3D滚动背景已加载');
})();
