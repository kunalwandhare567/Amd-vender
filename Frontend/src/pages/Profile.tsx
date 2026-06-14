import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Truck, Building, Shield, Settings, Save, Sparkles } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase() || 'admin';
  const adminEquivalentRoles = ['admin', 'procurement', 'supply_chain', 'operations', 'analyst', 'executive', 'other', 'user'];
  const isAdminEquivalent = adminEquivalentRoles.includes(userRole);

  // Driver fields
  const [driverName, setDriverName] = useState(user?.full_name || 'Ramesh Kumar');
  const [driverPhone, setDriverPhone] = useState('+91 98765 43210');
  const [truckPlate, setTruckPlate] = useState('MH-12-PQ-4567');
  const [driverLicense, setDriverLicense] = useState('DL-PUNE-890123');
  const [routePreference, setRoutePreference] = useState('Pune-Mumbai Expressway');

  // Supplier fields
  const [supplierName, setSupplierName] = useState(user?.full_name || 'ElectroDrive Support');
  const [supplierEmail, setSupplierEmail] = useState(user?.email || 'supplier@supplier.com');
  const [supplierPhone, setSupplierPhone] = useState('+91 22 5555 8899');
  const [supplierAddress, setSupplierAddress] = useState('Block C, Industrial Zone, Pune, MH, India');
  const [capacity, setCapacity] = useState('50,000 units/month');

  // Admin fields
  const [adminName, setAdminName] = useState(user?.full_name || 'System Admin');
  const [adminEmail, setAdminEmail] = useState(user?.email || 'admin@supplier.com');
  const [securityLevel, setSecurityLevel] = useState('Level-5 SuperAdmin');
  const [slackAlerts, setSlackAlerts] = useState(true);

  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile settings updated successfully!', {
        description: 'Your changes have been saved to the secure server database.',
      });
    }, 1000);
  };

  return (
    <MainLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <header className="animate-fade-in transform transition-all duration-500 hover:scale-[1.01] flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Settings className="w-8 h-8 text-primary animate-spin-slow" />
              Account Settings
            </h1>
            <p className="text-muted-foreground">
              Manage and update your role-specific credentials and configuration.
            </p>
          </div>
        </header>

        {/* Dynamic Profile Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border border-primary/20 bg-card/50 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center gap-4 border-b border-border/50 pb-6">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-primary/20">
                {userRole === 'driver' ? (
                  <Truck className="h-8 w-8 text-white" />
                ) : userRole === 'supplier' ? (
                  <Building className="h-8 w-8 text-white" />
                ) : (
                  <Shield className="h-8 w-8 text-white" />
                )}
              </div>
              <div>
                <CardTitle className="text-xl capitalize">{userRole} Account Profile</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                  Authenticated session role for {user?.email}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* Driver profile form fields */}
                {userRole === 'driver' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="driverName">Driver Full Name</Label>
                      <Input
                        id="driverName"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverPhone">Contact Phone Number</Label>
                      <Input
                        id="driverPhone"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="truckPlate">Vehicle License Plate Number</Label>
                      <Input
                        id="truckPlate"
                        value={truckPlate}
                        onChange={(e) => setTruckPlate(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverLicense">Commercial Driver's License (CDL)</Label>
                      <Input
                        id="driverLicense"
                        value={driverLicense}
                        onChange={(e) => setDriverLicense(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="routePref">Preferred Transit Routes</Label>
                      <Input
                        id="routePref"
                        value={routePreference}
                        onChange={(e) => setRoutePreference(e.target.value)}
                        className="bg-background/50"
                        placeholder="e.g. Pune-Mumbai Expressway"
                      />
                    </div>
                  </div>
                )}

                {/* Supplier profile form fields */}
                {userRole === 'supplier' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="supplierName">Supplier Representative Name</Label>
                      <Input
                        id="supplierName"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierEmail">Organization Contact Email</Label>
                      <Input
                        id="supplierEmail"
                        type="email"
                        value={supplierEmail}
                        onChange={(e) => setSupplierEmail(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierPhone">Support Line Phone Number</Label>
                      <Input
                        id="supplierPhone"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Standard Delivery Production Capacity</Label>
                      <Input
                        id="capacity"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="supplierAddress">Warehouse Dispatch Physical Address</Label>
                      <Input
                        id="supplierAddress"
                        value={supplierAddress}
                        onChange={(e) => setSupplierAddress(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Admin profile form fields */}
                {isAdminEquivalent && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminName">Administrator Full Name</Label>
                      <Input
                        id="adminName"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Security Console Email Address</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="securityLevel">Access Authority Level</Label>
                      <Input
                        id="securityLevel"
                        value={securityLevel}
                        disabled
                        className="bg-background/30 cursor-not-allowed text-muted-foreground"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-8">
                      <input
                        type="checkbox"
                        id="slack"
                        checked={slackAlerts}
                        onChange={(e) => setSlackAlerts(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="slack" className="text-sm font-medium leading-none cursor-pointer">
                        Receive real-time Slack/Email alerts for critical incidents
                      </Label>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border/50">
                  <Button type="submit" disabled={saving} className="flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Profile Settings'}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
