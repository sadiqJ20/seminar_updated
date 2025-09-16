import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface HallSwitchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any | null;
  onConfirm: (newHallId: string, newStart: string, newEnd: string) => Promise<void> | void;
}

const HallSwitchModal = ({ open, onOpenChange, booking, onConfirm }: HallSwitchModalProps) => {
  const [availableHalls, setAvailableHalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHallId, setSelectedHallId] = useState("");
  const [newStart, setNewStart] = useState<string>("");
  const [newEnd, setNewEnd] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      if (!booking) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_available_halls', {
          p_event_date: booking.event_date,
          p_start: (newStart || booking.start_time),
          p_end: (newEnd || booking.end_time),
        });
        if (error) throw error;
        setAvailableHalls((data || []).filter((h: any) => h.id !== booking.hall_id));
      } catch (e) {
        setAvailableHalls([]);
      } finally {
        setLoading(false);
      }
    };
    if (open) {
      // initialize times from booking when opening
      if (booking) {
        setNewStart(booking.start_time);
        setNewEnd(booking.end_time);
      }
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking]);

  useEffect(() => {
    const refresh = async () => {
      if (!booking || !open) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_available_halls', {
          p_event_date: booking.event_date,
          p_start: newStart,
          p_end: newEnd,
        });
        if (error) throw error;
        setAvailableHalls((data || []).filter((h: any) => h.id !== booking.hall_id));
      } catch (e) {
        setAvailableHalls([]);
      } finally {
        setLoading(false);
      }
    };
    if (open && newStart && newEnd) refresh();
  }, [newStart, newEnd, open, booking]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Hall</DialogTitle>
        </DialogHeader>
        {booking ? (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Booking: <span className="font-medium text-foreground">{booking.event_name}</span> on {booking.event_date} ({booking.start_time} - {booking.end_time})
            </div>
            <div>
              <Select value={selectedHallId} onValueChange={setSelectedHallId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading..." : "Select a new hall"} />
                </SelectTrigger>
                <SelectContent>
                  {availableHalls.map((h: any) => (
                    <SelectItem key={h.id} value={h.id}>{h.name} • {h.block} • Capacity: {h.capacity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">New Start Time</label>
                <input type="time" className="border rounded-md w-full h-9 px-3"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">New End Time</label>
                <input type="time" className="border rounded-md w-full h-9 px-3"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(selectedHallId, newStart, newEnd)} disabled={!selectedHallId || !newStart || !newEnd || loading}>Confirm Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HallSwitchModal;


