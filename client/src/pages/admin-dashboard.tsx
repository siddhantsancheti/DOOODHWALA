import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Bell,
  Shield,
  Settings,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Star,
  Phone,
  Mail,
  Calendar,
  Receipt,
  PlayCircle
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalMilkmen: number;
  totalOrders: number;
  totalRevenue: number;
  dailyOrders: number;
  weeklyRevenue: number;
  pendingOrders: number;
  activeUsers: number;
}

interface User {
  id: string;
  phone: string;
  name?: string;
  milkmanId?: number | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  userType: 'customer' | 'milkman' | 'admin';
  isVerified: boolean;
  createdAt: string;
}

interface Milkman {
  id: number;
  userId: string;
  contactName: string;
  businessName: string;
  phone: string;
  address: string;
  pricePerLiter: string;
  isAvailable: boolean;
  verified: boolean;
  rating: string;
  totalReviews: number;
  commissionPercentage?: string | null;
}

interface Order {
  id: number;
  customerId: number;
  milkmanId: number;
  status: string;
  totalAmount: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: number;
  orderId: number;
  amount: string;
  status: string;
  method: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [milkmen, setMilkmen] = useState<Milkman[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  // Local draft input per milkman row for the commission % field, keyed by id
  const [commissionDrafts, setCommissionDrafts] = useState<Record<number, string>>({});
  const [savingCommission, setSavingCommission] = useState<Record<number, boolean>>({});

  // Drill-down detail dialogs
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [milkmanDetail, setMilkmanDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openCustomerDetails = async (userId: string) => {
    setDetailLoading(true);
    setCustomerDetail({});
    try {
      const res = await apiRequest(`/api/admin/customers/${userId}/details`, 'GET');
      setCustomerDetail(await res.json());
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not load customer", variant: "destructive" });
      setCustomerDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openMilkmanDetails = async (id: number) => {
    setDetailLoading(true);
    setMilkmanDetail({});
    try {
      const res = await apiRequest(`/api/admin/milkmen/${id}/details`, 'GET');
      setMilkmanDetail(await res.json());
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not load milkman", variant: "destructive" });
      setMilkmanDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, milkmenRes, ordersRes, paymentsRes] = await Promise.all([
        apiRequest('/api/admin/stats', 'GET'),
        apiRequest('/api/admin/users', 'GET'),
        apiRequest('/api/admin/milkmen', 'GET'),
        apiRequest('/api/admin/orders', 'GET'),
        apiRequest('/api/admin/payments', 'GET')
      ]);

      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setMilkmen(await milkmenRes.json());
      setOrders(await ordersRes.json());
      setPayments(await paymentsRes.json());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMilkmanVerification = async (milkmanId: number, verified: boolean) => {
    try {
      await apiRequest(`/api/admin/milkmen/${milkmanId}/verify`, 'PATCH', { verified });
      await fetchDashboardData();
      toast({
        title: "Success",
        description: `Milkman ${verified ? 'verified' : 'unverified'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const updateMilkmanCommission = async (milkmanId: number) => {
    const draft = commissionDrafts[milkmanId];
    const percentage = parseFloat(draft);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      toast({
        title: "Invalid percentage",
        description: "Enter a number between 0 and 100",
        variant: "destructive",
      });
      return;
    }
    setSavingCommission((s) => ({ ...s, [milkmanId]: true }));
    try {
      await apiRequest(`/api/admin/milkmen/${milkmanId}/commission`, 'PATCH', { percentage });
      await fetchDashboardData();
      setCommissionDrafts((d) => {
        const next = { ...d };
        delete next[milkmanId];
        return next;
      });
      toast({
        title: "Commission updated",
        description: `Set to ${percentage}% — earnings will be tracked from now on`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update commission",
        variant: "destructive",
      });
    } finally {
      setSavingCommission((s) => ({ ...s, [milkmanId]: false }));
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, 'PATCH', { status });
      await fetchDashboardData();
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const generateMonthlyBills = async () => {
    try {
      const response = await apiRequest('/api/admin/generate-monthly-bills', 'POST');
      const data = await response.json();
      toast({
        title: "Monthly Bills Generated",
        description: `Successfully generated ${data.bills.length} monthly bills for the previous month`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate monthly bills",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your DOOODHWALA platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeUsers || 0} active this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Milkmen</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMilkmen || 0}</div>
              <p className="text-xs text-muted-foreground">
                {milkmen.filter(m => m.verified).length} verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.dailyOrders || 0} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.totalRevenue || 0}</div>
              <p className="text-xs text-muted-foreground">
                ₹{stats?.weeklyRevenue || 0} this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="milkmen">Milkmen</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="billing">Monthly Bills</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* All Features Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Platform Features Overview</CardTitle>
                <CardDescription>Quick access to all admin features and functionalities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="users"]') as HTMLElement)?.click()}>
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h4 className="font-semibold text-sm">Users</h4>
                    <p className="text-xs text-gray-600">Manage customers</p>
                  </div>

                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="milkmen"]') as HTMLElement)?.click()}>
                    <Truck className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <h4 className="font-semibold text-sm">Milkmen</h4>
                    <p className="text-xs text-gray-600">Manage vendors</p>
                  </div>

                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="orders"]') as HTMLElement)?.click()}>
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h4 className="font-semibold text-sm">Orders</h4>
                    <p className="text-xs text-gray-600">Order management</p>
                  </div>

                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="payments"]') as HTMLElement)?.click()}>
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <h4 className="font-semibold text-sm">Payments</h4>
                    <p className="text-xs text-gray-600">Payment tracking</p>
                  </div>

                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="billing"]') as HTMLElement)?.click()}>
                    <Receipt className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                    <h4 className="font-semibold text-sm">Bills</h4>
                    <p className="text-xs text-gray-600">Monthly billing</p>
                  </div>

                  <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => (document.querySelector('[value="analytics"]') as HTMLElement)?.click()}>
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <h4 className="font-semibold text-sm">Analytics</h4>
                    <p className="text-xs text-gray-600">Data insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">New milkman registration: Fresh Dairy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Order #123 completed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">5 new customers registered today</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    System Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">2 payment failures require attention</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">5 milkmen pending verification</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span className="text-sm">System running normally</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow
                        key={user.id}
                        onClick={
                          user.userType === 'customer'
                            ? () => openCustomerDetails(user.id)
                            : user.userType === 'milkman' && user.milkmanId
                              ? () => openMilkmanDetails(user.milkmanId as number)
                              : undefined
                        }
                        className={
                          (user.userType === 'customer' || (user.userType === 'milkman' && user.milkmanId))
                            ? 'cursor-pointer hover:bg-muted/50'
                            : ''
                        }
                      >
                        <TableCell>
                          {user.name
                            || ([user.firstName, user.lastName].filter(Boolean).join(' '))
                            || 'N/A'}
                          {(user.userType === 'customer' || (user.userType === 'milkman' && user.milkmanId)) && (
                            <span className="ml-2 text-xs text-blue-600">(view)</span>
                          )}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {user.phone}
                        </TableCell>
                        <TableCell>
                          {user.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {user.email}
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.userType === 'admin' ? 'default' : 'secondary'}>
                            {user.userType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isVerified ? 'default' : 'destructive'}>
                            {user.isVerified ? 'Verified' : 'Unverified'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="milkmen">
            <Card>
              <CardHeader>
                <CardTitle>Milkmen Management</CardTitle>
                <CardDescription>Verify and manage milkmen accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Price/Liter</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milkmen.map((milkman) => (
                      <TableRow key={milkman.id}>
                        <TableCell className="font-medium">
                          <button
                            type="button"
                            onClick={() => openMilkmanDetails(milkman.id)}
                            className="text-blue-600 hover:underline text-left font-medium"
                          >
                            {milkman.businessName}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{milkman.contactName}</div>
                            <div className="text-sm text-gray-500">{milkman.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span className="text-sm">{milkman.address.substring(0, 30)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>₹{milkman.pricePerLiter}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            {milkman.rating} ({milkman.totalReviews})
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={milkman.verified ? 'default' : 'destructive'}>
                              {milkman.verified ? 'Verified' : 'Unverified'}
                            </Badge>
                            <Badge variant={milkman.isAvailable ? 'default' : 'secondary'}>
                              {milkman.isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.5"
                              placeholder={milkman.commissionPercentage ?? '—'}
                              value={commissionDrafts[milkman.id] ?? ''}
                              onChange={(e) =>
                                setCommissionDrafts((d) => ({ ...d, [milkman.id]: e.target.value }))
                              }
                              className="h-9 w-20"
                              data-testid={`commission-input-${milkman.id}`}
                            />
                            <span className="text-sm text-gray-500">%</span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !commissionDrafts[milkman.id] ||
                                !!savingCommission[milkman.id]
                              }
                              onClick={() => updateMilkmanCommission(milkman.id)}
                            >
                              {savingCommission[milkman.id] ? 'Saving…' : 'Set'}
                            </Button>
                          </div>
                          {milkman.commissionPercentage != null && (
                            <div className="text-xs text-gray-500 mt-1">
                              Currently {milkman.commissionPercentage}%
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={milkman.verified ? 'destructive' : 'default'}
                            onClick={() => updateMilkmanVerification(milkman.id, !milkman.verified)}
                          >
                            {milkman.verified ? 'Unverify' : 'Verify'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
                <CardDescription>Monitor and manage all orders</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Milkman</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.id}</TableCell>
                        <TableCell>Customer {order.customerId}</TableCell>
                        <TableCell>Milkman {order.milkmanId}</TableCell>
                        <TableCell>₹{order.totalAmount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === 'delivered' ? 'default' :
                                order.status === 'cancelled' ? 'destructive' :
                                  'secondary'
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>Monitor payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">#{payment.id}</TableCell>
                        <TableCell>#{payment.orderId}</TableCell>
                        <TableCell>₹{payment.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === 'completed' ? 'default' :
                                payment.status === 'failed' ? 'destructive' :
                                  'secondary'
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Monthly Billing Management
                </CardTitle>
                <CardDescription>Manage automatic monthly billing system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">Automatic Billing System</h3>
                    <p className="text-blue-600 text-sm mb-3">
                      Monthly bills are automatically generated on the 1st of each month for all customers with delivered orders from the previous month.
                    </p>
                    <Button
                      onClick={generateMonthlyBills}
                      className="flex items-center gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Generate Bills Manually (Test)
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Billing System Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium">Scheduler Active</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Monthly billing runs on 1st of every month
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">Next Run</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-500" />
                            <span className="font-medium">Last Run</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">How It Works</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">1</div>
                        <div>
                          <p className="font-medium">Order Collection</p>
                          <p className="text-sm text-gray-600">System collects all delivered orders from the previous month for each customer-milkman pair</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">2</div>
                        <div>
                          <p className="font-medium">Bill Generation</p>
                          <p className="text-sm text-gray-600">Creates consolidated monthly bills with total amounts and order details</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">3</div>
                        <div>
                          <p className="font-medium">Customer Notification</p>
                          <p className="text-sm text-gray-600">Customers receive chat notifications about their monthly bills with payment links</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Platform Analytics
                </CardTitle>
                <CardDescription>View detailed platform metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Growth Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Daily Active Users</span>
                        <span className="font-semibold">{stats?.activeUsers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Order Completion Rate</span>
                        <span className="font-semibold">94.5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer Retention</span>
                        <span className="font-semibold">78.2%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Revenue Metrics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Average Order Value</span>
                        <span className="font-semibold">₹{stats?.totalRevenue && stats?.totalOrders ? Math.round(stats.totalRevenue / stats.totalOrders) : 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Recurring Revenue</span>
                        <span className="font-semibold">₹{Math.round((stats?.weeklyRevenue || 0) * 4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Success Rate</span>
                        <span className="font-semibold">96.8%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Customer detail dialog */}
      <Dialog open={!!customerDetail} onOpenChange={(o) => !o && setCustomerDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>Assigned dairyman, address and order history.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : customerDetail?.customer ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{customerDetail.customer.name || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{customerDetail.customer.phone || 'N/A'}</span></div>
              <div className="flex justify-between gap-4"><span className="text-gray-500">Address</span><span className="font-medium text-right">{customerDetail.customer.address || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assigned Dairyman</span><span className="font-medium">{customerDetail.assignedMilkman ? `${customerDetail.assignedMilkman.businessName} (${customerDetail.assignedMilkman.contactName})` : 'None'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Orders Placed</span><span className="font-medium">{customerDetail.totalOrders}</span></div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No customer profile found.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Milkman detail dialog */}
      <Dialog open={!!milkmanDetail} onOpenChange={(o) => !o && setMilkmanDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dairyman Details</DialogTitle>
            <DialogDescription>Customers, groups, bank details and profile.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-gray-500">Loading…</div>
          ) : milkmanDetail?.milkman ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center"><div className="text-2xl font-bold">{milkmanDetail.totalCustomers}</div><div className="text-xs text-gray-500">Total Customers</div></div>
                <div className="rounded-lg border p-3 text-center"><div className="text-2xl font-bold">{milkmanDetail.totalGroups}</div><div className="text-xs text-gray-500">Household Groups</div></div>
              </div>

              <div>
                <div className="font-semibold mb-1">Profile</div>
                <div className="flex justify-between"><span className="text-gray-500">Business</span><span className="font-medium">{milkmanDetail.milkman.businessName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Contact</span><span className="font-medium">{milkmanDetail.milkman.contactName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{milkmanDetail.milkman.phone}</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Address</span><span className="font-medium text-right">{milkmanDetail.milkman.address}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Price / Litre</span><span className="font-medium">₹{milkmanDetail.milkman.pricePerLiter}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Delivery Time</span><span className="font-medium">{milkmanDetail.milkman.deliveryTimeStart} - {milkmanDetail.milkman.deliveryTimeEnd}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium">{milkmanDetail.milkman.commissionPercentage != null ? `${milkmanDetail.milkman.commissionPercentage}%` : '—'}</span></div>
              </div>

              <div>
                <div className="font-semibold mb-1">Bank Details (to send money)</div>
                <div className="flex justify-between"><span className="text-gray-500">Account Holder</span><span className="font-medium">{milkmanDetail.milkman.bankAccountHolderName || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Account No.</span><span className="font-medium">{milkmanDetail.milkman.bankAccountNumber || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IFSC</span><span className="font-medium">{milkmanDetail.milkman.bankIfscCode || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium">{milkmanDetail.milkman.bankName || '—'}{milkmanDetail.milkman.bankBranch ? `, ${milkmanDetail.milkman.bankBranch}` : ''}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">UPI ID</span><span className="font-medium">{milkmanDetail.milkman.upiId || '—'}</span></div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">No dairyman found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}