/* ============================================================
   知遇 ZhiYu · 沉浸式3D宇宙星空背景 v4.0
   - 真实宇宙星空：数千颗星星 + 星云 + 银河 + 流星
   - 滚动驱动镜头在宇宙中穿梭
   - 鼠标视差 + 星星闪烁 + 星云流动
   - 与全站渐变背景融合
   ============================================================ */
(function () {
  'use strict';
  const canvas = document.getElementById('immersiveBg');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000011, 0.008);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 30);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));

  /* ========== 1. 星空背景（远处的星星） ========== */
  function createStarfield(count, radius, sizeRange) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // 星星颜色：白色、蓝色、黄色、红色
    const starColors = [
      new THREE.Color(0xffffff), // 白
      new THREE.Color(0xaaccff), // 蓝白
      new THREE.Color(0xffddaa), // 黄
      new THREE.Color(0xffaaaa), // 红
      new THREE.Color(0xccaaff), // 紫
    ];

    for (let i = 0; i < count; i++) {
      // 球面分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.5 + Math.random() * 0.5);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // 随机颜色
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // 随机大小
      sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    stars.userData = { sizes, baseOpacity: 0.9 };
    return stars;
  }

  // 三层星空：远、中、近
  const farStars = createStarfield(3000, 200, [0.5, 1.5]);
  const midStars = createStarfield(1500, 120, [1, 2.5]);
  const nearStars = createStarfield(500, 60, [1.5, 4]);
  scene.add(farStars, midStars, nearStars);

  /* ========== 2. 银河星云 ========== */
  function createNebula(color, position, scale) {
    const group = new THREE.Group();

    // 用多个粒子云模拟星云
    for (let layer = 0; layer < 3; layer++) {
      const count = 800;
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const baseColor = new THREE.Color(color);

      for (let i = 0; i < count; i++) {
        // 椭圆形分布
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * scale * (1 + layer * 0.3);
        const flatten = 0.3 + layer * 0.1;

        positions[i * 3] = Math.cos(theta) * r * (0.8 + Math.random() * 0.4);
        positions[i * 3 + 1] = Math.sin(theta) * r * flatten * (0.5 + Math.random() * 0.5);
        positions[i * 3 + 2] = Math.sin(theta) * r * 0.3 + (Math.random() - 0.5) * scale * 0.2;

        // 颜色渐变
        const colorVariation = 0.7 + Math.random() * 0.3;
        colors[i * 3] = baseColor.r * colorVariation;
        colors[i * 3 + 1] = baseColor.g * colorVariation;
        colors[i * 3 + 2] = baseColor.b * colorVariation;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: scale * 0.08,
        vertexColors: true,
        transparent: true,
        opacity: 0.15 - layer * 0.03,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });

      const cloud = new THREE.Points(geometry, material);
      cloud.rotation.x = Math.random() * Math.PI;
      cloud.rotation.y = Math.random() * Math.PI;
      group.add(cloud);
    }

    group.position.copy(position);
    group.userData = { rotationSpeed: 0.0002 + Math.random() * 0.0003 };
    return group;
  }

  // 多个星云
  const nebula1 = createNebula(0x4466ff, new THREE.Vector3(-40, 15, -80), 25);
  const nebula2 = createNebula(0xff4488, new THREE.Vector3(50, -20, -120), 30);
  const nebula3 = createNebula(0x44ffaa, new THREE.Vector3(0, 30, -150), 35);
  const nebula4 = createNebula(0xffaa44, new THREE.Vector3(-60, -30, -100), 20);
  scene.add(nebula1, nebula2, nebula3, nebula4);

  /* ========== 3. 银河带 ========== */
  function createMilkyWay() {
    const count = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 螺旋臂分布
      const arm = Math.floor(Math.random() * 2);
      const distance = Math.random() * 80 + 10;
      const angle = (distance * 0.05) + arm * Math.PI + (Math.random() - 0.5) * 0.5;

      positions[i * 3] = Math.cos(angle) * distance;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8 * (1 - distance / 100);
      positions[i * 3 + 2] = Math.sin(angle) * distance - 100;

      // 中心偏黄，边缘偏蓝
      const t = distance / 90;
      const color = new THREE.Color().setHSL(0.6 - t * 0.2, 0.5, 0.7 + Math.random() * 0.3);
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
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const milkyWay = new THREE.Points(geometry, material);
    milkyWay.rotation.x = Math.PI * 0.15;
    milkyWay.rotation.z = Math.PI * 0.1;
    return milkyWay;
  }

  const milkyWay = createMilkyWay();
  scene.add(milkyWay);

  /* ========== 4. 流星系统 ========== */
  const meteors = [];
  function createMeteor() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(2 * 3); // 起点和终点

    // 随机起点
    const startX = (Math.random() - 0.5) * 100;
    const startY = 30 + Math.random() * 20;
    const startZ = -50 - Math.random() * 50;

    positions[0] = startX;
    positions[1] = startY;
    positions[2] = startZ;
    positions[3] = startX;
    positions[4] = startY;
    positions[5] = startZ;

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 2,
    });

    const line = new THREE.Line(geometry, material);
    line.userData = {
      active: false,
      speed: 0.8 + Math.random() * 0.6,
      life: 0,
      maxLife: 60 + Math.random() * 40,
      direction: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        -1,
        (Math.random() - 0.5) * 0.3
      ).normalize(),
      tailLength: 8 + Math.random() * 6,
    };
    scene.add(line);
    meteors.push(line);
    return line;
  }

  // 创建10颗流星
  for (let i = 0; i < 10; i++) {
    createMeteor();
  }

  function updateMeteors(time) {
    meteors.forEach((meteor) => {
      const ud = meteor.userData;

      // 随机激活
      if (!ud.active && Math.random() < 0.002) {
        ud.active = true;
        ud.life = 0;
        // 重置位置
        const positions = meteor.geometry.attributes.position.array;
        const startX = (Math.random() - 0.5) * 100;
        const startY = 25 + Math.random() * 25;
        const startZ = -40 - Math.random() * 60;
        positions[0] = startX;
        positions[1] = startY;
        positions[2] = startZ;
        positions[3] = startX;
        positions[4] = startY;
        positions[5] = startZ;
        meteor.material.opacity = 0.8;
      }

      if (ud.active) {
        ud.life++;
        const positions = meteor.geometry.attributes.position.array;

        // 移动
        positions[3] += ud.direction.x * ud.speed;
        positions[4] += ud.direction.y * ud.speed;
        positions[5] += ud.direction.z * ud.speed;

        // 拖尾
        const tailFactor = Math.min(ud.life / 10, 1);
        positions[0] = positions[3] - ud.direction.x * ud.tailLength * tailFactor;
        positions[1] = positions[4] - ud.direction.y * ud.tailLength * tailFactor;
        positions[2] = positions[5] - ud.direction.z * ud.tailLength * tailFactor;

        meteor.geometry.attributes.position.needsUpdate = true;

        // 淡出
        if (ud.life > ud.maxLife * 0.7) {
          meteor.material.opacity = 0.8 * (1 - (ud.life - ud.maxLife * 0.7) / (ud.maxLife * 0.3));
        }

        // 结束
        if (ud.life >= ud.maxLife) {
          ud.active = false;
          meteor.material.opacity = 0;
        }
      }
    });
  }

  /* ========== 5. 行星（装饰） ========== */
  function createPlanet(color, size, position, hasRing) {
    const group = new THREE.Group();

    // 行星本体
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.1,
    });
    const planet = new THREE.Mesh(geometry, material);
    group.add(planet);

    // 光环
    if (hasRing) {
      const ringGeometry = new THREE.RingGeometry(size * 1.4, size * 2.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI * 0.4;
      group.add(ring);
    }

    group.position.copy(position);
    group.userData = { rotationSpeed: 0.002 + Math.random() * 0.003 };
    return group;
  }

  const planet1 = createPlanet(0x6688ff, 3, new THREE.Vector3(-25, 8, -60), true);
  const planet2 = createPlanet(0xff8866, 2, new THREE.Vector3(30, -5, -80), false);
  const planet3 = createPlanet(0x66ffaa, 1.5, new THREE.Vector3(10, 15, -50), false);
  scene.add(planet1, planet2, planet3);

  /* ========== 6. 光照 ========== */
  const ambient = new THREE.AmbientLight(0x334466, 0.3);
  scene.add(ambient);

  // 模拟恒星光源
  const starLight = new THREE.PointLight(0xffffff, 1, 200);
  starLight.position.set(0, 0, -50);
  scene.add(starLight);

  // 彩色点光源（星云发光）
  const light1 = new THREE.PointLight(0x4466ff, 0.5, 100);
  light1.position.copy(nebula1.position);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff4488, 0.4, 100);
  light2.position.copy(nebula2.position);
  scene.add(light2);

  /* ========== 7. 滚动与鼠标交互 ========== */
  let scrollProgress = 0;
  let targetScroll = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  function onScroll() {
    const top = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = h > 0 ? Math.min(Math.max(top / h, 0), 1) : 0;
  }

  function onMouseMove(e) {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ========== 8. 星星闪烁 ========== */
  function updateStars(time) {
    // 近景星星闪烁
    const sizes = nearStars.userData.sizes;
    const geometry = nearStars.geometry;
    // 整体旋转
    nearStars.rotation.y = time * 0.005;
    midStars.rotation.y = time * 0.003;
    farStars.rotation.y = time * 0.001;

    // 闪烁（通过透明度变化模拟）
    nearStars.material.opacity = 0.7 + Math.sin(time * 2) * 0.2;
    midStars.material.opacity = 0.8 + Math.sin(time * 1.5) * 0.1;
  }

  /* ========== 9. 动画循环 ========== */
  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // 平滑滚动
    scrollProgress += (targetScroll - scrollProgress) * 0.05;
    mouseX += (targetMouseX - mouseX) * 0.04;
    mouseY += (targetMouseY - mouseY) * 0.04;

    // 镜头在宇宙中穿梭
    const targetZ = 30 - scrollProgress * 120;
    const targetY = Math.sin(time * 0.2) * 2 + scrollProgress * 10 + mouseY * -3;
    const targetX = Math.sin(time * 0.15) * 3 + scrollProgress * 8 + mouseX * 5;

    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.x += (targetX - camera.position.x) * 0.05;

    // 镜头看向鼠标方向
    camera.lookAt(mouseX * 3, mouseY * 2, camera.position.z - 30);

    // 更新星星
    updateStars(time);

    // 更新星云旋转
    nebula1.rotation.z += nebula1.userData.rotationSpeed;
    nebula2.rotation.z -= nebula2.userData.rotationSpeed;
    nebula3.rotation.z += nebula3.userData.rotationSpeed * 0.5;
    nebula4.rotation.z -= nebula4.userData.rotationSpeed * 0.7;

    // 银河缓慢旋转
    milkyWay.rotation.z += 0.0003;

    // 行星自转
    planet1.rotation.y += planet1.userData.rotationSpeed;
    planet2.rotation.y += planet2.userData.rotationSpeed;
    planet3.rotation.y += planet3.userData.rotationSpeed;

    // 流星
    updateMeteors(time);

    // 灯光呼吸
    light1.intensity = 0.4 + Math.sin(time * 0.8) * 0.15;
    light2.intensity = 0.35 + Math.sin(time * 0.6 + 1) * 0.12;

    renderer.render(scene, camera);
  }

  animate();
  onScroll();

  console.log('🌌 知遇沉浸式宇宙星空背景 v4.0 已加载');
})();
