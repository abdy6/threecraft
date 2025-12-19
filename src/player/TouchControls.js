import nipplejs from 'nipplejs';
import { CONFIG } from '../config.js';

export class TouchControls {
  constructor() {
    this.isTouchDevice = this.detectTouchDevice();
    this.shouldShowControls = this.isTouchDevice || CONFIG.SHOW_TOUCH_CONTROLS;
    
    // Joystick state (using nipplejs)
    this.joystick = null;
    this.joystickActive = false;
    this.joystickPosition = { x: 0, y: 0 };
    
    // Camera rotation state
    this.cameraRotationActive = false;
    this.lastTouchPosition = { x: 0, y: 0 };
    this.cameraTouchId = null;
    this.touchRotation = { deltaX: 0, deltaY: 0 };
    
    // Button states
    this.jumpPressed = false;
    this.placePressed = false;
    this.breakPressed = false;
    this.cyclePressed = false;
    
    // Button press events (for one-time actions)
    this.jumpPressedThisFrame = false;
    this.placePressedThisFrame = false;
    this.breakPressedThisFrame = false;
    this.cyclePressedThisFrame = false;
    
    // Track all active touches
    this.activeTouches = new Map();
    
    // UI elements (will be set in initialize)
    this.joystickContainer = null;
    this.jumpButton = null;
    this.placeButton = null;
    this.breakButton = null;
    this.cycleButton = null;
    
    // Retry counter for initialization
    this.initRetryCount = 0;
    this.maxInitRetries = 10;
    
    if (this.shouldShowControls) {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        // DOM is already ready, but wait a tick to ensure elements exist
        setTimeout(() => this.initialize(), 0);
      }
    }
  }
  
  detectTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  initialize() {
    // Add touch-device class to body for CSS styling
    if (this.shouldShowControls) {
      document.body.classList.add('touch-device');
    }
    
    // Get UI elements
    this.joystickContainer = document.getElementById('touch-joystick-container');
    this.jumpButton = document.getElementById('touch-jump-btn');
    this.placeButton = document.getElementById('touch-place-btn');
    this.breakButton = document.getElementById('touch-break-btn');
    this.cycleButton = document.getElementById('touch-cycle-btn');
    
    // If critical elements aren't found, retry after a short delay (with limit)
    if ((!this.joystickContainer || !this.jumpButton || !this.placeButton || !this.breakButton || !this.cycleButton) && this.initRetryCount < this.maxInitRetries) {
      this.initRetryCount++;
      setTimeout(() => this.initialize(), 100);
      return;
    }
    
    // Initialize nipplejs joystick
    if (this.joystickContainer) {
      this.joystickContainer.style.display = 'block';
      this.joystickContainer.style.visibility = 'visible';
      
      this.joystick = nipplejs.create({
        zone: this.joystickContainer,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 120,
        threshold: 0.1,
        fadeTime: 250
      });
      
      // Handle joystick events
      this.joystick.on('start', () => {
        this.joystickActive = true;
      });
      
      this.joystick.on('move', (evt, data) => {
        this.joystickActive = true;
        // data.vector gives us the direction vector (normalized)
        // data.force gives us the distance/intensity (0-1)
        // Multiply vector by force to get variable speed
        this.joystickPosition.x = data.vector.x * data.force;
        this.joystickPosition.y = data.vector.y * data.force;
      });
      
      this.joystick.on('end', () => {
        this.joystickActive = false;
        this.joystickPosition.x = 0;
        this.joystickPosition.y = 0;
      });
    }
    
    // Show buttons
    if (this.jumpButton) {
      this.jumpButton.style.display = 'flex';
      this.jumpButton.style.visibility = 'visible';
    }
    if (this.placeButton) {
      this.placeButton.style.display = 'flex';
      this.placeButton.style.visibility = 'visible';
    }
    if (this.breakButton) {
      this.breakButton.style.display = 'flex';
      this.breakButton.style.visibility = 'visible';
    }
    if (this.cycleButton) {
      this.cycleButton.style.display = 'flex';
      this.cycleButton.style.visibility = 'visible';
    }
    
    // Setup event listeners
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Touch events for camera rotation (joystick is handled by nipplejs)
    document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
    
    // Button events
    if (this.jumpButton) {
      this.jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.jumpPressed = true;
        this.jumpPressedThisFrame = true;
        this.jumpButton.style.opacity = '0.6';
      });
      this.jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.jumpPressed = false;
        this.jumpButton.style.opacity = '1';
      });
    }
    
    if (this.placeButton) {
      this.placeButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.placePressed = true;
        this.placePressedThisFrame = true;
        this.placeButton.style.opacity = '0.6';
      });
      this.placeButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.placePressed = false;
        this.placeButton.style.opacity = '1';
      });
    }
    
    if (this.breakButton) {
      this.breakButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.breakPressed = true;
        this.breakPressedThisFrame = true;
        this.breakButton.style.opacity = '0.6';
      });
      this.breakButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.breakPressed = false;
        this.breakButton.style.opacity = '1';
      });
    }
    
    if (this.cycleButton) {
      this.cycleButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.cyclePressed = true;
        this.cyclePressedThisFrame = true;
        this.cycleButton.style.opacity = '0.6';
      });
      this.cycleButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.cyclePressed = false;
        this.cycleButton.style.opacity = '1';
      });
    }
  }
  
  isPointInElement(x, y, element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }
  
  onTouchStart(event) {
    for (const touch of event.changedTouches) {
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      
      // Check if touch is on a button (handled separately)
      if (this.isPointInElement(touchX, touchY, this.jumpButton) ||
          this.isPointInElement(touchX, touchY, this.placeButton) ||
          this.isPointInElement(touchX, touchY, this.breakButton) ||
          this.isPointInElement(touchX, touchY, this.cycleButton)) {
        // Button will handle its own events
        continue;
      }
      
      // Check if touch is on joystick container (nipplejs will handle it)
      if (this.joystickContainer && this.isPointInElement(touchX, touchY, this.joystickContainer)) {
        // nipplejs handles joystick touches, so we don't need to do anything here
        continue;
      }
      
      // Touch is for camera rotation
      if (!this.cameraRotationActive) {
        this.cameraRotationActive = true;
        this.cameraTouchId = touch.identifier;
        this.lastTouchPosition = { x: touchX, y: touchY };
        this.touchRotation = { deltaX: 0, deltaY: 0 };
        event.preventDefault();
      }
      
      this.activeTouches.set(touch.identifier, {
        x: touchX,
        y: touchY,
        type: this.cameraTouchId === touch.identifier ? 'camera' : 'unknown'
      });
    }
  }
  
  onTouchMove(event) {
    for (const touch of event.changedTouches) {
      const touchX = touch.clientX;
      const touchY = touch.clientY;
      
      // Update camera rotation
      if (this.cameraRotationActive && touch.identifier === this.cameraTouchId) {
        const deltaX = touchX - this.lastTouchPosition.x;
        const deltaY = touchY - this.lastTouchPosition.y;
        this.touchRotation.deltaX = deltaX;
        this.touchRotation.deltaY = deltaY;
        this.lastTouchPosition = { x: touchX, y: touchY };
        event.preventDefault();
      }
      
      // Update active touch
      if (this.activeTouches.has(touch.identifier)) {
        const touchData = this.activeTouches.get(touch.identifier);
        touchData.x = touchX;
        touchData.y = touchY;
      }
    }
  }
  
  onTouchEnd(event) {
    for (const touch of event.changedTouches) {
      // Reset camera rotation
      if (touch.identifier === this.cameraTouchId) {
        this.cameraRotationActive = false;
        this.cameraTouchId = null;
        this.touchRotation = { deltaX: 0, deltaY: 0 };
      }
      
      // Remove from active touches
      this.activeTouches.delete(touch.identifier);
    }
  }
  
  // Get movement direction from joystick (normalized)
  getTouchMovement() {
    if (!this.joystickActive) {
      return { x: 0, z: 0 };
    }
    
    // nipplejs already provides normalized vector
    // Note: y becomes z (forward/backward), x stays x (left/right)
    return {
      x: this.joystickPosition.x,
      z: this.joystickPosition.y
    };
  }
  
  // Get camera rotation delta
  getTouchRotation() {
    const rotation = { ...this.touchRotation };
    // Reset after reading
    this.touchRotation = { deltaX: 0, deltaY: 0 };
    return rotation;
  }
  
  // Check if jump is pressed
  isTouchJumpPressed() {
    return this.jumpPressed;
  }
  
  // Check if place is pressed
  isTouchPlacePressed() {
    return this.placePressed;
  }
  
  // Check if break is pressed
  isTouchBreakPressed() {
    return this.breakPressed;
  }
  
  // Check if cycle is pressed
  isTouchCyclePressed() {
    return this.cyclePressed;
  }
  
  // Check if button was pressed this frame (for one-time actions)
  wasPlacePressedThisFrame() {
    const pressed = this.placePressedThisFrame;
    this.placePressedThisFrame = false;
    return pressed;
  }
  
  wasBreakPressedThisFrame() {
    const pressed = this.breakPressedThisFrame;
    this.breakPressedThisFrame = false;
    return pressed;
  }
  
  wasCyclePressedThisFrame() {
    const pressed = this.cyclePressedThisFrame;
    this.cyclePressedThisFrame = false;
    return pressed;
  }
  
  // Check if touch controls are enabled
  isEnabled() {
    return this.shouldShowControls;
  }
}

