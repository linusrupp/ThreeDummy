import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
const backgroundColor = 0xd8e4e8;
scene.background = new THREE.Color(backgroundColor);

// Add fog
const fogColor = new THREE.Color(backgroundColor);
const fogNear = 800;
const fogFar = 18800;
scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(2222, 44, 2222);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(50, 50, 50);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Define a camera controller class
class CameraController {
    constructor(camera) {
        this.camera = camera;
        this.target = new THREE.Vector3(0, 0, 0);
        
        // Initial camera direction vector (normalized)
        this.direction = new THREE.Vector3();
        this.camera.getWorldDirection(this.direction);
        
        // Up vector
        this.up = new THREE.Vector3(0, 1, 0);
        
        // Right vector (cross product of direction and up)
        this.right = new THREE.Vector3();
        this.right.crossVectors(this.direction, this.up).normalize();
        
        // Rotation and movement speeds
        this.rotationSpeed = 0.0025;
        this.heightChangeSpeed = 2.4;
        
        // Track active transformation
        this.activeTransform = 'none'; // none, left, right, up, down
        
        // Track intensity of current transform
        this.intensity = 0;
    }
    
    update(mouseX, mouseY, windowWidth, windowHeight) {
        // Reset the direction and right vectors
        this.camera.getWorldDirection(this.direction);
        this.right.crossVectors(this.direction, this.up).normalize();
        
        // Define zones - divide screen into regions
        const zones = {
            left: { x: 0, width: windowWidth / 4 },
            right: { x: windowWidth * 3 / 4, width: windowWidth / 4 },
            top: { y: 0, height: windowHeight / 4 },
            bottom: { y: windowHeight * 3 / 4, height: windowHeight / 4 }
        };
        
        // Determine which zone the mouse is in
        let newActiveTransform = 'none';
        this.intensity = 0;
        
        if (mouseX < zones.left.x + zones.left.width) {
            newActiveTransform = 'left';
            // Calculate intensity - how far into left zone (0 to 1)
            const relativePos = 1 - (mouseX / zones.left.width);
            this.intensity = this.calculateEasing(relativePos);
        } else if (mouseX > zones.right.x) {
            newActiveTransform = 'right';
            // Calculate intensity - how far into right zone (0 to 1)
            const relativePos = (mouseX - zones.right.x) / zones.right.width;
            this.intensity = this.calculateEasing(relativePos);
        } else if (mouseY < zones.top.y + zones.top.height) {
            newActiveTransform = 'up';
            // Calculate intensity - how far into top zone (0 to 1)
            const relativePos = 1 - (mouseY / zones.top.height);
            this.intensity = this.calculateEasing(relativePos);
        } else if (mouseY > zones.bottom.y) {
            newActiveTransform = 'down';
            // Calculate intensity - how far into bottom zone (0 to 1)
            const relativePos = (mouseY - zones.bottom.y) / zones.bottom.height;
            this.intensity = this.calculateEasing(relativePos);
        }
        
        // Only change the active transform if mouse moves to a new zone
        if (newActiveTransform !== 'none') {
            this.activeTransform = newActiveTransform;
        } else if (
            !(mouseX < zones.left.x + zones.left.width) && 
            !(mouseX > zones.right.x) && 
            !(mouseY < zones.top.y + zones.top.height) && 
            !(mouseY > zones.bottom.y)
        ) {
            // Mouse is in the center zone
            this.activeTransform = 'none';
        }
        
        // Apply the active transformation
        switch(this.activeTransform) {
            case 'left':
                this.rotateLeft();
                break;
            case 'right':
                this.rotateRight();
                break;
            case 'up':
                this.moveUp();
                break;
            case 'down':
                this.moveDown();
                break;
        }
        
        // Update the target based on camera position and direction
        this.target.copy(this.camera.position).add(this.direction.clone().multiplyScalar(100));
    }
    
    calculateEasing(value) {
        // Exponential easing function
        // This creates a smooth acceleration curve
        return Math.pow(value, 2);
    }
    
    rotateLeft() {
        // Create rotation quaternion around world up axis
        const rotationAngle = this.rotationSpeed * this.intensity;
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(this.up, rotationAngle);
        
        // Apply rotation to camera position (orbit around the target)
        const cameraOffset = this.camera.position.clone().sub(this.target);
        cameraOffset.applyQuaternion(rotationQuaternion);
        this.camera.position.copy(this.target).add(cameraOffset);
        
        // Apply same rotation to camera orientation
        this.camera.quaternion.premultiply(rotationQuaternion);
    }
    
    rotateRight() {
        // Create rotation quaternion around world up axis
        const rotationAngle = -this.rotationSpeed * this.intensity;
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(this.up, rotationAngle);
        
        // Apply rotation to camera position (orbit around the target)
        const cameraOffset = this.camera.position.clone().sub(this.target);
        cameraOffset.applyQuaternion(rotationQuaternion);
        this.camera.position.copy(this.target).add(cameraOffset);
        
        // Apply same rotation to camera orientation
        this.camera.quaternion.premultiply(rotationQuaternion);
    }
    
    moveUp() {
        // Move camera up along world up vector
        this.camera.position.y += this.heightChangeSpeed * this.intensity;
    }
    
    moveDown() {
        // Move camera down along world up vector
        this.camera.position.y -= this.heightChangeSpeed * this.intensity;
    }
}

// Initialize camera controller
const cameraController = new CameraController(camera);

// Mouse position tracking
let mouseX = 0;
let mouseY = 0;

// FOV limits
const minFOV = 30;
const maxFOV = 60;
const fovChangeSpeed = 0.6;

window.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

// Mousewheel for FOV
window.addEventListener('wheel', (event) => {
    const newFOV = camera.fov + (event.deltaY > 0 ? fovChangeSpeed : -fovChangeSpeed);
    camera.fov = THREE.MathUtils.clamp(newFOV, minFOV, maxFOV);
    camera.updateProjectionMatrix();
});

// Load the model
const loader = new GLTFLoader();
loader.load(
    '/lauterbrunnen_valley_swiss_alps.glb',
    (gltf) => {
        const model = gltf.scene;
        model.traverse((node) => {
            if (node.isMesh) {
                // Convert all materials to basic emissive materials
                if (node.material) {
                    const originalTexture = node.material.map;
                    node.material = new THREE.MeshBasicMaterial({
                        map: originalTexture,
                        transparent: node.material.transparent,
                        opacity: node.material.opacity
                    });
                }
            }
        });
        scene.add(model);

        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        // Set initial camera target to model center
        cameraController.target.copy(center);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update camera controller
    cameraController.update(mouseX, mouseY, window.innerWidth, window.innerHeight);
    
    renderer.render(scene, camera);
}
animate(); 