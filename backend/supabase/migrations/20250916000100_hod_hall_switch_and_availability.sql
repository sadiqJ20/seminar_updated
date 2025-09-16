-- Create notifications table for user-facing messages
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS: recipients can read their notifications
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Recipients can read their notifications'
  ) THEN
    CREATE POLICY "Recipients can read their notifications"
    ON public.notifications
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = notifications.recipient_profile_id AND p.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Prevent inserts/updates/deletes from clients; only via server-side functions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Only service functions can write notifications'
  ) THEN
    CREATE POLICY "Only service functions can write notifications"
    ON public.notifications
    FOR ALL
    USING (false)
    WITH CHECK (false);
  END IF;
END $$;

-- Helper: check overlap between two time ranges
-- We rely on existing trigger check_hall_availability for integrity on bookings

-- RPC to get available halls for a given date/time window
CREATE OR REPLACE FUNCTION public.get_available_halls(
  p_event_date DATE,
  p_start TIME,
  p_end TIME
)
RETURNS SETOF public.halls
LANGUAGE sql
STABLE
AS $$
  SELECT h.*
  FROM public.halls h
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.hall_id = h.id
      AND b.event_date = p_event_date
      AND b.status <> 'rejected'
      AND (
        (p_start >= b.start_time AND p_start < b.end_time) OR
        (p_end > b.start_time AND p_end <= b.end_time) OR
        (p_start <= b.start_time AND p_end >= b.end_time)
      )
  )
  ORDER BY h.block, h.name;
$$;

-- RPC to switch a booking's hall atomically and notify the faculty
CREATE OR REPLACE FUNCTION public.switch_booking_hall(
  p_booking_id UUID,
  p_new_hall_id UUID,
  p_new_start TIME DEFAULT NULL,
  p_new_end TIME DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  old_hall_id UUID,
  new_hall_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _booking public.bookings;
  _has_conflict BOOLEAN;
  _faculty_id UUID;
  _old_hall UUID;
BEGIN
  -- Authorize: only HOD of the booking's department can perform this
  PERFORM 1 FROM public.profiles pr
  JOIN public.bookings bk ON bk.id = p_booking_id
  WHERE pr.user_id = auth.uid()
    AND pr.role = 'hod'
    AND pr.department = bk.department;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized to switch hall for this booking';
  END IF;

  -- Lock the booking row to avoid concurrent switches
  SELECT * INTO _booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Ensure the new hall exists
  PERFORM 1 FROM public.halls WHERE id = p_new_hall_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'New hall not found';
  END IF;

  -- Decide time window (allow override)
  IF p_new_start IS NULL THEN p_new_start := _booking.start_time; END IF;
  IF p_new_end IS NULL THEN p_new_end := _booking.end_time; END IF;

  -- Check that the new hall has no overlapping bookings for the new window
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.hall_id = p_new_hall_id
      AND b.event_date = _booking.event_date
      AND b.status <> 'rejected'
      AND b.id <> _booking.id
      AND (
        (p_new_start >= b.start_time AND p_new_start < b.end_time) OR
        (p_new_end > b.start_time AND p_new_end <= b.end_time) OR
        (p_new_start <= b.start_time AND p_new_end >= b.end_time)
      )
  ) INTO _has_conflict;

  IF _has_conflict THEN
    RAISE EXCEPTION 'Selected hall is not available for the booking timeframe';
  END IF;

  -- Perform the switch and send back to Principal for approval
  _old_hall := _booking.hall_id;
  UPDATE public.bookings
  SET hall_id = p_new_hall_id,
      start_time = p_new_start,
      end_time = p_new_end,
      status = 'pending_principal',
      updated_at = now()
  WHERE id = _booking.id;

  -- Notify the booking owner (faculty profile)
  _faculty_id := _booking.faculty_id;
  INSERT INTO public.notifications (recipient_profile_id, message)
  VALUES (
    _faculty_id,
    format('Your booking "%s" on %s was moved to a new hall and time by HOD.', _booking.event_name, _booking.event_date::text)
  );

  RETURN QUERY SELECT _booking.id, _old_hall, p_new_hall_id;
END;
$$;

-- Grant execute on RPCs to authenticated users (RLS inside enforces role)
GRANT EXECUTE ON FUNCTION public.get_available_halls(DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_booking_hall(UUID, UUID) TO authenticated;

-- Realtime on notifications (optional)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


