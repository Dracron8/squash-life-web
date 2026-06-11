import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly tell Turbopack the project root.
    // This stops it from walking up the filesystem and picking
    // /home/tb/package-lock.json (or the ai-playground one) as the workspace root.
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://lbffnhxwvkzogsywydcd.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiZmZuaHh3dmt6b2dzeXd5ZGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMTUwNzAsImV4cCI6MjA5MDU5MTA3MH0.-hoHsi0jUdz7dHjOylaRsrKUZBS2YWAbj0DmVOnae1o',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://squash-life-web.vercel.app',
  },
};

export default nextConfig;
