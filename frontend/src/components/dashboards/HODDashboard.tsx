import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LogOut, UserCheck, Bell, BellRing, Building2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BookingCard from "@/components/BookingCard";
import HallSwitchModal from "@/components/HallSwitchModal";
import { useToast } from "@/hooks/use-toast";

const HODDashboard = () => {
  const { profile, signOut } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [halls, setHalls] = useState<any[]>([]);
  const [hallsLoading, setHallsLoading] = useState(true);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [bookingToSwitch, setBookingToSwitch] = useState<any | null>(null);
  const [availableHallsForSwitch, setAvailableHallsForSwitch] = useState<any[]>([]);
  const [selectedNewHallId, setSelectedNewHallId] = useState<string>("");
  const [switching, setSwitching] = useState(false);
  const { toast } = useToast();

  const fetchBookings = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          halls:hall_id (
            name,
            block,
            type,
            capacity
          )
        `)
        .eq('department', profile.department)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHalls = async () => {
    setHallsLoading(true);
    try {
      const { data, error } = await supabase
        .from('halls')
        .select('*')
        .order('block', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      setHalls(data || []);
    } catch (error) {
      console.error('Error fetching halls:', error);
    } finally {
      setHallsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchHalls();
  }, [profile]);

  const pendingBookings = bookings.filter(b => b.status === 'pending_hod');
  const acceptedBookings = bookings.filter(b => ['pending_principal', 'pending_pro', 'approved'].includes(b.status));
  const rejectedBookings = bookings.filter(b => b.status === 'rejected');

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const currentlyBooked = useMemo(() => {
    return bookings
      .filter(b => b.event_date === todayISO && b.status !== 'rejected')
      .filter(b => {
        const currentTime = now.toTimeString().slice(0, 8);
        return (currentTime >= b.start_time && currentTime < b.end_time);
      });
  }, [bookings]);

  const currentlyBookedHallIds = new Set(currentlyBooked.map(b => b.hall_id));

  const currentlyAvailableHalls = useMemo(() => {
    return halls.filter(h => !currentlyBookedHallIds.has(h.id));
  }, [halls, currentlyBookedHallIds]);

  const openSwitchDialog = async (booking: any) => {
    setBookingToSwitch(booking);
    setSelectedNewHallId("");
    setSwitchDialogOpen(true);
  };

  const confirmSwitch = async (newHallId: string, newStart: string, newEnd: string) => {
    if (!bookingToSwitch || !newHallId) return;
    setSwitching(true);
    try {
      const { error } = await supabase.rpc('switch_booking_hall', {
        p_booking_id: bookingToSwitch.id,
        p_new_hall_id: newHallId,
        p_new_start: newStart,
        p_new_end: newEnd,
      });
      if (error) throw error;
      toast({ title: 'Hall switched', description: 'The booking hall and timing have been updated.' });
      setSwitchDialogOpen(false);
      setBookingToSwitch(null);
      await Promise.all([fetchBookings(), fetchHalls()]);
    } catch (err: any) {
      toast({ title: 'Switch failed', description: err?.message || 'Unable to switch hall', variant: 'destructive' });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">HOD Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name} • {profile?.department} Department</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="relative">
              {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button variant="outline" onClick={signOut} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold">{pendingBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-bold">{acceptedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold">{rejectedBookings.length}</p>
                </div>
                <div className="h-8 w-8 bg-red-500/10 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Department Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="relative">
                  Pending
                  {pendingBookings.length > 0 && (
                    <Badge className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {pendingBookings.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted">Accepted</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pending" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : pendingBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onStatusUpdate={fetchBookings}
                        showActions={true}
                        userRole="hod"
                        onRequestSwitchHall={(b) => openSwitchDialog(b)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="accepted" className="mt-6">
                {acceptedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No accepted requests</p>
                ) : (
                  <div className="space-y-4">
                    {acceptedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} userRole="hod" onRequestSwitchHall={(b) => openSwitchDialog(b)} />
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="rejected" className="mt-6">
                {rejectedBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No rejected requests</p>
                ) : (
                  <div className="space-y-4">
                    {rejectedBookings.map(booking => (
                      <BookingCard key={booking.id} booking={booking} userRole="hod" />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Halls Snapshot (Now)
              <Button variant="ghost" size="icon" className="ml-auto" onClick={() => { fetchBookings(); fetchHalls(); }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="available" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="available">Available Halls</TabsTrigger>
                <TabsTrigger value="booked">Booked Halls</TabsTrigger>
              </TabsList>

              <TabsContent value="available" className="mt-6">
                {hallsLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading halls...</p>
                ) : currentlyAvailableHalls.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No halls available right now</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentlyAvailableHalls.map(h => (
                      <Card key={h.id}>
                        <CardContent className="p-4">
                          <div className="font-medium">{h.name}</div>
                          <div className="text-sm text-muted-foreground">{h.block} • {h.type} • {h.capacity} seats</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="booked" className="mt-6">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading bookings...</p>
                ) : currentlyBooked.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No halls are booked right now</p>
                ) : (
                  <div className="space-y-4">
                    {currentlyBooked.map(b => (
                      <div key={b.id} className="flex items-center justify-between border rounded-md p-4">
                        <div>
                          <div className="font-medium">{b.halls?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {b.event_name} • {b.organizer_name} • {b.start_time} - {b.end_time}
                          </div>
                        </div>
                        <Button variant="secondary" onClick={() => openSwitchDialog(b)}>Switch Hall</Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <HallSwitchModal
        open={switchDialogOpen}
        onOpenChange={setSwitchDialogOpen}
        booking={bookingToSwitch}
        onConfirm={confirmSwitch}
      />
    </div>
  );
};

export default HODDashboard;