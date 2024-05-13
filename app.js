// Import necessary modules from Three.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

let camera, scene, renderer, clock;
let mixer;
const animations = [];
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

    loadAnimatedModelAndAnimations();
    setupAnimationControls();
    animate();
}

function loadAnimatedModelAndAnimations() {
    const loader = new GLTFLoader();
    loader.load('models/StaticModel.gltf', (gltf) => {
        scene.add(gltf.scene);
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach((anim) => {
            const action = mixer.clipAction(anim);
            animations.push(action);
        });
        // Optionally play the first "static" animation automatically
        animations[0].play(); // Assuming the first loaded animation is the static model display
    }, undefined, loadModelFailed);
}

function setupAnimationControls() {
    const buttons = document.querySelectorAll('#animation-controls button');
    buttons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const index = parseInt(button.getAttribute('data-animation'), 10);
            playAnimation(index);
        });
    });
}

function playAnimation(index) {
    animations.forEach((anim, i) => {
        anim.stop(); // Stop all animations
        if (i === index) {
            anim.play(); // Play the selected animation
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
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

