import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Stars } from '@react-three/drei';
import * as THREE from 'three';

const WORLD_RADIUS = 15;
const ENTER_DISTANCE = 3.2;

const STATIONS = [
  { id: 'exams', view: 'exams', label: 'Exam Academy', hint: 'Practice real exam questions', position: [-10, 0, -6], color: '#4f8cff' },
  { id: 'sleep', view: 'sleepSounds', label: 'Sleep Cabin', hint: 'Wind down with sleep sounds', position: [10, 0, -7], color: '#8b6cf0' },
  { id: 'movies', view: 'movieRecap', label: 'Recap Cinema', hint: '3-minute AI movie recaps', position: [-11, 0, 6], color: '#ff7b7b' },
  { id: 'karaoke', view: 'blindKaraoke', label: 'Karaoke Stage', hint: 'Guess the song from a clip', position: [11, 0, 7], color: '#45d3bf' },
  { id: 'kids', view: 'kids', label: 'Kids Playground', hint: 'Games and stories for kids', position: [0, 0, -12], color: '#ffcc66' },
];

// Remembers the last station the player entered, so exiting a feature
// puts the character back in front of that building.
let lastStationId = null;

function spawnPoint() {
  const station = STATIONS.find((s) => s.id === lastStationId);
  if (!station) return [0, 0.05, 6];
  const [x, , z] = station.position;
  const dist = Math.hypot(x, z) || 1;
  const scale = Math.max(0, (dist - 2.4) / dist);
  return [x * scale, 0.05, z * scale];
}

const TREES = [
  [-5, -10], [5, -10], [-14, 0], [14, 0], [-6, 11], [6, 11], [3.5, 3], [-3, -4], [4, -2],
];
const ROCKS = [[-8, 2], [8, -2], [2, 9], [-2, -8], [12, 2]];

const PLAYER_RADIUS = 0.45;
// h = obstacle height: jumping higher than it lets the player pass over (rocks yes, trees/buildings no)
const COLLIDERS = [
  ...TREES.map(([x, z]) => ({ x, z, r: 0.95, h: 99 })),
  ...ROCKS.map(([x, z]) => ({ x, z, r: 0.65, h: 0.8 })),
  ...STATIONS.map((s) => ({ x: s.position[0], z: s.position[2], r: 1.7, h: 99 })),
];

function Tree({ position }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.18, 0.25, 1.4, 6]} />
        <meshStandardMaterial color="#6b4a2f" />
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <coneGeometry args={[1, 2.2, 7]} />
        <meshStandardMaterial color="#2f7d5d" />
      </mesh>
    </group>
  );
}

function Rock({ position }) {
  return (
    <mesh position={[position[0], 0.25, position[1]]} rotation={[0.4, position[0], 0]}>
      <dodecahedronGeometry args={[0.45]} />
      <meshStandardMaterial color="#5a6b80" />
    </mesh>
  );
}

function StationDecor({ station }) {
  switch (station.id) {
    case 'exams':
      return (
        <>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[2.4, 2.2, 2.4]} />
            <meshStandardMaterial color={station.color} />
          </mesh>
          <mesh position={[0, 2.5, 0]}>
            <boxGeometry args={[1.7, 0.35, 2.3]} />
            <meshStandardMaterial color="#f6f8fc" />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <boxGeometry args={[1.3, 0.35, 1.9]} />
            <meshStandardMaterial color="#ffcc66" />
          </mesh>
        </>
      );
    case 'sleep':
      return (
        <>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[2.4, 1.8, 2.2]} />
            <meshStandardMaterial color={station.color} />
          </mesh>
          <mesh position={[0, 2.4, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[2, 1.4, 4]} />
            <meshStandardMaterial color="#3b2d6e" />
          </mesh>
          <mesh position={[1.6, 3.6, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color="#fff3c4" emissive="#ffe9a3" emissiveIntensity={0.9} />
          </mesh>
        </>
      );
    case 'movies':
      return (
        <>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[3, 2.4, 1.6]} />
            <meshStandardMaterial color="#2b3550" />
          </mesh>
          <mesh position={[0, 1.4, 0.85]}>
            <planeGeometry args={[2.2, 1.3]} />
            <meshStandardMaterial color="#f6f8fc" emissive="#cfe2ff" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 2.7, 0]}>
            <boxGeometry args={[3.2, 0.3, 1.8]} />
            <meshStandardMaterial color={station.color} />
          </mesh>
        </>
      );
    case 'karaoke':
      return (
        <>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[2.2, 2.4, 0.7, 24]} />
            <meshStandardMaterial color="#27374f" />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 1.3, 8]} />
            <meshStandardMaterial color="#aab8cc" />
          </mesh>
          <mesh position={[0, 2.1, 0]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color={station.color} emissive={station.color} emissiveIntensity={0.7} />
          </mesh>
        </>
      );
    case 'kids':
    default:
      return (
        <>
          <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.9, 0.22, 12, 24]} />
            <meshStandardMaterial color={station.color} />
          </mesh>
          <mesh position={[-1.2, 0.4, 0.6]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#ff7b7b" />
          </mesh>
          <mesh position={[1.2, 0.4, -0.4]}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#45d3bf" />
          </mesh>
        </>
      );
  }
}

function Station({ station, active, onTravel }) {
  return (
    <group position={station.position}>
      <group
        onPointerDown={(e) => { e.stopPropagation(); onTravel(station); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <StationDecor station={station} />
      </group>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.9, 40]} />
        <meshBasicMaterial color={station.color} transparent opacity={active ? 0.85 : 0.18} />
      </mesh>
      <Text
        position={[0, 4.3, 0]}
        fontSize={0.62}
        color={active ? '#ffffff' : '#dce8f7'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#0a1626"
      >
        {station.label}
      </Text>
    </group>
  );
}

function Joystick({ moveRef }) {
  const baseRef = useRef(null);
  const activeRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const RADIUS = 38;

  const update = (e) => {
    const rect = baseRef.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    moveRef.current = { x: dx / RADIUS, z: dy / RADIUS };
  };

  const release = () => {
    activeRef.current = false;
    setKnob({ x: 0, y: 0 });
    moveRef.current = { x: 0, z: 0 };
  };

  return (
    <div
      ref={baseRef}
      className="world-overlay world-joystick"
      onPointerDown={(e) => {
        activeRef.current = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
        update(e);
      }}
      onPointerMove={(e) => { if (activeRef.current) update(e); }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="world-joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}

function Player({ targetRef, onNearChange, spawn, jumpRef, moveRef }) {
  const groupRef = useRef();
  const keysRef = useRef({});
  const nearRef = useRef(null);
  const velocityYRef = useRef(0);
  const airborneRef = useRef(false);
  const stuckFramesRef = useRef(0);

  useEffect(() => {
    const down = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        jumpRef.current = true;
        return;
      }
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e) => { keysRef.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [jumpRef]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const keys = keysRef.current;
    const speed = 7;
    let dx = 0;
    let dz = 0;

    if (keys.w || keys.arrowup) dz -= 1;
    if (keys.s || keys.arrowdown) dz += 1;
    if (keys.a || keys.arrowleft) dx -= 1;
    if (keys.d || keys.arrowright) dx += 1;

    // virtual joystick (mobile)
    const joy = moveRef.current;
    if (dx === 0 && dz === 0 && joy && Math.hypot(joy.x, joy.z) > 0.18) {
      dx = joy.x;
      dz = joy.z;
    }

    if (dx !== 0 || dz !== 0) {
      targetRef.current = null;
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
    } else if (targetRef.current) {
      const tx = targetRef.current[0] - group.position.x;
      const tz = targetRef.current[2] - group.position.z;
      const dist = Math.hypot(tx, tz);
      if (dist < 2.2) {
        targetRef.current = null;
      } else {
        dx = tx / dist;
        dz = tz / dist;
      }
    }

    if (dx !== 0 || dz !== 0) {
      const prevX = group.position.x;
      const prevZ = group.position.z;
      group.position.x += dx * speed * delta;
      group.position.z += dz * speed * delta;

      // solid obstacles: push the player out so they slide along edges
      for (const collider of COLLIDERS) {
        if (group.position.y > collider.h) continue; // jumped over it
        const offX = group.position.x - collider.x;
        const offZ = group.position.z - collider.z;
        const dist = Math.hypot(offX, offZ);
        const minDist = collider.r + PLAYER_RADIUS;
        if (dist < minDist && dist > 0.0001) {
          group.position.x = collider.x + (offX / dist) * minDist;
          group.position.z = collider.z + (offZ / dist) * minDist;
        }
      }

      const radius = Math.hypot(group.position.x, group.position.z);
      if (radius > WORLD_RADIUS - 1) {
        group.position.x *= (WORLD_RADIUS - 1) / radius;
        group.position.z *= (WORLD_RADIUS - 1) / radius;
      }
      group.rotation.y = Math.atan2(dx, dz);

      // auto-walk target blocked by an obstacle: give up instead of pushing forever
      if (targetRef.current) {
        const moved = Math.hypot(group.position.x - prevX, group.position.z - prevZ);
        stuckFramesRef.current = moved < 0.002 ? stuckFramesRef.current + 1 : 0;
        if (stuckFramesRef.current > 25) {
          targetRef.current = null;
          stuckFramesRef.current = 0;
        }
      }
    }

    // jumping
    if (jumpRef.current) {
      jumpRef.current = false;
      if (!airborneRef.current) {
        airborneRef.current = true;
        velocityYRef.current = 8.5;
      }
    }
    if (airborneRef.current) {
      group.position.y += velocityYRef.current * delta;
      velocityYRef.current -= 22 * delta;
      if (group.position.y <= 0.05) {
        group.position.y = 0.05;
        airborneRef.current = false;
        velocityYRef.current = 0;
      }
    } else {
      // little idle bob while on the ground
      group.position.y = Math.sin(state.clock.elapsedTime * 4) * 0.06 + 0.05;
    }

    // camera follows
    const cam = state.camera;
    cam.position.lerp(new THREE.Vector3(group.position.x, group.position.y + 8, group.position.z + 11), 0.06);
    cam.lookAt(group.position.x, group.position.y + 1, group.position.z);

    // proximity check (only notify on change)
    let near = null;
    for (const station of STATIONS) {
      const dist = Math.hypot(station.position[0] - group.position.x, station.position[2] - group.position.z);
      if (dist < ENTER_DISTANCE) { near = station.id; break; }
    }
    if (near !== nearRef.current) {
      nearRef.current = near;
      onNearChange(near);
    }

    if (typeof window !== 'undefined') {
      window.__playerPos = [group.position.x, group.position.z];
      window.__playerY = group.position.y;
    }
  });

  return (
    <group ref={groupRef} position={spawn}>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.45, 20, 20]} />
        <meshStandardMaterial color="#4f8cff" />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.32, 20, 20]} />
        <meshStandardMaterial color="#ffd9b3" />
      </mesh>
      <mesh position={[0.12, 1.32, 0.26]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#0a1626" />
      </mesh>
      <mesh position={[-0.12, 1.32, 0.26]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#0a1626" />
      </mesh>
    </group>
  );
}

function WorldScene({ targetRef, onNearChange, onTravel, activeId, spawn, jumpRef, moveRef }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 14, 6]} intensity={0.9} />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#9db8ff" />
      <Stars radius={60} depth={30} count={1500} factor={3} fade />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={(e) => { e.stopPropagation(); onTravel(null, [e.point.x, 0, e.point.z]); }}
      >
        <circleGeometry args={[WORLD_RADIUS, 48]} />
        <meshStandardMaterial color="#1d4d3e" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
        <circleGeometry args={[WORLD_RADIUS + 3, 48]} />
        <meshStandardMaterial color="#0e2a44" />
      </mesh>

      {TREES.map((pos) => <Tree key={`t${pos[0]}-${pos[1]}`} position={pos} />)}
      {ROCKS.map((pos) => <Rock key={`r${pos[0]}-${pos[1]}`} position={pos} />)}
      {STATIONS.map((station) => (
        <Station key={station.id} station={station} active={activeId === station.id} onTravel={(s) => onTravel(s)} />
      ))}

      <Player targetRef={targetRef} onNearChange={onNearChange} spawn={spawn} jumpRef={jumpRef} moveRef={moveRef} />
    </>
  );
}

function WorldMap({ onNavigate }) {
  const [nearId, setNearId] = useState(null);
  const targetRef = useRef(null);
  const jumpRef = useRef(false);
  const moveRef = useRef({ x: 0, z: 0 });
  const [spawn] = useState(spawnPoint);

  const nearStation = STATIONS.find((s) => s.id === nearId) || null;

  const enterStation = (station) => {
    lastStationId = station.id;
    onNavigate(station.view);
  };

  useEffect(() => {
    if (!nearStation) return undefined;
    const onKey = (e) => {
      if (e.key === 'Enter') enterStation(nearStation);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearStation, onNavigate]);

  const travel = (station, point) => {
    if (station) {
      targetRef.current = station.position;
    } else if (point) {
      targetRef.current = point;
    }
  };

  return (
    <div className="world-shell">
      <Canvas camera={{ position: [0, 9, 16], fov: 55 }} dpr={[1, 1.8]}>
        <color attach="background" args={['#07111f']} />
        <WorldScene targetRef={targetRef} onNearChange={setNearId} onTravel={travel} activeId={nearId} spawn={spawn} jumpRef={jumpRef} moveRef={moveRef} />
      </Canvas>

      <div className="world-overlay world-header">
        <div>
          <p className="eyebrow" style={{ marginBottom: 2 }}>Agent League World</p>
          <p className="small" style={{ margin: 0 }}>Walk with WASD / arrows or tap where you want to go. Space to jump.</p>
        </div>
      </div>

      <Joystick moveRef={moveRef} />

      <button
        className="world-overlay world-jump-btn"
        onPointerDown={() => { jumpRef.current = true; }}
        aria-label="Jump"
      >
        ⤴<span>Jump</span>
      </button>

      {nearStation && (
        <div className="world-overlay world-prompt">
          <div>
            <strong>{nearStation.label}</strong>
            <p className="small" style={{ margin: '2px 0 0' }}>{nearStation.hint}</p>
          </div>
          <button className="primary-btn" onClick={() => enterStation(nearStation)}>
            Enter ⏎
          </button>
        </div>
      )}
    </div>
  );
}

export default WorldMap;
