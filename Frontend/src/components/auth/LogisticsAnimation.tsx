import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';

// Moving AI particles orbiting
function AIParticles() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  const particles = Array.from({ length: 150 }, () => ({
    position: new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3
    ),
  }));

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color="#00eaff" />
        </mesh>
      ))}
    </group>
  );
}

// Moving cargo dot on route
function MovingDot({ points }: { points: THREE.Vector3[] }) {
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (dotRef.current) {
      const t = (Math.sin(clock.getElapsedTime() * 0.5) + 1) / 2;
      const position = new THREE.Vector3().lerpVectors(points[0], points[1], t);
      dotRef.current.position.copy(position);
    }
  });

  return (
    <mesh ref={dotRef}>
      <sphereGeometry args={[0.03, 16, 16]} />
      <meshStandardMaterial emissive="yellow" emissiveIntensity={1} />
    </mesh>
  );
}

// Route arc between two points
function RouteArc({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(1.3);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const points = curve.getPoints(100);

  return (
    <>
      <Line points={points} color="#ffffff" lineWidth={1} />
      <MovingDot points={[start, end]} />
    </>
  );
}

// Rotating Globe
function Globe() {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.002;
    }
  });

  const texture = new THREE.TextureLoader().load(
    'https://raw.githubusercontent.com/creativetimofficial/public-assets/master/soft-ui-dashboard-pro/assets/img/earthmap1k.jpg'
  );

  return (
    <Sphere args={[1, 64, 64]} ref={earthRef}>
      <meshStandardMaterial map={texture} />
    </Sphere>
  );
}

export default function LogisticsAnimation() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {/* 3D Objects */}
        <Globe />
        <Stars radius={50} depth={40} count={3000} factor={4} fade speed={1} />
        <AIParticles />

        {/* Logistics Routes */}
        <RouteArc
          start={new THREE.Vector3(0.7, 0.4, 0.8)}
          end={new THREE.Vector3(-0.5, -0.3, -0.9)}
        />
        <RouteArc
          start={new THREE.Vector3(-0.8, 0.2, 0.5)}
          end={new THREE.Vector3(0.9, -0.1, -0.6)}
        />
        <RouteArc
          start={new THREE.Vector3(0.3, -0.5, 0.7)}
          end={new THREE.Vector3(-0.6, 0.4, -0.5)}
        />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
}
