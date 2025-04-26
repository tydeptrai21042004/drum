import React, { Suspense, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// === Motor Constants ===
const MOTOR_RADIUS = 0.8;
const MOTOR_LENGTH = 2.5;
const MOTOR_FIN_COUNT = 12;
const MOTOR_FIN_WIDTH = 0.05;
const MOTOR_FIN_HEIGHT = 0.15;
const MOTOR_FIN_LENGTH_FACTOR = 0.9;
const MOTOR_SHAFT_RADIUS = 0.15;
const MOTOR_SHAFT_LENGTH = 1.0;

// === Highlight Material ===
const highlightMaterial = new THREE.MeshPhysicalMaterial({
  color: '#FFA500',
  metalness: 1,
  roughness: 0.2,
  emissive: '#333333',
  clearcoat: 1,
  clearcoatRoughness: 0,
});

// A simple factory for a gray metallic material
function makeMetalMat(color = '#888888', clearcoat = 0.3) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 1,
    roughness: 0.4,
    clearcoat,
    clearcoatRoughness: 0.1,
  });
}

// ========================= MOTOR COMPONENT =========================
function Motor({ position, shaftRotationRef, castShadow = false, onClick }) {
  const shaftRef = useRef();
  const [isHighlighted, setHighlighted] = useState(false);

  // create once
  const casingMaterial = useMemo(() => makeMetalMat('#777777', 0.3), []);
  const finMaterial     = casingMaterial;
  const endCapMaterial  = casingMaterial;
  const shaftMaterial   = casingMaterial;
  const baseMaterial    = casingMaterial;
  const connectionBoxMaterial = casingMaterial;

  useFrame(() => {
    if (shaftRef.current && shaftRotationRef.current != null) {
      shaftRef.current.rotation.z = shaftRotationRef.current;
    }
  });

  const handleClick = e => {
    e.stopPropagation();
    setHighlighted(h => !h);
    onClick?.('Motor Assembly');
  };

  const finLen = MOTOR_LENGTH * MOTOR_FIN_LENGTH_FACTOR;

  return (
    <group position={position}>
      {/* Casing */}
      <mesh
        castShadow={castShadow}
        receiveShadow
        onClick={handleClick}
        material={isHighlighted ? highlightMaterial : casingMaterial}
      >
        <cylinderGeometry args={[MOTOR_RADIUS, MOTOR_RADIUS, MOTOR_LENGTH, 64]} />
      </mesh>

      {/* Cooling Fins */}
      {Array.from({ length: MOTOR_FIN_COUNT }).map((_, i) => {
        const angle = (i / MOTOR_FIN_COUNT) * Math.PI * 2;
        const radius = MOTOR_RADIUS + MOTOR_FIN_HEIGHT / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        return (
          <RoundedBox
            key={i}
            args={[finLen, MOTOR_FIN_HEIGHT, MOTOR_FIN_WIDTH]}
            radius={0.005}
            smoothness={4}
            position={[x, y, 0]}
            rotation={[Math.PI/2, angle + Math.PI/2, 0]}
            castShadow
            receiveShadow
            material={isHighlighted ? highlightMaterial : finMaterial}
            onClick={handleClick}
          />
        );
      })}

      {/* End Caps */}
      {[-1, 1].map(dir => (
        <mesh
          key={dir}
          position={[0, 0, dir * (MOTOR_LENGTH/2 + 0.05)]}
          rotation={[Math.PI/2, 0, 0]}
          castShadow
          receiveShadow
          material={isHighlighted ? highlightMaterial : endCapMaterial}
          onClick={handleClick}
        >
          <cylinderGeometry args={[MOTOR_RADIUS*0.95, MOTOR_RADIUS*0.95, 0.1, 64]} />
        </mesh>
      ))}

      {/* Shaft */}
      <mesh
        ref={shaftRef}
        position={[0, 0, MOTOR_LENGTH/2 + 0.1 + MOTOR_SHAFT_LENGTH/2]}
        rotation={[Math.PI/2, 0, 0]}
        castShadow
        receiveShadow
        material={isHighlighted ? highlightMaterial : shaftMaterial}
        onClick={handleClick}
      >
        <cylinderGeometry args={[MOTOR_SHAFT_RADIUS, MOTOR_SHAFT_RADIUS, MOTOR_SHAFT_LENGTH, 32]} />
      </mesh>

      {/* Base */}
      <RoundedBox
        args={[MOTOR_RADIUS*1.5, 0.5, MOTOR_LENGTH*0.6]}
        radius={0.01}
        smoothness={4}
        position={[0, -MOTOR_RADIUS-0.25, 0]}
        castShadow
        receiveShadow
        material={baseMaterial}
        onClick={handleClick}
      />

      {/* Connection Box */}
      <RoundedBox
        args={[0.4, 0.4, 0.4]}
        radius={0.008}
        smoothness={4}
        position={[0, MOTOR_RADIUS+0.2, -MOTOR_LENGTH*0.3]}
        castShadow
        receiveShadow
        material={connectionBoxMaterial}
        onClick={handleClick}
      />
    </group>
  );
}

// ========================= GEAR COMPONENT =========================
function Gear({ name, position, args, rotationRef, castShadow = false, onClick }) {
  const group = useRef();
  const [highlighted, setHighlighted] = useState(false);

  const gearMaterial = useMemo(() => 
    new THREE.MeshPhysicalMaterial({
      color: args.color,
      metalness: 1,
      roughness: 0.3,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1,
    }),
  [args.color]);

  // Build gear shape
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const teeth = Math.max(8, Math.round(args.radius * 20));
    const toothHeight = args.radius * 0.15;
    const step = (Math.PI*2)/teeth;
    for (let i = 0; i < teeth; i++) {
      const ang = i * step;
      const r0 = args.radius - toothHeight;
      s.lineTo(r0 * Math.cos(ang), r0 * Math.sin(ang));
      s.lineTo(
        args.radius * Math.cos(ang + step * 0.25),
        args.radius * Math.sin(ang + step * 0.25)
      );
      s.lineTo(
        args.radius * Math.cos(ang + step * 0.75),
        args.radius * Math.sin(ang + step * 0.75)
      );
    }
    s.closePath();
    if (args.holeRadius > 0) {
      const hole = new THREE.Path();
      hole.absellipse(0, 0, args.holeRadius, args.holeRadius, 0, Math.PI*2, false, 0);
      s.holes.push(hole);
    }
    return s;
  }, [args]);

  const extrude = useMemo(() => ({
    steps: 1,
    depth: args.height,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3
  }), [args.height]);

  useFrame(() => {
    if (group.current) group.current.rotation.z = rotationRef.current;
  });

  const handle = e => {
    e.stopPropagation();
    setHighlighted(h => !h);
    onClick?.(`Gear (${name})`);
  };

  return (
    <group ref={group} position={position}>
      <mesh
        castShadow={castShadow}
        receiveShadow
        onClick={handle}
        material={highlighted ? highlightMaterial : gearMaterial}
        rotation={[Math.PI/2, 0, 0]}
      >
        <extrudeGeometry args={[shape, extrude]} />
      </mesh>
    </group>
  );
}

// ========================= DRIVEN PADDLE =========================
function DrivenPaddle({ position, rotationRef, castShadow = false }) {
  const ref = useRef();
  const mat = useMemo(() => 
    new THREE.MeshPhysicalMaterial({ color: '#4682B4', metalness: 1, roughness: 0.4 }),
  []);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = rotationRef.current;
  });
  return (
    <group ref={ref} position={position}>
      <mesh castShadow={castShadow} receiveShadow material={mat}>
        <cylinderGeometry args={[0.15, 0.15, 0.45, 32]} />
      </mesh>
      {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((a, i) => (
        <RoundedBox
          key={i}
          args={[1.2, 0.2, 0.03]}
          radius={0.005}
          smoothness={4}
          position={[Math.cos(a)*0.75, Math.sin(a)*0.75, 0]}
          rotation={[0, 0, a]}
          castShadow
          receiveShadow
          material={mat}
        />
      ))}
    </group>
  );
}

// ========================= SCENE CONTENT =========================
function SceneContent({ speed, isRunning }) {
  const motorPos   = [0, 0, 0];
  const motorTip   = motorPos[2] + MOTOR_LENGTH/2 + MOTOR_SHAFT_LENGTH;
  const pinionParams = { radius: 0.3, height: 0.2, color: '#FFD700', holeRadius: MOTOR_SHAFT_RADIUS*1.05 };
  const gear1Params  = { radius: 0.9, height: 0.25, color: '#B0C4DE', holeRadius: 0.18 };
  const gear2Params  = { radius: 0.6, height: 0.3,  color: '#98FB98', holeRadius: 0.15 };
  const pinionPos  = [0,0, motorTip - pinionParams.height*0.4];
  const gear1Pos   = [pinionPos[0] + pinionParams.radius + gear1Params.radius, pinionPos[1], pinionPos[2]];
  const gear2Pos   = [gear1Pos[0], gear1Pos[1] - (gear1Params.radius + gear2Params.radius), gear1Pos[2]];
  const paddlePos  = [gear2Pos[0], gear2Pos[1], gear2Pos[2] + gear2Params.height/2 + 0.05];

  const motorRef = useRef(0);
  const pinionRef= useRef(0);
  const g1Ref    = useRef(0);
  const g2Ref    = useRef(0);
  const padRef   = useRef(0);
  const curRef   = useRef(0);
  const accel = 1.5, decel = 1.8;

  useFrame((_, dt) => {
    const delta = Math.min(dt, 0.05);
    if (isRunning) {
      curRef.current = Math.min(curRef.current + accel * delta, speed);
    } else {
      curRef.current = Math.max(curRef.current - decel * delta, 0);
    }
    const inc = curRef.current * delta;
    motorRef.current += inc;
    pinionRef.current = motorRef.current;
    g1Ref.current -= inc * (pinionParams.radius / gear1Params.radius);
    g2Ref.current += g1Ref.current * (gear1Params.radius / gear2Params.radius);
    padRef.current = g2Ref.current;
  });

  const onCompClick = name => console.log(`${name} clicked!`);

  return (
    <>
      <Environment files="/hdr/studio_small_02_1k.hdr" background blur={0.5} />
      <ambientLight intensity={0.2} />
      <directionalLight castShadow position={[5,10,5]} intensity={1.0} />
      <ContactShadows position={[0,-2.5,0]} opacity={0.6} width={10} height={10} blur={2} far={4} />

      <group position={[0,0,-2]}>
        <Motor      position={motorPos} shaftRotationRef={motorRef}      castShadow onClick={onCompClick} />
        <Gear name="Pinion" position={pinionPos} args={pinionParams} rotationRef={pinionRef} castShadow onClick={onCompClick} />
        <Gear name="Gear 1" position={gear1Pos}  args={gear1Params}  rotationRef={g1Ref}    castShadow onClick={onCompClick} />
        <Gear name="Gear 2" position={gear2Pos}  args={gear2Params}  rotationRef={g2Ref}    castShadow onClick={onCompClick} />
        <DrivenPaddle position={paddlePos} rotationRef={padRef} castShadow />
      </group>

      <OrbitControls enableZoom enablePan maxPolarAngle={Math.PI*0.4} />
    </>
  );
}

// ========================= MAIN EXPORT =========================
export default function DriveSystem3D({ speed = 5, isRunning = true }) {
  return (
    <Canvas
      shadows
      camera={{ position: [4, 4, 8], fov: 50, near: 0.5, far: 100 }}
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, physicallyCorrectLights: true }}
    >
      <Suspense fallback={null}>
        <SceneContent speed={speed} isRunning={isRunning} />
      </Suspense>
    </Canvas>
  );
}
