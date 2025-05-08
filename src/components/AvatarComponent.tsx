import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// This is a placeholder component for the 3D avatar
// In a real implementation, you would use a proper 3D model and animations
const SimpleAvatar: React.FC = () => {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#F5D0C5" />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.5, 10, 10]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      
      {/* Right Arm */}
      <mesh position={[0.6, 0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <capsuleGeometry args={[0.15, 1, 10, 10]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      
      {/* Left Arm */}
      <mesh position={[-0.6, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <capsuleGeometry args={[0.15, 1, 10, 10]} />
        <meshStandardMaterial color="#3B82F6" />
      </mesh>
      
      {/* Right Leg */}
      <mesh position={[0.25, -1.2, 0]}>
        <capsuleGeometry args={[0.2, 1, 10, 10]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
      
      {/* Left Leg */}
      <mesh position={[-0.25, -1.2, 0]}>
        <capsuleGeometry args={[0.2, 1, 10, 10]} />
        <meshStandardMaterial color="#1F2937" />
      </mesh>
    </group>
  );
};

interface AvatarComponentProps {
  signWord?: string;
  isAnimating?: boolean;
}

const AvatarComponent: React.FC<AvatarComponentProps> = ({
  signWord,
  isAnimating = false,
}) => {
  return (
    <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-inner">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'rgb(241, 245, 249)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <SimpleAvatar />
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
      
      {signWord && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md">
            <span className="font-medium text-primary-800">{signWord}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarComponent;