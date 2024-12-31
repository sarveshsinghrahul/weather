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
const starsTexture = textureLoader.load('textures/8k_stars.jpg');
const sunTexture = textureLoader.load('textures/8k_sun.jpg');
const specularTexture = textureLoader.load('textures/k.jpg');


// Create Earth material with night and day textures
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthDayTexture,
  specularMap: specularTexture,
  specular: new THREE.Color(0x222222), // Adjust specular highlight intensity
  shininess: 50, // Adjust shininess
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

camera.position.z = 550;
camera.position.x = 150;

earthMaterial.bumpMap = textureLoader.load('textures/8k_earth_normal_map.jpg');
earthMaterial.bumpScale = 10.05;

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

// Function to fetch and display weather data
async function fetchWeather(latitude, longitude) {
  const apiKey = '0cbd802472f021f1589271baf4555044'; // Replace with your OpenWeatherMap API key
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data) {
      const temperature = data.main.temp; // Temperature in Celsius
      const weatherDescription = data.weather[0].description; // Weather description

      document.getElementById('weatherDescription').innerText = `Weather: ${weatherDescription}`;
      document.getElementById('temperature').innerText = `Temperature: ${temperature.toFixed(1)}°C`;
    } else {
      document.getElementById('weatherDescription').innerText = 'Weather data not found.';
      document.getElementById('temperature').innerText = '';
    }
  } catch (error) {
    console.error('Error fetching weather data:', error);
    document.getElementById('weatherDescription').innerText = 'Error retrieving weather data.';
    document.getElementById('temperature').innerText = '';
  }
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

    // Longitude calculation with corrected alignment
    let longitude = Math.atan2(-point.z, point.x) * (180 / Math.PI);

    // Longitude adjustment for proper hemisphere
    const latitudeDirection = latitude >= 0 ? 'N' : 'S';
    const longitudeDirection = longitude >= 0 ? 'E' : 'W';

    document.getElementById('cityName').innerText =
      `Latitude: ${Math.abs(latitude).toFixed(4)}° ${latitudeDirection}, Longitude: ${Math.abs(longitude).toFixed(4)}° ${longitudeDirection}`;

    getCountryFromCoordinates(latitude, longitude);

    fetchWeather(latitude,longitude);
  }
}


// Function to get country from latitude and longitude using OpenCage API
async function getCountryFromCoordinates(latitude, longitude) {
  const apiKey = '0b1b712f5efa4894afd820edc4a17a80';
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
  getCoordinatesFromClick(event.clientX, event.clientY);
});

// Smooth zoom method
let isZooming = false;
function cameraZoomIn() {
  if (isZooming) return;
  isZooming = true;

  const targetPosition = new THREE.Vector3(25, 0, -30);
  const zoomDuration = 2000; // Zoom duration in milliseconds
  const startTime = performance.now();

  const initialPosition = camera.position.clone();

  function zoomAnimation() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / zoomDuration, 1); // Clamp t to [0, 1]

    camera.position.lerpVectors(initialPosition, targetPosition, t);
    controls.update();

    if (t < 1) {
      requestAnimationFrame(zoomAnimation);
    } else {
      isZooming = false;
    }
  }

  zoomAnimation();
}

// Function to hide hero section and zoom camera
function hideHero() {
  const heroSection = document.getElementById('hero');
  heroSection.style.display = 'none';

  cameraZoomIn();
}

// Event listener for button click
const heroButton = document.getElementById('heroButton');
heroButton.addEventListener('click', hideHero);

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

