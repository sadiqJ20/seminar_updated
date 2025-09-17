-- Remove unused student_years column from bookings
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'student_years'
  ) THEN
    ALTER TABLE public.bookings DROP COLUMN student_years;
  END IF;
END $$;



