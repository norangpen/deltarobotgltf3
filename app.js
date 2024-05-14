import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer, clock;
let staticMixer, animationMixer;
let staticModel, animatedModel;
let controls;

function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(2, 2, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increase intensity
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(0, 1, 0).normalize(); // Move the sun to shine from above
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, 1).normalize(); // Adjust fill light for balance
    scene.add(directionalLight2);

    createGradientBackground(); // Add gradient background

    createGround(); // Add ground

    loadStaticModel();
    loadAnimatedModel();
    setupAnimationControls();
    animate();
}

function createGradientBackground() {
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec2 vUv;
        void main() {
            vec3 topColor = vec3(0.5, 0.7, 1.0);
            vec3 bottomColor = vec3(1.0, 1.0, 1.0);
            vec3 color = mix(bottomColor, topColor, vUv.y);
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const geometry = new THREE.SphereGeometry(100, 32, 32);
    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide, // Render the inside of the sphere
    });

    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

// Perlin Noise Function
function generatePerlinNoise(width, height, scale) {
    const size = width * height;
    const data = new Float32Array(size);
    const perlin = new Perlin();
    let quality = 1;
    for (let j = 0; j < 4; j++) {
        for (let i = 0; i < size; i++) {
            const x = i % width;
            const y = ~~(i / width);
            data[i] += perlin.noise(x / quality, y / quality, 0) * quality;
        }
        quality *= 5;
    }
    return data;
}

// Simple Perlin noise class
class Perlin {
    constructor() {
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ];
        this.p = [];
        for (let i = 0; i < 256; i++) {
            this.p[i] = Math.floor(Math.random() * 256);
        }
        this.perm = [];
        for(let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
        }
    }
    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }
    noise(x, y, z) {
        const floorX = Math.floor(x);
        const floorY = Math.floor(y);
        const floorZ = Math.floor(z);

        const X = floorX & 255;
        const Y = floorY & 255;
        const Z = floorZ & 255;

        x -= floorX;
        y -= floorY;
        z -= floorZ;

        const xMinus1 = x - 1;
        const yMinus1 = y - 1;
        const zMinus1 = z - 1;

        const u = fade(x);
        const v = fade(y);
        const w = fade(z);

        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;

        return lerp(w, lerp(v, lerp(u, this.grad3D(this.perm[AA], x, y, z),
            this.grad3D(this.perm[BA], xMinus1, y, z)),
            lerp(u, this.grad3D(this.perm[AB], x, yMinus1, z),
                this.grad3D(this.perm[BB], xMinus1, yMinus1, z))),
            lerp(v, lerp(u, this.grad3D(this.perm[AA + 1], x, y, zMinus1),
                this.grad3D(this.perm[BA + 1], xMinus1, y, zMinus1)),
                lerp(u, this.grad3D(this.perm[AB + 1], x, yMinus1, zMinus1),
                    this.grad3D(this.perm[BB + 1], xMinus1, yMinus1, zMinus1))));
    }
    grad3D(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
    return a + t * (b - a);
}

function createGround() {
    const width = 512;
    const height = 512;
    const scale = 50;
    const data = generatePerlinNoise(width, height, scale);

    const texture = new THREE.DataTexture(data, width, height, THREE.LuminanceFormat);
    texture.needsUpdate = true;

    const groundGeometry = new THREE.PlaneGeometry(100, 100, 256, 256);
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        displacementMap: texture,
        displacementScale: 2, // Adjust the displacement scale for more or less bumpiness
        roughness: 0.8,
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
    ground.position.y = -1; // Position the ground slightly below the models
    ground.receiveShadow = true; // Enable shadows on the ground
    scene.add(ground);
}

function loadStaticModel() {
    const loader = new GLTFLoader();
    loader.load('models/StaticModel.gltf', (gltf) => {
        staticModel = gltf.scene;
        staticModel.visible = false; // Start with the static model hidden
        scene.add(staticModel);
    }, undefined, loadModelFailed);
}

function loadAnimatedModel() {
    const loader = new GLTFLoader();
    loader.load('models/Animations.gltf', (gltf) => {
        animatedModel = gltf.scene;
        animatedModel.visible = false; // Start with the animated model hidden
        animationMixer = new THREE.AnimationMixer(animatedModel);
        gltf.animations.forEach((anim) => {
            const action = animationMixer.clipAction(anim);
            action.play(); // Play all animations
        });
        scene.add(animatedModel);
    }, undefined, loadModelFailed);
}

function setupAnimationControls() {
    document.getElementById('staticButton').addEventListener('click', () => {
        toggleModels(true);
    });

    document.getElementById('animationButton').addEventListener('click', () => {
        toggleModels(false);
    });
}

function toggleModels(showStatic) {
    if (staticModel) {
        staticModel.visible = showStatic;
    }
    if (animatedModel) {
        animatedModel.visible = !showStatic;
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (animationMixer && animatedModel && animatedModel.visible) {
        animationMixer.update(delta);
    }
    controls.update();
    renderer.render(scene, camera);
}

function loadModelFailed(error) {
    console.error("Failed to load model: ", error);
    alert('Failed to load the model, please check the console for more information.');
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.update();
});

init();
