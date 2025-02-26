import { showMessage, messages } from "./messages.js";

/**
 * Klasa reprezentująca cząsteczkę na canvasie.
 *
 * @class Particle
 * @property {number} x - Pozycja X cząsteczki.
 * @property {number} y - Pozycja Y cząsteczki.
 * @property {number} vx - Prędkość X cząsteczki.
 * @property {number} vy - Prędkość Y cząsteczki.
 * @property {Function} update - Metoda aktualizująca pozycję cząsteczki.
 * @property {Function} draw - Metoda rysująca cząsteczkę.
 */
//! Particle object
class Particle {
  constructor(canvas) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = Math.random() * 10 - 5;
    this.vy = Math.random() * 10 - 5;
  }
  //* Update particle position
  update(canvas) {
    this.x += this.vx / 10;
    this.y += this.vy / 10;
    if (this.x < -50) this.x = canvas.width + 50;
    if (this.y < -50) this.y = canvas.height + 50;
    if (this.x > canvas.width + 50) this.x = -50;
    if (this.y > canvas.height + 50) this.y = -50;
  }
  //* Draw particle
  draw(context, image, size) {
    context.drawImage(image, this.x, this.y, size.width, size.height);
  }
}

/**
 * Tworzy canvas z cząsteczkami na stronie.
 *
 * @function particleCanvas
 * @see {@link createCanvas} - Funkcja tworząca element canvas.
 * @see {@link createParticles} - Funkcja tworząca cząsteczki.
 * @see {@link animateParticles} - Funkcja animująca cząsteczki.
 * @see {@link createSvgImage} - Funkcja tworząca obrazek SVG.
 * @see {@link showMessage} - Funkcja wyświetlająca komunikaty.
 * @param {string} canvasPath - Ścieżka do elementu, w którym ma być osadzony canvas.
 * @property {HTMLElement} destination - Element, w którym ma być osadzony canvas.
 * @property {Array} particles - Tablica cząsteczek.
 * @property {number} particleCount - Liczba cząsteczek.
 * @property {number} particleSize - Rozmiar cząsteczki.
 * @property {HTMLCanvasElement} canvas - Element canvas.
 * @property {CanvasRenderingContext2D} context - Kontekst rysowania na canvasie.
 * @property {Object} svgSize - Rozmiar obrazka SVG.
 * @property {Image} particleImage - Obrazek cząsteczki.
 * @returns {Promise<string>} Obietnica, która rozwiązuje się, gdy canvas z cząsteczkami zostanie załadowany.
 * @property {error} destinationError - Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 * @throws {error} Komunikat o błędzie, jeśli element nie zostanie znaleziony.
 */
//! Create particle canvas
export const particleCanvas = (canvasPath) => {
  //* Check if elements exist
  const destination = document.querySelector(canvasPath);
  const destinationError = messages.errors.canvas_not_found;
  if (!destination) return showMessage(destinationError.message, destinationError.description);
  //* Set particle count and size
  const particles = [];
  const particleCount = Math.max(window.innerWidth / 100, 15);
  const particleSize = Math.min(window.innerWidth / 150, 20);
  //* Create canvas
  const canvas = createCanvas(destination);
  const context = canvas.getContext("2d");
  //* Set particle size
  const svgSize = {
    width: (window.innerWidth / particleSize / 512) * 500,
    height: (window.innerWidth / particleSize / 384) * 500,
  };
  //* Create particle image
  const particleImage = new Image();
  particleImage.onload = () => {
    createParticles(particles, particleCount, canvas);
    animateParticles(context, canvas, particles, particleImage, svgSize);
  };
  //* Load particle image
  particleImage.src = createSvgImage(svgSize.width, svgSize.height);
  return Promise.resolve("Particle canvas loaded");
};

/**
 * Animuje cząsteczki na canvasie z użyciem requestAnimationFrame.
 *
 * @function animateParticles
 * @param {CanvasRenderingContext2D} context - Kontekst renderowania 2D.
 * @param {HTMLCanvasElement} canvas - Element canvas, na którym cząsteczki są rysowane.
 * @param {Particle[]} particles - Tablica cząsteczek.
 * @param {HTMLImageElement} image - Obraz SVG cząsteczki.
 * @param {Object} size - Rozmiar cząsteczki.
 * @param {number} size.width - Szerokość cząsteczki.
 * @param {number} size.height - Wysokość cząsteczki.
 * @returns {void}
 */
//! Animate particles
function animateParticles(context, canvas, particles, image, size) {
  function animate() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const particle of particles) {
      particle.update(canvas);
      particle.draw(context, image, size);
    }
    requestAnimationFrame(animate);
  }
  animate();
}

/**
 * Tworzy cząsteczki i dodaje je do tablicy.
 *
 * @function createParticles
 * @param {Particle[]} particles - Tablica cząsteczek.
 * @param {number} count - Liczba cząsteczek do utworzenia.
 * @param {HTMLCanvasElement} canvas - Element canvas, na którym cząsteczki będą rysowane.
 * @returns {Promise<void>} Obietnica, która rozwiązuje się, gdy cząsteczki zostaną utworzone.
 */
//! Create particles
function createParticles(particles, count, canvas) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(canvas));
  }
  return Promise.resolve();
}

//! Create canvas element
function createCanvas(destination) {
  const canvas = document.createElement("canvas");
  destination.appendChild(canvas);
  //* Set canvas size
  const setCanvasSize = () => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight / 2;
    } else {
      canvas.width = window.innerWidth / 2;
      canvas.height = window.innerHeight;
    }
  };
  //* Initial canvas size setup
  setCanvasSize();
  //* Adjust canvas size on window resize
  window.addEventListener("resize", setCanvasSize);
  return canvas;
}

/**
 * Tworzy element svg z cząsteczką.
 *
 * @function createCanvas
 * @param {number} width - Szerokość obrazka SVG.
 * @param {number} height - Wysokość obrazka SVG.
 * @property {string} svgString - Tekst SVG.
 * @property {Blob} blob - Blob z tekstem SVG.
 * @returns {HTMLCanvasElement} Utworzony element canvas.
 */
//! Create SVG image
function createSvgImage(width, height) {
  //* Create SVG string
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
      <path fill="#70126B" width="${width}" height="${height}" stroke="transparent" d="M202 0C122.2 0 70.5 32.7 29.9 91c-7.4 10.6-5.1 25.1 5.2 32.9l43.1 32.7c10.4 7.9 25.1 6 33.3-4.1 25-31.4 43.6-49.4 82.8-49.4 30.8 0 68.8 19.8 68.8 49.6 0 22.6-18.6 34.1-49 51.2-35.4 19.9-82.3 44.6-82.3 106.4V320c0 13.3 10.7 24 24 24h72.5c13.3 0 24-10.7 24-24v-5.8c0-42.9 125.3-44.6 125.3-160.6C377.5 66.3 286.9 0 202 0zM192 373.5c-38.2 0-69.3 31.1-69.3 69.3 0 38.2 31.1 69.3 69.3 69.3s69.3-31.1 69.3-69.3-31.1-69.3-69.3-69.3z"/>
    </svg>`;
  //* Create blob from SVG string
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  return URL.createObjectURL(blob);
}
