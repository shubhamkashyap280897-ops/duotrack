# DuoTrack ⚡ - Daily Activity & Habit Tracker for Friends

A modern, real-time shared habit tracker designed for two friends to hold each other accountable daily, with Ref Ellie the Referee 🐘🏁!

## 🔗 Live Shareable Link

👉 **[https://figured-also-prime-relying.trycloudflare.com](https://figured-also-prime-relying.trycloudflare.com)**

---

## ⚡ Keeping the App Online 24/7

### Why it disconnects when you close the laptop:
When a laptop lid is closed, Windows goes into **Sleep Mode**, which cuts Wi-Fi and pauses the background server.

### Solutions:

#### 1. Permanent 24/7 Free Cloud Hosting (Recommended)
Deploy the server and frontend to a free cloud host like **Render.com** or **Railway.app**:
- Stays online 24/7 without needing your laptop powered on.
- Both friends can access the same permanent URL anytime from their phones.

#### 2. Keep Laptop Running with Lid Closed (Windows Setting)
If you want to keep the laptop running while closed:
1. Press `Win + R`, type `control powercfg.cpl`, and press Enter.
2. In the left sidebar, click **"Choose what closing the lid does"**.
3. Under **"When I close the lid"**, change **"Plugged in"** to **"Do nothing"**.
4. Click **Save changes**. Now you can close the laptop lid and DuoTrack will stay running!

#### 3. One-Click Restart
Whenever your laptop restarts or wakes up, simply double-click:
- [`share_online.bat`](open_tracker.bat) to launch the online server with a fresh link.
