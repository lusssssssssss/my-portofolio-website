import React, { useState, useEffect, useRef } from 'react';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise';
import imagesLoaded from 'imagesloaded';
import * as THREE from 'three';
import './VoyageSlider.css'; 
import './App.css'; 
import waterPotabilityImg from './assets/Water-Potability.png';

function HomeCanvas() {
  const mountRef = useRef(null);
  const perlin = new ImprovedNoise();

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- Constants from your snippet ---
    const sim_res = 8500;
    const worldSize = 1000;
    const speed = 0.0055;
    const spawnSize = 0.1;
    const maxAge = 600;
    const aging = 0.002;
    const timeVariation = 0.03;

    // --- 1. SPHERE SETUP ---
    const sphereGeom = new THREE.IcosahedronGeometry(4, 2); // Size 4, Detail 2
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#556939', // Ayu Gold
      wireframe: true,
      transparent: true,
      opacity: 1.0
    });
    const mainSphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(mainSphere);

    // --- 2. PARTICLE SETUP ---
    const positions = new Float32Array(sim_res * 3);
    const ages = new Float32Array(sim_res); 
    const particleGeom = new THREE.BufferGeometry();
    
    for (let i = 0; i < sim_res; i++) {
      positions[i * 3] = (Math.random() - 0.5) * worldSize * spawnSize;
      positions[i * 3 + 1] = (Math.random() - 0.5) * worldSize * spawnSize;
      positions[i * 3 + 2] = -2 + (Math.random() - 0.5) * worldSize * spawnSize;
      ages[i] = Math.random() * maxAge * aging;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#91b362', // Ayu Green
      size: 0.06,
      transparent: true,
      opacity: 0.6
    });
    const particleSystem = new THREE.Points(particleGeom, particleMat);
    scene.add(particleSystem);

    // --- 3. LIGHTING ---
    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(10, 10, 10);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    // --- LOGIC FUNCTIONS ---
    const getNoise = (x, y, z) => perlin.noise(x, y, z);

    const animate = (time) => {
      const t = time * 0.001; 
      const variedTime = t * timeVariation;
      const posAttr = particleGeom.attributes.position;

      // Calculate Heartbeat Beat value once per frame for sync
      let beat = Math.sin(t * 5.5);
      if (beat < 0) beat *= 0.3;

      // A. UPDATE SPHERE (Pulsing with the beat)
      const scaleValue = 1 + (beat * 0); // Pulsing factor
      mainSphere.scale.set(scaleValue, scaleValue, scaleValue);
      
      // Rotate sphere using Perlin-style variation
      mainSphere.rotation.x += 0.002 + (getNoise(variedTime, 0, 0) * 0.01);
      mainSphere.rotation.y += 0.002 + (getNoise(0, variedTime, 0) * 0.01);

      // B. UPDATE 1700 PARTICLES
      for (let i = 0; i < sim_res; i++) {
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);
        let w = ages[i];

        // Force Field Logic
        let dx = getNoise(x, y, z + variedTime);
        let dy = getNoise(x + 400 + variedTime, y, z);
        let dz = getNoise(x + 500, y + variedTime, z);

        let dMag = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
        dx = (dx / dMag) * speed;
        dy = (dy / dMag) * speed;
        dz = (dz / dMag) * speed;

        // Apply Heartbeat to particles
        let pMag = Math.sqrt(x*x + y*y + z*z) || 1;
        let pushX = (x / pMag) * 0.007 * beat;
        let pushY = (y / pMag) * 0.007 * beat;
        let pushZ = Math.abs(z / pMag) * 0.021 * beat; // abs and *3 from snippet

        x += dx + pushX;
        y += dy + pushY;
        z += dz + pushZ;
        w += aging;

        // Reset Logic
        if (Math.abs(x) > worldSize || Math.abs(y) > worldSize || Math.abs(z) > worldSize || w > maxAge * aging) {
          const range = worldSize * spawnSize;
          x = getNoise(x, y, i * 3 + t) * range;
          y = getNoise(x, y, i * 3 + t * 3) * range;
          z = -2 + getNoise(x, y, i * 3 + t * 5) * range;
          w = getNoise(x, y, i * 3 + t * 5) * maxAge * aging;
        }

        posAttr.setXYZ(i, x, y, z);
        ages[i] = w;
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sphereGeom.dispose();
      sphereMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

function VoyageSlider() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Utilities ---
    const wrap = (n, max) => (n + max) % max;
    const lerp = (a, b, t) => a + (b - a) * t;

    const genId = (() => {
      let count = 0;
      return () => {
        return (count++).toString();
      };
    })();

    class Raf {
      constructor() {
        this.rafId = 0;
        this.raf = this.raf.bind(this);
        this.callbacks = [];
        this.start();
      }
      start() {
        this.raf();
      }
      stop() {
        cancelAnimationFrame(this.rafId);
      }
      raf() {
        this.callbacks.forEach(({ callback, id }) => callback({ id }));
        this.rafId = requestAnimationFrame(this.raf);
      }
      add(callback, id) {
        this.callbacks.push({ callback, id: id || genId() });
      }
      remove(id) {
        this.callbacks = this.callbacks.filter((callback) => callback.id !== id);
      }
    }

    class Vec2 {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      set(x, y) {
        this.x = x;
        this.y = y;
      }
      lerp(v, t) {
        this.x = lerp(this.x, v.x, t);
        this.y = lerp(this.y, v.y, t);
      }
    }

    const vec2 = (x = 0, y = 0) => new Vec2(x, y);

    function resolveOptions(node, options) {
      return {
        trigger: options?.trigger ?? node,
        target: options?.target
          ? Array.isArray(options.target)
            ? options.target
            : [options.target]
          : [node],
      };
    }

    const raf = new Raf();

    function tilt(node, options) {
      let { trigger, target } = resolveOptions(node, options);
      let lerpAmount = 0.02;

      const rotDeg = { current: vec2(), target: vec2() };
      const bgPos = { current: vec2(), target: vec2() };

      let rafId;

      function ticker({ id }) {
        rafId = id;
        rotDeg.current.lerp(rotDeg.target, lerpAmount);
        bgPos.current.lerp(bgPos.target, lerpAmount);

        for (const el of target) {
          el.style.setProperty('--rotX', rotDeg.current.y.toFixed(2) + 'deg');
          el.style.setProperty('--rotY', rotDeg.current.x.toFixed(2) + 'deg');
          el.style.setProperty('--bgPosX', bgPos.current.x.toFixed(2) + '%');
          el.style.setProperty('--bgPosY', bgPos.current.y.toFixed(2) + '%');
        }
      }

      const onMouseMove = (e) => {
        lerpAmount = 0.1;
        const rect = trigger.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        for (const el of target) {
          const width = rect.width;
          const height = rect.height;
          const ox = (mouseX - width * 0.5) / (Math.PI * 3);
          const oy = -(mouseY - height * 0.5) / (Math.PI * 4);
          
          rotDeg.target.set(ox, oy);
          bgPos.target.set(-ox * 0.3, oy * 0.3);
        }
      };

      const onMouseLeave = () => {
        lerpAmount = 0.06;
        rotDeg.target.set(0, 0);
        bgPos.target.set(0, 0);
      };

      const addListeners = () => {
        trigger.addEventListener('mousemove', onMouseMove);
        trigger.addEventListener('mouseleave', onMouseLeave);
      };

      const removeListeners = () => {
        trigger.removeEventListener('mousemove', onMouseMove);
        trigger.removeEventListener('mouseleave', onMouseLeave);
      };

      const init = () => {
        addListeners();
        raf.add(ticker);
      };

      const destroy = () => {
        removeListeners();
        raf.remove(rafId);
      };

      init();
      return { destroy };
    }

    // Variabel Slider Global di dalam useEffect
    let tiltDestroyers = [];
    let handlePrev, handleNext;
    let buttons = {};
    let slides = [];
    let slidesInfo = [];
    let slideBgs = [];
    let totalSlides = 0;
    let currentIndex = 0;

    function initSlider() {
      const loader = container.querySelector('.loader');
      slides = [...container.querySelectorAll('.slide')];
      slidesInfo = [...container.querySelectorAll('.slide-info')];
      slideBgs = [...container.querySelectorAll('.slide__bg')];
      totalSlides = slides.length;

      buttons = {
        prev: container.querySelector('.slider--btn__prev'),
        next: container.querySelector('.slider--btn__next'),
      };

      if (loader) {
        loader.style.opacity = 0;
        loader.style.pointerEvents = 'none';
      }

      slides.forEach((slide, i) => {
        const slideInner = slide.querySelector('.slide__inner');
        const slideInfoInner = slidesInfo[i].querySelector('.slide-info__inner');
        const { destroy } = tilt(slide, { target: [slideInner, slideInfoInner] });
        tiltDestroyers.push(destroy);
      });

      handlePrev = change(-1);
      handleNext = change(1);

      buttons.prev.addEventListener('click', handlePrev);
      buttons.next.addEventListener('click', handleNext);
    }

    function setup() {
      const loaderText = container.querySelector('.loader__text');
      const images = [...container.querySelectorAll('img')];
      const totalImages = images.length;
      let loadedImages = 0;
      let progress = { current: 0, target: 0 };

      if (totalImages === 0) {
        initSlider();
        return;
      }

      images.forEach((image) => {
        imagesLoaded(image, (instance) => {
          if (instance.isComplete) {
            loadedImages++;
            progress.target = loadedImages / totalImages;
          }
        });
      });

      raf.add(({ id }) => {
        progress.current = lerp(progress.current, progress.target, 0.06);
        const progressPercent = Math.round(progress.current * 100);
        if (loaderText) loaderText.textContent = `${progressPercent}%`;

        if (progressPercent === 100) {
          initSlider();
          raf.remove(id);
        }
      });
    }

    // Perbaikan Logika Navigasi Slider secara Dinamis untuk N Slide
    function change(direction) {
      return () => {
        if (totalSlides === 0) return;

        // 1. Bersihkan semua atribut data lama
        slides.forEach((el) => {
          el.removeAttribute('data-current');
          el.removeAttribute('data-next');
          el.removeAttribute('data-previous');
        });
        slidesInfo.forEach((el) => {
          el.removeAttribute('data-current');
          el.removeAttribute('data-next');
          el.removeAttribute('data-previous');
        });
        slideBgs.forEach((el) => {
          el.removeAttribute('data-current');
          el.removeAttribute('data-next');
          el.removeAttribute('data-previous');
        });

        // 2. Hitung index slide baru
        currentIndex = wrap(currentIndex + direction, totalSlides);
        const prevIndex = wrap(currentIndex - 1, totalSlides);
        const nextIndex = wrap(currentIndex + 1, totalSlides);

        // 3. Setel atribut data pada elemen target baru
        slides[currentIndex]?.setAttribute('data-current', '');
        slidesInfo[currentIndex]?.setAttribute('data-current', '');
        slideBgs[currentIndex]?.setAttribute('data-current', '');

        slides[nextIndex]?.setAttribute('data-next', '');
        slidesInfo[nextIndex]?.setAttribute('data-next', '');
        slideBgs[nextIndex]?.setAttribute('data-next', '');

        slides[prevIndex]?.setAttribute('data-previous', '');
        slidesInfo[prevIndex]?.setAttribute('data-previous', '');
        slideBgs[prevIndex]?.setAttribute('data-previous', '');

        // 4. Sinkronisasi kedalaman Z-Index untuk animasi visual tumpukan kartu
        slides.forEach((s) => (s.style.zIndex = '0'));
        if (direction === 1) {
          if (slides[currentIndex]) slides[currentIndex].style.zIndex = '20';
          if (slides[prevIndex]) slides[prevIndex].style.zIndex = '30'; 
          if (slides[nextIndex]) slides[nextIndex].style.zIndex = '10';
        } else if (direction === -1) {
          if (slides[currentIndex]) slides[currentIndex].style.zIndex = '20';
          if (slides[nextIndex]) slides[nextIndex].style.zIndex = '30'; 
          if (slides[prevIndex]) slides[prevIndex].style.zIndex = '10';
        }
      };
    }

    setup();

    return () => {
      raf.stop();
      tiltDestroyers.forEach((destroy) => destroy());
      if (buttons.prev && handlePrev) buttons.prev.removeEventListener('click', handlePrev);
      if (buttons.next && handleNext) buttons.next.removeEventListener('click', handleNext);
    };
  }, []);

  return (
    <div className="voyage-slider-container" ref={containerRef}>
      <div className="slider">
        <button className="slider--btn slider--btn__prev">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="slides__wrapper">
          <div className="slides">
            {/* slide 1 - Slide Aktif Utama */}
            <div className="slide" data-current style={{ zIndex: 30 }}>
              <div className="slide__inner">
                <a href="https://owenkhoo555-alp-water-portabilty-stremlit-app-njkjsk.streamlit.app/" target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                  <div className="slide--image__wrapper">
                    <img className="slide--image" src="https://leeroysalim-sys.github.io/Website-Louis/1.png" alt="Water Potability" />
                  </div>
                </a>
              </div>
            </div>
            <div className="slide__bg" style={{ '--bg': 'url(https://devloop01.github.io/voyage-slider/images/scotland-mountains.jpg)', '--dir': 0 }} data-current></div>

            {/* slide 2 - Kartu Sebelah Kanan */}
            <div className="slide" data-next style={{ zIndex: 10 }}>
              <div className="slide__inner">
                <div className="slide--image__wrapper">
                  <img className="slide--image" src="https://leeroysalim-sys.github.io/Website-Louis/2.png" alt="Image 2" />
                </div>
              </div>
            </div>
            <div className="slide__bg" style={{ '--bg': 'url(https://devloop01.github.io/voyage-slider/images/machu-pichu.jpg)', '--dir': 1 }} data-next></div>

            {/* slide 3 - Tersembunyi di Belakang */}
            <div className="slide" style={{ zIndex: 0 }}>
              <div className="slide__inner">
                <div className="slide--image__wrapper">
                  <a href="https://github.com/lusssssssssss/sakura_stay" target="_blank" rel="noreferrer">
                    <img className="slide--image" src="https://leeroysalim-sys.github.io/Website-Louis/3.png" alt="Image 3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="slide__bg" style={{ '--bg': 'url(https://devloop01.github.io/voyage-slider/images/chamonix.jpg)', '--dir': 1 }}></div>

            {/* slide 4 - Kartu Sebelah Kiri (Gambar Corndog) */}
            <div className="slide" data-previous style={{ zIndex: 20 }}>
              <div className="slide__inner">
                <div className="slide--image__wrapper">
                  <a href = "https://caoimhe.my.id/" target="_blank" rel="noreferrer">
                    <img className="slide--image" src="https://leeroysalim-sys.github.io/Website-Louis/4.png" alt="Image 4" />
                  </a> 
                </div>
              </div>
            </div>
            <div className="slide__bg" style={{ '--bg': 'url(https://devloop01.github.io/voyage-slider/images/rio-de-janeiro.jpg)', '--dir': 1 }} data-previous></div>
          </div>
          
          <div className="slides--infos">
            {/* Slide Info 1 */}
            <div className="slide-info" data-current>
              <div className="slide-info__inner">
                <div className="slide-info--text__wrapper">
                  <div data-title="true" className="slide-info--text">
                    <span>Water Potability</span>
                    <span>Prediction</span>
                  </div>
                  <div data-subtitle="true" className="slide-info--text">
                    <span>Data Science</span>
                  </div>
                  <div data-description="true" className="slide-info--text">
                    <span>The mountains are calling</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Info 2 */}
            <div className="slide-info" data-next>
              <div className="slide-info__inner">
                <div className="slide-info--text__wrapper">
                  <div data-title="true" className="slide-info--text">
                    <span>Corndogku</span>
                  </div>
                  <div data-subtitle="true" className="slide-info--text">
                    <span>Website Development</span>
                  </div>
                  <div data-description="true" className="slide-info--text">
                    <span>Adventure is never far away</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Info 3 */}
            <div className="slide-info">
              <div className="slide-info__inner">
                <div className="slide-info--text__wrapper">
                  <div data-title="true" className="slide-info--text">
                    <span>Sakura Stay</span>
                  </div>
                  <div data-subtitle="true" className="slide-info--text">
                    <span>Application Development</span>
                  </div>
                  <div data-description="true" className="slide-info--text">
                    <span>Let your dreams come true</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Info 4 (Penambahan info ke-4) */}
            <div className="slide-info" data-previous>
              <div className="slide-info__inner">
                <div className="slide-info--text__wrapper">
                  <div data-title="true" className="slide-info--text">
                    <span>Portofolio Website</span>
                  </div>
                  <div data-subtitle="true" className="slide-info--text">
                    <span>Indonesia</span>
                  </div>
                  <div data-description="true" className="slide-info--text">
                    <span>Predicting financial reliability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button className="slider--btn slider--btn__next">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="loader">
        <span className="loader__text">0%</span>
      </div>
    </div>
  );
}
const CodeHighlighter = ({ code }) => {
  const highlight = (str) => {
    if (!str) return "";
    let html = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const regex = /(\/\/.*|#.*)|(".*?"|'.*?'|`.*?`)|\b(const|let|function|if|else|for|while|return|def|import|from|int|include|main|std|cout|class)\b|\b(render|calculate_growth|getElementById|addEventListener|print|math|log|cout)\b|\b(\d+)\b/g;
    return html.replace(regex, (match, comment, string, keyword, func, number) => {
      if (comment) return `<span class="comment">${comment}</span>`;
      if (string) return `<span class="string">${string}</span>`;
      if (keyword) return `<span class="keyword">${keyword}</span>`;
      if (func) return `<span class="function">${func}</span>`;
      if (number) return `<span class="number">${number}</span>`;
      return match;
    });
  };

  return (
    <pre>
      <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
    </pre>
  );
};
function App() {
  const [activeTab, setActiveTab] = useState('python');
  
  const languageData = {
    python: {
      fileName: 'main.py',
      title: 'Python Scripting',
      language: 'Python',
      code: `import math

  def calculate_growth(data):
      # Calculate projected growth
      results = [x * 1.2 for x in data]
      print(f"Growth: {results}")
      return results

  stats = [10, 24, 45, 60]
  calculate_growth(stats)`
    },
    javascript: {
      fileName: 'main.js',
      title: 'React & Frontend',
      language: 'JavaScript',
      code: `const btn = document.getElementById('btn');
  let count = 0;

  function render() {
      btn.innerText = \`Count: \${count}\`;
  }

  btn.addEventListener('click', () => {
      // Count from 1 to 10.
      if (count < 10) {
          count += 1;
          render();
      }
  });`
    },
    html: {
      fileName: 'index.html',
      title: 'Web Markup',
      language: 'HTML',
      code: `<!DOCTYPE html>
  <html>
    <head>
      <title>Portfolio</title>
    </head>
    <body>
      <h1>Hello World</h1>
      <p>Building structured web content.</p>
    </body>
  </html>`
    },
    java: {
    fileName: 'main.java',
    title: 'Enterprise Java',
    language: 'Java',
    code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
        
        for(int i=0; i < 5; i++) {
            processTask(i);
        }
    }
}`
    },
    php: {
      fileName: 'index.php',
      title: 'Server-side PHP',
      language: 'PHP',
      code: `<?php
    $name = "Louis";
    echo "Welcome, " . $name;

    function get_status($val) {
        return $val ? "Active" : "Inactive";
    }
  ?>`
    }
  };

  return (
    <>
      {/* GANTI BLOCK NAVBAR LAMA KAMU DENGAN INI */}
      <nav id="navbar">
        <ul>
          <li>
            <a href="#edhomepage">
              <div className="home-icon">
                <div className="roof">
                  <div className="roof-edge"></div>
                </div>
                <div className="front"></div>
              </div>
            </a>
          </li>
          <li>
            <a href="#language-section">
              <div className="about-icon">
                <div className="head">
                  <div className="eyes"></div>
                  <div className="beard"></div>
                </div>
              </div>
            </a>
          </li>
          <li>
            <a href="#project">
              <div className="work-icon">
                <div className="paper"></div>
                <div className="lines"></div>
                <div className="lines"></div>
                <div className="lines"></div>
              </div>
            </a>
          </li>
          <li>
            <a href="#footer">
              <div className="mail-icon">
                <div className="mail-base">
                  <div className="mail-top"></div>
                </div>
              </div>
            </a>
          </li>
        </ul>
      </nav>

      {/* 3D Home */}
      <div id="edhomepage" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <HomeCanvas />
        
        <section style={{ 
          position: 'relative', 
          zIndex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: 'white',
          textAlign: 'center',
          pointerEvents: 'none' 
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold', paddingTop: '20rem' }}>
            LOUIS ANTHONY SALIM
          </h1>
          <p style={{ fontSize: '1.5rem', opacity: 0.8, fontFamily: 'Helvetica'}}>
            Undergraduate Data Scientist & Software Developer 
          </p>
          <div style={{ paddingTop: '15rem' }}>
      <a href="#language-section" className="scroll-arrow" style={{ pointerEvents: 'auto' }}>
        <svg 
          width="40" 
          height="40" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </a>
    </div>
        </section> 
      </div>
      
      {/* Language / Skills */}
      <section className="section" id="language-section">
        <div id="container-2">
          <h1 className="type-x1">CODING SKILLS</h1>
        </div>
        
        <div id="language">
          <div id="ide-container">
            <div id="ide-window">
              {/* Header with Traffic Lights and Theme Name */}
              <div id="ide-header">
                <div className="traffic-lights">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="ide-title">Visual Studio Code</div>
              </div>

              <div id="ide-body">
                {/* Sidebar - Now acting as the left Activity Bar */}
                <div id="ide-sidebar">
                  <div className="activity-top">
                    <i className="far fa-copy active"></i>
                    <i className="fas fa-search"></i>
                    <i className="fas fa-code-branch"></i>
                    <i className="fas fa-bug"></i>
                    <i className="fas fa-th-large"></i>
                  </div>
                  <div className="activity-bottom">
                    <i className="fas fa-user-circle"></i>
                    <i className="fas fa-cog"></i>
                  </div>
                </div>

                {/* Main Editor Section */}
                <div id="ide-main-content">
                  <div className="tabs">
                    {Object.keys(languageData).map((key) => (
                      <button 
                        key={key}
                        className={`tab-item ${activeTab === key ? 'active' : ''}`}
                        onClick={() => setActiveTab(key)}
                      >
                        {languageData[key].fileName}
                      </button>
                    ))}
                  </div>
                  
                  <div id="ide-editor">
                    <CodeHighlighter code={languageData[activeTab].code} />
                  </div>
                </div>
              </div>

              {/* Footer - The Status Bar */}
              <div id="ide-footer">
                <div className="status-left">
                  <div className='status-error'>
                    <i className="fas fa-times-circle"></i> 0 
                  </div>
                  <div className='status-alert'>
                    <i className="fas fa-exclamation-triangle"></i> 0
                  </div>
                </div>
                <div className="status-right">
                  {languageData[activeTab].title.split(' ')[0]} 
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Project */}
      <div id="project">
        <section>
          <div id="container-2">
            <h1 className="type-x1">MY PROJECTS</h1>
          </div>
          <VoyageSlider />
        </section>
      </div>

      {/* Footer */}
      <footer id="footer">
        <div className="footer-container">
          <div id="name">
            <h3>Louis Anthony Salim</h3>
            <p>© {new Date().getFullYear()} All rights reserved.</p>
          </div>
          
          <div id="connect">
            <p className="connect-title">Let's Connect</p>
            <div className="social-links">
              <a href="https://www.instagram.com/louisanthonyy_/" target="_blank" rel="noreferrer" className="social-icon" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://wa.me/+082139719889" target="_blank" rel="noreferrer" className="social-icon" aria-label="WhatsApp">
                <i className="fab fa-whatsapp"></i>
              </a>
              <a href="https://www.linkedin.com/in/louis-anthony-salim-5ba357386/" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="https://github.com/lusssssssssss" target="_blank" rel="noreferrer" className="social-icon" aria-label="GitHub">
                <i className="fab fa-github"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;