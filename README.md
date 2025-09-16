## Seminar Hall Booking System

A modern web application to manage seminar hall reservations with a multi-level approval workflow tailored for college events.

### Features
- Booking requests with date, time, and hall details
- Role-based dashboards for Faculty, HOD, PRO, and Principal
- Approval workflow with status tracking and comments
- Notifications for approvals and rejections
- Analytics and charts for utilization insights
- Responsive UI built with shadcn-ui and Tailwind

### Tech Stack
- React + TypeScript
- Vite
- shadcn-ui + Tailwind CSS
- Supabase (Auth, DB)
- React Router, React Query

### Try Demo
Link : https://seminar-hall-booking-system-fa05qi0ko-surya-git07s-projects.vercel.app


### Getting Started
1. Clone the repository
   ```sh
   git clone <YOUR_GIT_URL>
   cd hall-flow-hub
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Configure environment
   - Create a `.env` file with your Supabase keys if required by `src/integrations/supabase/client.ts`.
4. Run the development server
   ```sh
   npm run dev
   ```
5. Build for production
   ```sh
   npm run build
   npm run preview
   ```

### Author
[SADIQ J]
