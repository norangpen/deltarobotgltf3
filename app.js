// Import necessary modules from Three.js
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

    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 0);
    scene.add(directionalLight);

    loadStaticModel();
    loadAnimatedModel();
    setupAnimationControls();
    animate();
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

