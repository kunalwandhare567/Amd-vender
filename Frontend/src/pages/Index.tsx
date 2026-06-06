import { useState, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { TopRiskSuppliers } from '@/components/dashboard/TopRiskSuppliers';
import { RecentAlerts } from '@/components/dashboard/RecentAlerts';
import { RiskDonutChart } from '@/components/dashboard/RiskDonutChart';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SearchInput } from '@/components/common/SearchInput';
import { Pagination } from '@/components/common/Pagination';
import { ReportModal } from '@/components/modals/ReportModal';
import { ChatBot } from '@/components/chat/ChatBot';
import { supplierService } from '@/services/supplierService';
// import { suppliers, alerts } from '@/data/mockData'; // Removed mock data import
import { Supplier, Alert } from '@/data/mockData'; // Keeping interface

const ITEMS_PER_PAGE = 5;

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reportSupplierId, setReportSupplierId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // State for suppliers
  const [alerts, setAlerts] = useState<Alert[]>([]); // State for alerts
  const [isLoading, setIsLoading] = useState(true);

  // Fetch suppliers and alerts from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, alertsData] = await Promise.all([
          supplierService.getSuppliers({ limit: 100 }),
          supplierService.getAlerts()
        ]);

        if (suppliersData.success) {
          setSuppliers(suppliersData.data.suppliers);
        }
        if (alertsData.success) {
          setAlerts(alertsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Three.js Setup
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2500;
    const posArray = new Float32Array(particlesCount * 3);
    const colorArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 150;
      posArray[i + 1] = (Math.random() - 0.5) * 150;
      posArray[i + 2] = (Math.random() - 0.5) * 150;

      // Color variation (cyan to neon blue gradient)
      colorArray[i] = 0.1 + Math.random() * 0.3;
      colorArray[i + 1] = 0.7 + Math.random() * 0.3;
      colorArray[i + 2] = 0.9 + Math.random() * 0.1;
    }

    particlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posArray, 3)
    );
    particlesGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colorArray, 3)
    );

    const particlesMaterial = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Add animated rings
    const ringGeometry = new THREE.TorusGeometry(15, 0.5, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.6,
    });
    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    const ring2 = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    const ring3 = new THREE.Mesh(ringGeometry, ringMaterial.clone());
    ring1.rotation.x = Math.PI / 2;
    ring2.rotation.y = Math.PI / 2;
    ring3.rotation.z = Math.PI / 4;
    scene.add(ring1, ring2, ring3);

    // Add floating geometric shapes
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const sphereGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const octahedronGeometry = new THREE.OctahedronGeometry(1.8);

    const shapeMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    });

    const cube = new THREE.Mesh(cubeGeometry, shapeMaterial);
    const sphere = new THREE.Mesh(sphereGeometry, shapeMaterial.clone());
    const octahedron = new THREE.Mesh(octahedronGeometry, shapeMaterial.clone());

    cube.position.set(-25, 15, -20);
    sphere.position.set(30, -15, -25);
    octahedron.position.set(-20, -20, -15);

    scene.add(cube, sphere, octahedron);

    // Animation
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Rotate particles
      particlesMesh.rotation.y = elapsedTime * 0.05;
      particlesMesh.rotation.x = elapsedTime * 0.03;

      // Rotate rings
      ring1.rotation.z = elapsedTime * 0.2;
      ring2.rotation.z = -elapsedTime * 0.2;
      ring3.rotation.x = elapsedTime * 0.15;

      // Animate geometric shapes
      cube.rotation.x = elapsedTime * 0.3;
      cube.rotation.y = elapsedTime * 0.2;
      cube.position.y = 15 + Math.sin(elapsedTime * 0.5) * 3;

      sphere.rotation.y = elapsedTime * 0.25;
      sphere.position.y = -15 + Math.cos(elapsedTime * 0.6) * 4;

      octahedron.rotation.x = elapsedTime * 0.4;
      octahedron.rotation.z = elapsedTime * 0.3;
      octahedron.position.y = -20 + Math.sin(elapsedTime * 0.7) * 3;

      // Mouse interaction
      camera.position.x += (mousePosition.x * 8 - camera.position.x) * 0.05;
      camera.position.y += (mousePosition.y * 8 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      cubeGeometry.dispose();
      sphereGeometry.dispose();
      octahedronGeometry.dispose();
      shapeMaterial.dispose();
    };
  }, [mousePosition]);

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.supplier_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleGenerateReport = (supplierId: string) => {
    setReportSupplierId(supplierId);
  };

  const selectedSupplier = reportSupplierId
    ? suppliers.find(s => s.supplier_id === reportSupplierId) || null
    : null;

  return (
    <MainLayout>
      {/* Three.js Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
        style={{ opacity: 0.7 }}
      />

      <div className="p-6 lg:p-8 space-y-8 relative z-10">
        {/* Header */}
        <header className="animate-fade-in transform transition-all duration-500 hover:scale-[1.01]">
          {/* <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, <span className="text-gradient">Mihika</span>
          </h1> */}
          <p className="text-muted-foreground">
            Monitor supplier performance, identify risks, and make data-driven decisions.
          </p>
        </header>

        {/* Summary Cards */}
        <section
          aria-labelledby="summary-heading"
          className="animate-slide-up"
          style={{ animationDelay: '100ms' }}
        >
          <h2 id="summary-heading" className="sr-only">Performance Summary</h2>
          <SummaryCards suppliers={suppliers} alerts={alerts} />
        </section>

        {/* Dashboard Grid */}
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1">
            <RiskDonutChart suppliers={suppliers} />
          </div>
          <div className="transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1">
            <TopRiskSuppliers suppliers={suppliers} />
          </div>
        </div>

        {/* Alerts Grid */}
        <div
          className="animate-slide-up"
          style={{ animationDelay: '250ms' }}
        >
          <div className="transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1">
            <RecentAlerts alerts={alerts} />
          </div>
        </div>

        {/* Supplier List */}
        <section
          aria-labelledby="suppliers-heading"
          className="card-base overflow-hidden animate-slide-up transform transition-all duration-300 hover:shadow-2xl"
          style={{ animationDelay: '300ms' }}
        >
          <div className="p-6 border-b border-border backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 id="suppliers-heading" className="text-lg font-semibold text-foreground">All Suppliers</h2>
                <p className="text-sm text-muted-foreground">{filteredSuppliers.length} suppliers found</p>
              </div>
              <div className="w-full sm:w-72 transform transition-all duration-300 hover:scale-105">
                <SearchInput
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search suppliers..."
                />
              </div>
            </div>
          </div>

          <SupplierTable
            suppliers={paginatedSuppliers}
            onGenerateReport={handleGenerateReport}
          />

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredSuppliers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          )}
        </section>
      </div>

      {/* Report Modal */}
      <ReportModal
        supplier={selectedSupplier}
        isOpen={!!reportSupplierId}
        onClose={() => setReportSupplierId(null)}
      />

      {/* ChatBot */}
      <ChatBot />
    </MainLayout>
  );
};

export default Index;
