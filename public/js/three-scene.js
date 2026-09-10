/* ============================================================
   知遇 ZhiYu · 3D 可拖拽展示区 v3
   Blender建模刘看山3D模型（GLTFLoader加载）+ 随机动作动画
   交互：鼠标拖拽旋转、滚轮缩放、自动随机动作
   ============================================================ */

(function () {
  'use strict';

  const canvas = document.getElementById('hero3d');
  if (!canvas || typeof THREE === 'undefined') return;

  // ---------- 场景 / 相机 / 渲染器 ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.5, 4.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- 光照 ----------
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(5, 8, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffaa44, 0.3);
  rimLight.position.set(0, -3, -5);
  scene.add(rimLight);

  // ---------- 模型部件引用 ----------
  let mascot = null;
  let head = null;
  let leftArm = null;
  let rightArm = null;
  let leftEye = null;
  let rightEye = null;
  let scarfTail = null;
  let tail = null;
  let baseRing = null;
  let baseInner = null;
  let modelLoaded = false;

  // ---------- 加载Blender GLB模型 ----------
  const loader = new THREE.GLTFLoader();
  loader.load(
    '/assets/models/kanshan.glb',
    function (gltf) {
      const model = gltf.scene;
      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 找到Kanshan根对象
      mascot = model.getObjectByName('Kanshan') || model;
      scene.add(mascot);

      // 找到各个部件
      head = mascot.getObjectByName('Head');
      leftArm = mascot.getObjectByName('LeftArm');
      rightArm = mascot.getObjectByName('RightArm');
      leftEye = mascot.getObjectByName('LeftEye');
      rightEye = mascot.getObjectByName('RightEye');
      scarfTail = mascot.getObjectByName('ScarfTail');
      tail = mascot.getObjectByName('Tail');
      baseRing = mascot.getObjectByName('BaseRing');
      baseInner = mascot.getObjectByName('BaseInner');

      // 调整模型位置和大小
      mascot.position.y = -0.3;
      mascot.scale.set(0.85, 0.85, 0.85);

      modelLoaded = true;
      console.log('刘看山3D模型加载成功');
    },
    function (xhr) {
      // 加载进度
      if (xhr.total > 0) {
        console.log('模型加载中: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
      }
    },
    function (error) {
      console.error('模型加载失败，使用备用几何体:', error);
      createFallbackMascot();
    }
  );

  // ---------- 备用模型（代码拼接几何体，GLB加载失败时使用） ----------
  function createFallbackMascot() {
    mascot = new THREE.Group();
    scene.add(mascot);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.5, metalness: 0.05 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0084FF, roughness: 0.3, metalness: 0.2 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.6 });

    // 身体
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), whiteMat);
    body.position.y = 0.2;
    body.scale.set(1, 1.4, 1);
    body.castShadow = true;
    mascot.add(body);

    // 头
    head = new THREE.Mesh(new THREE.SphereGeometry(0.65, 24, 24), whiteMat);
    head.position.y = 1.35;
    head.castShadow = true;
    mascot.add(head);

    // 耳朵
    const earGeo = new THREE.ConeGeometry(0.2, 0.45, 4);
    const leftEar = new THREE.Mesh(earGeo, whiteMat);
    leftEar.position.set(-0.4, 1.85, 0);
    leftEar.rotation.z = 0.3;
    mascot.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, whiteMat);
    rightEar.position.set(0.4, 1.85, 0);
    rightEar.rotation.z = -0.3;
    mascot.add(rightEar);

    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(0.09, 12, 12);
    leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.22, 1.4, 0.55);
    mascot.add(leftEye);
    rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.22, 1.4, 0.55);
    mascot.add(rightEye);

    // 鼻子
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), darkMat);
    nose.position.set(0, 1.28, 0.6);
    nose.scale.set(1.2, 0.9, 0.8);
    mascot.add(nose);

    // 围巾
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 20), blueMat);
    scarf.position.y = 0.6;
    scarf.rotation.x = Math.PI / 2;
    mascot.add(scarf);
    scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.04), blueMat);
    scarfTail.position.set(0.3, 0.3, 0.3);
    scarfTail.rotation.z = -0.3;
    mascot.add(scarfTail);

    // 手臂
    const armGeo = new THREE.SphereGeometry(0.12, 8, 8);
    leftArm = new THREE.Mesh(armGeo, whiteMat);
    leftArm.position.set(-0.85, 0.4, 0);
    leftArm.scale.set(1, 2.5, 1);
    leftArm.rotation.z = 0.5;
    mascot.add(leftArm);
    rightArm = new THREE.Mesh(armGeo, whiteMat);
    rightArm.position.set(0.85, 0.4, 0);
    rightArm.scale.set(1, 2.5, 1);
    rightArm.rotation.z = -0.5;
    mascot.add(rightArm);

    // 腿
    const legGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const leftLeg = new THREE.Mesh(legGeo, whiteMat);
    leftLeg.position.set(-0.3, -0.6, 0);
    leftLeg.scale.set(1, 1.8, 1);
    mascot.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo, whiteMat);
    rightLeg.position.set(0.3, -0.6, 0);
    rightLeg.scale.set(1, 1.8, 1);
    mascot.add(rightLeg);

    // 底座发光环
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.2 });
    baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 8, 30), glowMat);
    baseRing.position.y = -0.95;
    baseRing.rotation.x = Math.PI / 2;
    mascot.add(baseRing);
    baseInner = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 8, 30), glowMat.clone());
    baseInner.position.y = -0.95;
    baseInner.rotation.x = Math.PI / 2;
    mascot.add(baseInner);

    modelLoaded = true;
    console.log('使用备用几何体模型');
  }

  // ---------- 漂浮粒子 ----------
  const particles = new THREE.Group();
  scene.add(particles);
  const particleGeo = new THREE.SphereGeometry(0.03, 6, 6);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0x9b59ff, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat.clone());
    p.position.set(
      (Math.random() - 0.5) * 3,
      Math.random() * 4 - 1,
      (Math.random() - 0.5) * 2
    );
    p.userData = {
      speed: 0.003 + Math.random() * 0.005,
      offset: Math.random() * Math.PI * 2,
    };
    particles.add(p);
  }

  // ---------- 随机动作系统 ----------
  const actions = ['idle', 'wave', 'nod', 'shake', 'jump', 'tilt', 'spin', 'blink'];
  let currentAction = 'idle';
  let actionStart = Date.now();
  let actionDuration = 2000;
  let userInteracting = false;
  let interactionTimer = null;

  function triggerRandomAction() {
    if (userInteracting) return;
    const r = Math.random();
    if (r < 0.4) {
      currentAction = 'idle';
      actionDuration = 1500 + Math.random() * 1500;
    } else {
      const nonIdle = actions.filter(a => a !== 'idle');
      currentAction = nonIdle[Math.floor(Math.random() * nonIdle.length)];
      actionDuration = currentAction === 'spin' ? 1200 : 800;
    }
    actionStart = Date.now();
  }

  // 初始延迟后开始随机动作
  setTimeout(() => {
    triggerRandomAction();
    setInterval(triggerRandomAction, 2500);
  }, 2000);

  function updateAction(time) {
    if (!modelLoaded || !mascot) return;
    const progress = Math.min((time - actionStart) / actionDuration, 1);

    // 基础呼吸
    const breathe = Math.sin(time * 0.002) * 0.02;
    const baseScale = 0.85;
    mascot.scale.set(baseScale + breathe, baseScale - breathe * 0.5, baseScale + breathe);

    switch (currentAction) {
      case 'wave':
        if (rightArm) {
          rightArm.rotation.z = -0.5 + Math.sin(progress * Math.PI * 4) * 0.6;
          rightArm.position.y = 0.4 + Math.sin(progress * Math.PI * 2) * 0.1;
        }
        if (progress >= 1 && rightArm) {
          rightArm.rotation.z = -0.5;
          rightArm.position.y = 0.4;
        }
        break;

      case 'nod':
        if (head) head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.2;
        mascot.position.y = -0.3 + Math.sin(progress * Math.PI) * 0.05;
        if (progress >= 1 && head) head.rotation.x = 0;
        break;

      case 'shake':
        if (head) head.rotation.y = Math.sin(progress * Math.PI * 4) * 0.25;
        if (progress >= 1 && head) head.rotation.y = 0;
        break;

      case 'jump':
        mascot.position.y = -0.3 + Math.sin(progress * Math.PI) * 0.4;
        if (leftArm) leftArm.rotation.z = 0.5 + Math.sin(progress * Math.PI) * 0.5;
        if (rightArm) rightArm.rotation.z = -0.5 - Math.sin(progress * Math.PI) * 0.5;
        if (progress >= 1) {
          mascot.position.y = -0.3;
          if (leftArm) leftArm.rotation.z = 0.5;
          if (rightArm) rightArm.rotation.z = -0.5;
        }
        break;

      case 'tilt':
        mascot.rotation.z = Math.sin(progress * Math.PI) * 0.15;
        if (head) head.rotation.z = Math.sin(progress * Math.PI) * 0.2;
        if (progress >= 1) {
          mascot.rotation.z = 0;
          if (head) head.rotation.z = 0;
        }
        break;

      case 'spin':
        mascot.rotation.y = progress * Math.PI * 2;
        if (progress >= 1) mascot.rotation.y = 0;
        break;

      case 'blink':
        const blinkScale = progress < 0.5 ?
          1 - Math.sin(progress * Math.PI * 2) * 0.9 :
          0.1 + Math.sin((progress - 0.5) * Math.PI * 2) * 0.9;
        if (leftEye) leftEye.scale.y = Math.max(blinkScale, 0.1);
        if (rightEye) rightEye.scale.y = Math.max(blinkScale, 0.1);
        if (progress >= 1) {
          if (leftEye) leftEye.scale.y = 1;
          if (rightEye) rightEye.scale.y = 1;
        }
        break;
    }

    // 围巾飘带动画
    if (scarfTail) {
      scarfTail.rotation.z = -0.3 + Math.sin(time * 0.003) * 0.15;
    }

    // 尾巴摇摆
    if (tail) {
      tail.rotation.x = -Math.PI / 2.5 + Math.sin(time * 0.004) * 0.2;
    }

    // 底座发光脉冲
    if (baseRing && baseRing.material) {
      baseRing.material.opacity = 0.2 + Math.sin(time * 0.002) * 0.1;
    }
    if (baseInner && baseInner.material) {
      baseInner.material.opacity = 0.15 + Math.sin(time * 0.0025) * 0.1;
    }
  }

  // ---------- 轨道控制器 ----------
  const controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 8;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;
  controls.rotateSpeed = 0.7;

  // ---------- 交互时暂停随机动作 ----------
  function onInteract() {
    userInteracting = true;
    clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => { userInteracting = false; }, 4000);
  }
  canvas.addEventListener('pointerdown', onInteract);
  canvas.addEventListener('wheel', onInteract, { passive: true });

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
    const time = Date.now();

    if (!userInteracting) {
      updateAction(time);
    } else if (mascot) {
      // 交互时保持基础呼吸
      const breathe = Math.sin(time * 0.002) * 0.02;
      const baseScale = 0.85;
      mascot.scale.set(baseScale + breathe, baseScale - breathe * 0.5, baseScale + breathe);
      if (scarfTail) scarfTail.rotation.z = -0.3 + Math.sin(time * 0.003) * 0.15;
      if (tail) tail.rotation.x = -Math.PI / 2.5 + Math.sin(time * 0.004) * 0.2;
    }

    // 粒子漂浮
    particles.children.forEach((p) => {
      p.position.y += p.userData.speed;
      p.position.x += Math.sin(time * 0.001 + p.userData.offset) * 0.002;
      if (p.position.y > 2.5) p.position.y = -2.5;
      p.material.opacity = 0.3 + Math.sin(time * 0.003 + p.userData.offset) * 0.3;
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
})();

/* ============================================================
   导航栏小3D刘看山模型（代码拼接几何体，轻量快速）
   ============================================================ */
function initNavMascot() {
  const canvas = document.getElementById('navMascot');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0.35, 2.6);
  camera.lookAt(0, 0.25, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(88, 88, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 3, 2);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
  fillLight.position.set(-2, 1, -1);
  scene.add(fillLight);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.05 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x0084ff, roughness: 0.5, metalness: 0.2 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7 });

  const mascot = new THREE.Group();
  mascot.position.y = -0.05;
  mascot.scale.set(1.15, 1.15, 1.15);
  scene.add(mascot);

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), whiteMat);
  body.position.y = 0;
  body.scale.set(1, 1.3, 1);
  body.castShadow = true;
  mascot.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 20), whiteMat);
  head.position.y = 0.85;
  head.castShadow = true;
  mascot.add(head);

  const earGeo = new THREE.ConeGeometry(0.13, 0.3, 4);
  const leftEar = new THREE.Mesh(earGeo, whiteMat);
  leftEar.position.set(-0.28, 1.2, 0);
  leftEar.rotation.z = 0.25;
  mascot.add(leftEar);
  const rightEar = new THREE.Mesh(earGeo, whiteMat);
  rightEar.position.set(0.28, 1.2, 0);
  rightEar.rotation.z = -0.25;
  mascot.add(rightEar);

  const innerEarGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
  const leftInner = new THREE.Mesh(innerEarGeo, pinkMat);
  leftInner.position.set(-0.28, 1.17, 0.05);
  leftInner.rotation.z = 0.25;
  mascot.add(leftInner);
  const rightInner = new THREE.Mesh(innerEarGeo, pinkMat);
  rightInner.position.set(0.28, 1.17, 0.05);
  rightInner.rotation.z = -0.25;
  mascot.add(rightInner);

  const eyeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, darkMat);
  leftEye.position.set(-0.15, 0.9, 0.38);
  mascot.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, darkMat);
  rightEye.position.set(0.15, 0.9, 0.38);
  mascot.add(rightEye);

  const highlightGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftHL = new THREE.Mesh(highlightGeo, highlightMat);
  leftHL.position.set(-0.13, 0.92, 0.43);
  mascot.add(leftHL);
  const rightHL = new THREE.Mesh(highlightGeo, highlightMat);
  rightHL.position.set(0.17, 0.92, 0.43);
  mascot.add(rightHL);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), darkMat);
  nose.position.set(0, 0.78, 0.42);
  nose.scale.set(1.2, 0.9, 0.8);
  mascot.add(nose);

  const blushGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, transparent: true, opacity: 0.6 });
  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(-0.3, 0.78, 0.35);
  leftBlush.scale.set(1, 0.6, 0.3);
  mascot.add(leftBlush);
  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(0.3, 0.78, 0.35);
  rightBlush.scale.set(1, 0.6, 0.3);
  mascot.add(rightBlush);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 8, 20), blueMat);
  scarf.position.y = 0.45;
  scarf.rotation.x = Math.PI / 2;
  mascot.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.04), blueMat);
  scarfTail.position.set(0.25, 0.3, 0.3);
  scarfTail.rotation.z = -0.3;
  mascot.add(scarfTail);

  const baseMat = new THREE.MeshBasicMaterial({ color: 0x0084ff, transparent: true, opacity: 0.2 });
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 30), baseMat);
  base.position.y = -0.65;
  base.rotation.x = Math.PI / 2;
  mascot.add(base);

  const actions = ['idle', 'swing', 'nod', 'jump', 'spin', 'blink', 'tilt'];
  let currentAction = 'idle';
  let actionStart = Date.now();
  let actionDuration = 2000;

  function triggerRandomAction() {
    const r = Math.random();
    if (r < 0.4) {
      currentAction = 'idle';
      actionDuration = 1500 + Math.random() * 1500;
    } else {
      const nonIdle = actions.filter(a => a !== 'idle');
      currentAction = nonIdle[Math.floor(Math.random() * nonIdle.length)];
      actionDuration = currentAction === 'spin' ? 1200 : 800;
    }
    actionStart = Date.now();
  }

  setTimeout(() => {
    triggerRandomAction();
    setInterval(triggerRandomAction, 2500);
  }, 1000);

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', () => {
    const nonIdle = actions.filter(a => a !== 'idle');
    currentAction = nonIdle[Math.floor(Math.random() * nonIdle.length)];
    actionStart = Date.now();
    actionDuration = currentAction === 'spin' ? 1200 : 800;
  });

  function animate() {
    requestAnimationFrame(animate);
    const time = Date.now();
    const progress = Math.min((time - actionStart) / actionDuration, 1);

    const breathe = Math.sin(time * 0.003) * 0.02;
    mascot.scale.set(1.15 + breathe, 1.15 - breathe * 0.5, 1.15 + breathe);

    switch (currentAction) {
      case 'swing':
        mascot.rotation.z = Math.sin(progress * Math.PI * 2) * 0.15;
        if (progress >= 1) mascot.rotation.z = 0;
        break;
      case 'nod':
        head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.2;
        if (progress >= 1) head.rotation.x = 0;
        break;
      case 'jump':
        mascot.position.y = -0.05 + Math.sin(progress * Math.PI) * 0.25;
        if (progress >= 1) mascot.position.y = -0.05;
        break;
      case 'spin':
        mascot.rotation.y = progress * Math.PI * 2;
        if (progress >= 1) mascot.rotation.y = 0;
        break;
      case 'blink':
        const blink = progress < 0.5 ? 1 - Math.sin(progress * Math.PI * 2) * 0.9 : 0.1 + Math.sin((progress - 0.5) * Math.PI * 2) * 0.9;
        leftEye.scale.y = Math.max(blink, 0.1);
        rightEye.scale.y = Math.max(blink, 0.1);
        if (progress >= 1) { leftEye.scale.y = 1; rightEye.scale.y = 1; }
        break;
      case 'tilt':
        mascot.rotation.z = Math.sin(progress * Math.PI) * 0.2;
        head.rotation.z = Math.sin(progress * Math.PI) * 0.15;
        if (progress >= 1) { mascot.rotation.z = 0; head.rotation.z = 0; }
        break;
    }

    scarfTail.rotation.z = -0.3 + Math.sin(time * 0.004) * 0.1;
    baseMat.opacity = 0.15 + Math.sin(time * 0.003) * 0.1;

    renderer.render(scene, camera);
  }
  animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavMascot);
} else {
  initNavMascot();
}
