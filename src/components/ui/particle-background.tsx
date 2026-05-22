'use client';

import React, { useEffect, useRef } from 'react';

const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8A2BE2', '#FF69B4', '#00FFFF'];

class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  color: string;
  angle: number;
  radius: number;
  speed: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.size = Math.random() * 2.5 + 0.5;
    
    // Distribute in a wide dome/spiral shape
    this.angle = Math.random() * Math.PI * 2;
    this.radius = Math.random() * (Math.max(canvasWidth, canvasHeight) * 0.6);
    this.speed = (Math.random() * 0.002) + 0.0005;
    
    // Direction of rotation
    if (Math.random() > 0.5) this.speed *= -1;

    this.baseX = canvasWidth / 2;
    this.baseY = canvasHeight / 2 + 100; // Offset center slightly down
    
    this.x = this.baseX + Math.cos(this.angle) * this.radius;
    this.y = this.baseY + Math.sin(this.angle) * this.radius;
  }

  update(canvasWidth: number, canvasHeight: number) {
    this.angle += this.speed;
    
    // Slight drift outwards/inwards
    this.radius += Math.sin(this.angle * 2) * 0.5;
    
    this.x = this.baseX + Math.cos(this.angle) * this.radius;
    this.y = this.baseY + Math.sin(this.angle) * this.radius;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const numParticles = Math.min(800, Math.floor((canvas.width * canvas.height) / 1500)); 
      for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-80 mix-blend-multiply"
    />
  );
}
