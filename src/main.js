import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load Earth textures
const textureLoader = new THREE.TextureLoader();
const earthDayTexture = textureLoader.load('textures/8k_earth_daymap.jpg');
const earthNightTexture = textureLoader.load('textures/8k_earth_nightmap.jpg');
const starsTexture = textureLoader.load('textures/8k_stars.jpg');
const sunTexture = textureLoader.load('textures/8k_sun.jpg');
const specularTexture = textureLoader.load('textures/k.jpg');

// Create Earth material with night and day textures
const earthMaterial = new THREE.MeshStandardMaterial({
  map: earthDayTexture,
  specularMap: specularTexture,
  metalness: 0.0,
  roughness: 0.6,
  emissive: 0x000000,
  emissiveIntensity: 0,
  side: THREE.FrontSide,
});

// Create the globe geometry and mesh
const globeGeometry = new THREE.SphereGeometry(5, 128, 128);
const globe = new THREE.Mesh(globeGeometry, earthMaterial);
globe.position.set(0, 0, -2);
scene.add(globe);

// Lighting setup
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 0, -200);
directionalLight.target = globe;
directionalLight.castShadow = true;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const starGeometry = new THREE.SphereGeometry(500, 60, 60);
const starMaterial = new THREE.MeshBasicMaterial({
  map: starsTexture,
  side: THREE.BackSide,
});
const stars = new THREE.Mesh(starGeometry, starMaterial);
scene.add(stars);

const sunGeometry = new THREE.SphereGeometry(220, 64, 64);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: sunTexture,
  emissive: 0xffff00,
  emissiveIntensity: 1.5,
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sun.position.set(0, 0, -600);
scene.add(sun);

camera.position.z = 15;
camera.position.x = 15;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;

// Function to update Earth texture based on sun position
function updateEarthTexture() {
  const lightDirection = directionalLight.position.clone().normalize();
  const globeDirection = globe.position.clone().normalize();
  const dot = lightDirection.dot(globeDirection);
  
  if (dot > 0) {
    earthMaterial.map = earthDayTexture;
  } else {
    earthMaterial.map = earthNightTexture;
  }

  earthMaterial.needsUpdate = true;
}

// Function to convert 3D coordinates to latitude/longitude
function getCoordinatesFromClick(x, y) {
  const mouse = new THREE.Vector2();
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(globe);

  if (intersects.length > 0) {
    const point = intersects[0].point;

    // Latitude calculation
    const latitude = Math.asin(point.y / globe.geometry.parameters.radius) * (180 / Math.PI);

    // Longitude calculation (corrected approach)
    let longitude = Math.atan2(point.z, point.x) * (180 / Math.PI);  // returns value between -π to π
    
    // Normalize longitude to be in the range [-180, 180] instead of [0, 360]
    if (longitude < 0) {
      longitude += 360;
    }
    // Make sure longitude falls within the correct range [-180, 180] after the adjustment
    if (longitude > 180) {
      longitude -= 360;
      longitude = longitude*-1;
    }

    // Correctly format latitude and longitude with N/S and E/W
    const latitudeDirection = latitude >= 0 ? 'N' : 'S';
    const longitudeDirection = longitude >= 0 ? 'E' : 'W';

    // Display the coordinates
    document.getElementById('cityName').innerText = 
      `Latitude: ${Math.abs(latitude).toFixed(4)}° ${latitudeDirection}, Longitude: ${Math.abs(longitude).toFixed(4)}° ${longitudeDirection}`;

    // Get the country using the OpenCage API
    getCountryFromCoordinates(latitude, longitude);
  }
}

// Function to get country from latitude and longitude using OpenCage API
async function getCountryFromCoordinates(latitude, longitude) {
    const apiKey = '0b1b712f5efa4894afd820edc4a17a80';  // Replace with your OpenCage API key
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+%2C${longitude}&key=${apiKey}`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
  
  
      if (data.results && data.results.length > 0) {
        const country = data.results[0].components.country;
        document.getElementById('countryName').innerText = `Country: ${country}`;
      } else {
        document.getElementById('countryName').innerText = 'Country not found.';
      }
    } catch (error) {
      console.error('Error fetching country data:', error);
      document.getElementById('countryName').innerText = 'Error retrieving country data.';
    }
  }
  
  

// Event listener for mouse click
window.addEventListener('click', (event) => {
  // Get coordinates of clicked point
  getCoordinatesFromClick(event.clientX, event.clientY);
});

// Render loop
function animate() {
  requestAnimationFrame(animate);

  controls.update();
  updateEarthTexture();
  renderer.render(scene, camera);
}

animate();

// Handle window resizing
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
});
